export type ArtworkBlendMethod = "linear_rgb" | "hsl";
export type ArtworkState = "preview" | "final";

export interface ArtworkHabitInput {
  id: string;
  color: string;
  scores: readonly (number | null)[];
}

export interface ArtworkSettings {
  columns: number;
  rows: number;
  grainStrength: number;
  blendMethod: ArtworkBlendMethod;
}

export interface ArtworkCell {
  id: string;
  blobPath: string;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  score: number;
  fullness: number;
  opacity: number;
  color: string;
  highlight: string;
  previewVisible: boolean;
}

export interface WeeklyArtwork {
  width: number;
  height: number;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  grainStrength: number;
  state: ArtworkState;
  hasData: boolean;
  cells: readonly ArtworkCell[];
}

export const DEFAULT_ARTWORK_SETTINGS: ArtworkSettings = {
  columns: 16,
  rows: 12,
  grainStrength: 0.055,
  blendMethod: "hsl",
};

const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
const PAPER_COLOR = "#fff8e9";

function assertSettings(settings: ArtworkSettings): void {
  if (
    !Number.isInteger(settings.columns) ||
    settings.columns < 2 ||
    settings.columns > 40 ||
    !Number.isInteger(settings.rows) ||
    settings.rows < 2 ||
    settings.rows > 40
  ) {
    throw new RangeError("Artwork grid dimensions must be integers from 2 to 40.");
  }
  if (!Number.isFinite(settings.grainStrength) || settings.grainStrength < 0 || settings.grainStrength > 0.2) {
    throw new RangeError("Grain strength must be between 0 and 0.2.");
  }
  if (settings.blendMethod !== "linear_rgb" && settings.blendMethod !== "hsl") {
    throw new RangeError("Unsupported artwork color-blending method.");
  }
}

