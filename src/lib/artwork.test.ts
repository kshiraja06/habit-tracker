import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ARTWORK_SETTINGS,
  generateWeeklyArtwork,
  type ArtworkHabitInput,
} from "./artwork";

const weakWeek: ArtworkHabitInput[] = [
  { id: "move", color: "#e89070", scores: [20, 20, 20, 20, 20, 20, 20] },
  { id: "read", color: "#6d9bb5", scores: [20, 20, 20, 20, 20, 20, 20] },
  { id: "rest", color: "#8da986", scores: [20, 20, 20, 20, 20, 20, 20] },
];

test("no logged scores produce no artwork", () => {
  assert.equal(
    generateWeeklyArtwork(
      [{ id: "empty", color: "#123456", scores: [null, null, null, null, null, null, null] }],
      "final",
    ),
    null,
  );
});

test("a weak week creates intentional, pale blobs instead of disappearing", () => {
  const artwork = generateWeeklyArtwork(weakWeek, "final");
  assert.ok(artwork);
  assert.equal(artwork.hasData, true);
  assert.equal(artwork.cells.length, DEFAULT_ARTWORK_SETTINGS.columns * DEFAULT_ARTWORK_SETTINGS.rows);
  assert.ok(artwork.cells.every((cell) => cell.radiusX > 0 && cell.radiusY > 0));
  assert.ok(artwork.cells.every((cell) => cell.blobPath.startsWith("M ") && cell.blobPath.endsWith(" Z")));
  assert.ok(artwork.cells.every((cell) => cell.color !== "#fff8e9"));
  assert.ok(artwork.cells.every((cell) => cell.opacity >= 0.58 && cell.opacity <= 1));
});

test("strong weeks use larger, fuller, more saturated blobs than weak weeks", () => {
  const strong = weakWeek.map((habit) => ({ ...habit, scores: [100, 100, 100, 100, 100, 100, 100] }));
  const weakArt = generateWeeklyArtwork(weakWeek, "final");
  const strongArt = generateWeeklyArtwork(strong, "final");
  assert.ok(weakArt && strongArt);
  assert.ok(strongArt.cells[0].radiusX > weakArt.cells[0].radiusX);
  assert.ok(strongArt.cells[0].fullness > weakArt.cells[0].fullness);
  assert.ok(strongArt.cells[0].color !== weakArt.cells[0].color);
});

test("a single habit generates valid artwork", () => {
  const artwork = generateWeeklyArtwork(
    [{ id: "solo", color: "#d16d47", scores: [20, 40, 60, 80, 100, null, null] }],
    "final",
  );
  assert.ok(artwork);
  assert.equal(artwork.cells.length, 192);
  assert.ok(artwork.cells.every((cell) => /^#[\da-f]{6}$/i.test(cell.color)));
});

test("blending supports loud colors and both adjustable methods", () => {
  const loud: ArtworkHabitInput[] = [
    { id: "red", color: "#ff0000", scores: [100, 100, 100, 100, 100, 100, 100] },
    { id: "cyan", color: "#00eaff", scores: [100, 100, 100, 100, 100, 100, 100] },
    { id: "yellow", color: "#f7ff00", scores: [100, 100, 100, 100, 100, 100, 100] },
  ];
  const linear = generateWeeklyArtwork(loud, "final", {
    ...DEFAULT_ARTWORK_SETTINGS,
    grainStrength: 0.1,
    blendMethod: "linear_rgb",
  });
  const hsl = generateWeeklyArtwork(loud, "final", {
    ...DEFAULT_ARTWORK_SETTINGS,
    grainStrength: 0,
    blendMethod: "hsl",
  });
  assert.ok(linear && hsl);
  assert.notEqual(linear.cells[0].color, hsl.cells[0].color);
  assert.equal(linear.grainStrength, 0.1);
  assert.equal(hsl.grainStrength, 0);
});

test("habit colors contribute in proportion to their total weekly scores", () => {
  const artwork = generateWeeklyArtwork(
    [
      { id: "frequent", color: "#ff0000", scores: [100, 100, 100, 100, 100, 100, 100] },
      { id: "occasional", color: "#0000ff", scores: [100, null, null, null, null, null, null] },
    ],
    "final",
  );
  assert.ok(artwork);
  const channels = artwork.cells[0].color.match(/[a-f\d]{2}/gi);
  assert.ok(channels);
  const [red, , blue] = channels.map((channel) => Number.parseInt(channel, 16));
  assert.ok(red > blue);
});

test("preview is visibly unfinished and deterministic without changing the final", () => {
  const preview = generateWeeklyArtwork(weakWeek, "preview");
  const finalA = generateWeeklyArtwork(weakWeek, "final");
  const finalB = generateWeeklyArtwork(weakWeek, "final");
  assert.ok(preview && finalA && finalB);
  const visiblePreviewCells = preview.cells.filter((cell) => cell.previewVisible).length;
  assert.ok(visiblePreviewCells < preview.cells.length / 2);
  assert.ok(visiblePreviewCells > preview.cells.length / 3);
  assert.deepEqual(finalA, finalB);
  assert.deepEqual(
    preview.cells.map(({ color, radiusX, fullness }) => ({ color, radiusX, fullness })),
    finalA.cells.map(({ color, radiusX, fullness }) => ({ color, radiusX, fullness })),
  );
});

test("rejects malformed scores, color values, and grain settings", () => {
  assert.throws(
    () => generateWeeklyArtwork([{ id: "bad", color: "#fff", scores: [101, null, null, null, null, null, null] }], "final"),
    RangeError,
  );
  assert.throws(
    () => generateWeeklyArtwork([{ id: "bad", color: "red", scores: [20, 20, 20, 20, 20, 20, 20] }], "final"),
    RangeError,
  );
  assert.throws(
    () => generateWeeklyArtwork(weakWeek, "final", { ...DEFAULT_ARTWORK_SETTINGS, grainStrength: 0.4 }),
    RangeError,
  );
  assert.throws(
    () => generateWeeklyArtwork([...weakWeek, ...weakWeek], "final"),
    RangeError,
  );
});