function parseHex(color: string): readonly [number, number, number] {
  if (!HEX_COLOR.test(color)) {
    throw new RangeError(`Invalid habit color: ${color}`);
  }
  const raw = color.slice(1);
  const expanded = raw.length === 3 ? [...raw].map((digit) => digit + digit).join("") : raw;
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

function toHex([red, green, blue]: readonly number[]): string {
  return `#${[red, green, blue]
    .map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function linearize(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function delinearize(channel: number): number {
  const value = channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
  return value * 255;
}

function rgbToHsl([red, green, blue]: readonly number[]): [number, number, number] {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  const delta = maximum - minimum;
  let hue = 0;
  const lightness = (maximum + minimum) / 2;
  let saturation = 0;
  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    switch (maximum) {
      case r:
        hue = ((g - b) / delta) % 6;
        break;
      case g:
        hue = (b - r) / delta + 2;
        break;
      default:
        hue = (r - g) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return [hue, saturation, lightness];
}

function hslToRgb([hue, saturation, lightness]: readonly number[]): [number, number, number] {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = hue / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  const [red, green, blue] =
    section < 1 ? [chroma, x, 0] :
      section < 2 ? [x, chroma, 0] :
        section < 3 ? [0, chroma, x] :
          section < 4 ? [0, x, chroma] :
            section < 5 ? [x, 0, chroma] : [chroma, 0, x];
  const offset = lightness - chroma / 2;
  return [(red + offset) * 255, (green + offset) * 255, (blue + offset) * 255];
}

function boostSaturation(color: string, factor: number): string {
  const [hue, saturation, lightness] = rgbToHsl(parseHex(color));
  return toHex(hslToRgb([hue, Math.min(1, saturation * factor), lightness]));
}

function blendColors(
  colors: readonly string[],
  weights: readonly number[],
  method: ArtworkBlendMethod,
): string {
  const parsed = colors.map(parseHex);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight === 0) return PAPER_COLOR;

  if (method === "linear_rgb") {
    return toHex(
      [0, 1, 2].map((channel) =>
        delinearize(
          parsed.reduce(
            (sum, color, index) => sum + linearize(color[channel]) * weights[index],
            0,
          ) / totalWeight,
        ),
      ),
    );
  }

  const hsl = parsed.map(rgbToHsl);
  const hueX = hsl.reduce(
    (sum, color, index) => sum + Math.cos((color[0] * Math.PI) / 180) * weights[index],
    0,
  );
  const hueY = hsl.reduce(
    (sum, color, index) => sum + Math.sin((color[0] * Math.PI) / 180) * weights[index],
    0,
  );
  const dominantHueIndex = weights.indexOf(Math.max(...weights));
  const hue = Math.hypot(hueX, hueY) < totalWeight * 1e-8
    ? hsl[dominantHueIndex][0]
    : ((Math.atan2(hueY, hueX) * 180) / Math.PI + 360) % 360;
  const saturation = hsl.reduce((sum, color, index) => sum + color[1] * weights[index], 0) / totalWeight;
  const lightness = hsl.reduce((sum, color, index) => sum + color[2] * weights[index], 0) / totalWeight;
  return toHex(hslToRgb([hue, saturation, lightness]));
}

function lighten(color: string, amount: number): string {
  const rgb = parseHex(color);
  return toHex(rgb.map((channel) => channel + (255 - channel) * amount));
}

function hashUnit(value: number): number {
  let x = value | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x ^= x >>> 16;
  return (x >>> 0) / 0xffffffff;
}

function cellSeed(column: number, row: number): number {
  return Math.imul(column + 1, 73856093) ^ Math.imul(row + 1, 19349663);
}

function blobPath(
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  seed: number,
): string {
  const points = Array.from({ length: 8 }, (_, index) => {
    const angle = (index / 8) * Math.PI * 2;
    const radius = 0.86 + hashUnit(seed + index * 991) * 0.28;
    return {
      x: x + Math.cos(angle) * radiusX * radius,
      y: y + Math.sin(angle) * radiusY * radius,
    };
  });
  const midpoint = (first: { x: number; y: number }, second: { x: number; y: number }) => ({
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  });
  const start = midpoint(points[points.length - 1], points[0]);
  const segments = points.map((point, index) => {
    const end = midpoint(point, points[(index + 1) % points.length]);
    return `Q ${point.x.toFixed(2)} ${point.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  });
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} ${segments.join(" ")} Z`;
}

export function generateWeeklyArtwork(
  habits: readonly ArtworkHabitInput[],
  state: ArtworkState,
  settings: ArtworkSettings = DEFAULT_ARTWORK_SETTINGS,
): WeeklyArtwork | null {
  assertSettings(settings);
  if (state !== "preview" && state !== "final") {
    throw new RangeError("Artwork state must be preview or final.");
  }
  if (habits.length > 5) {
    throw new RangeError("Weekly artwork supports at most five habits.");
  }

  for (const habit of habits) {
    parseHex(habit.color);
    if (habit.scores.length !== 7) {
      throw new RangeError(`Habit "${habit.id}" must have exactly seven daily scores.`);
    }
    for (const score of habit.scores) {
      if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) {
        throw new RangeError(`Habit "${habit.id}" scores must be between 0 and 100.`);
      }
    }
  }

  const data = habits.flatMap((habit) =>
    habit.scores
      .filter((score): score is number => score !== null)
      .map((score) => ({ habit, score })),
  );
  if (data.length === 0) return null;

  const width = 640;
  const height = 480;
  const cellWidth = width / settings.columns;
  const cellHeight = height / settings.rows;
  const colors = habits.map((habit) => habit.color);
  const scoreTotals = habits.map((habit) =>
    habit.scores.reduce<number>((sum, score) => sum + (score ?? 0), 0),
  );

  const cells = Array.from({ length: settings.columns * settings.rows }, (_, index) => {
    const column = index % settings.columns;
    const row = Math.floor(index / settings.columns);
    const seed = cellSeed(column, row);
    const variation = 0.88 + hashUnit(seed + 11) * 0.24;
    const score = Math.min(
      100,
      Math.max(0, (data.reduce((sum, entry) => sum + entry.score, 0) / data.length) * variation),
    );
    const colorWeights = scoreTotals.map(
      (habitScore, habitIndex) => habitScore * (0.65 + hashUnit(seed + (habitIndex + 1) * 31337) * 0.7),
    );
    const mixedColor = blendColors(colors, colorWeights, settings.blendMethod);
    const blendedColor =
      settings.blendMethod === "linear_rgb"
        ? boostSaturation(mixedColor, 0.65 + (score / 100) * 1.35)
        : mixedColor;
    const intensity = 0.3 + (score / 100) * 0.7;
    const visible = hashUnit(seed + 779) < 0.39 + (hashUnit(seed + 177) * 0.07);
    const x = (column + 0.5) * cellWidth;
    const y = (row + 0.5) * cellHeight;
    const radiusX = cellWidth * (0.17 + (score / 100) * 0.2);
    const radiusY = cellHeight * (0.17 + (score / 100) * 0.2);

    return {
      id: `${column}-${row}`,
      x,
      y,
      radiusX,
      radiusY,
      blobPath: blobPath(x, y, radiusX, radiusY, seed),
      score,
      fullness: 0.2 + (score / 100) * 0.8,
      opacity: 0.58 + (score / 100) * 0.42,
      color: lighten(blendedColor, 1 - intensity),
      highlight: lighten(blendedColor, 0.72 - (score / 100) * 0.45),
      previewVisible: visible,
    };
  });

  return {
    width,
    height,
    columns: settings.columns,
    rows: settings.rows,
    cellWidth,
    cellHeight,
    grainStrength: settings.grainStrength,
    state,
    hasData: true,
    cells,
  };
}
