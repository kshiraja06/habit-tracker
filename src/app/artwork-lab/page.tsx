"use client";

import { useMemo, useState } from "react";
import { ArtworkPreview } from "@/components/artwork-preview";
import {
  DEFAULT_ARTWORK_SETTINGS,
  generateWeeklyArtwork,
  type ArtworkBlendMethod,
  type ArtworkHabitInput,
} from "@/lib/artwork";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const SCENARIOS: readonly { label: string; habits: readonly ArtworkHabitInput[] }[] = [
  {
    label: "Weak week · rating 1s",
    habits: [
      { id: "move", color: "#e89070", scores: [20, 20, 20, 20, 20, 20, 20] },
      { id: "read", color: "#6d9bb5", scores: [20, 20, 20, 20, 20, 20, 20] },
      { id: "rest", color: "#8da986", scores: [20, 20, 20, 20, 20, 20, 20] },
    ],
  },
  {
    label: "Strong week",
    habits: [
      { id: "move", color: "#e89070", scores: [100, 100, 100, 100, 100, 100, 100] },
      { id: "read", color: "#6d9bb5", scores: [100, 80, 100, 100, 80, 100, 100] },
      { id: "rest", color: "#8da986", scores: [100, 100, 80, 100, 100, 100, 100] },
    ],
  },
  {
    label: "One habit only",
    habits: [{ id: "move", color: "#d16d47", scores: [20, 40, 60, 80, 100, null, null] }],
  },
  {
    label: "Loud, clashing colours",
    habits: [
      { id: "move", color: "#ff0000", scores: [100, 80, 100, 70, 100, 80, 100] },
      { id: "read", color: "#00eaff", scores: [90, 100, 70, 100, 80, 100, 90] },
      { id: "rest", color: "#f7ff00", scores: [80, 90, 100, 80, 100, 90, 100] },
    ],
  },
];

export default function ArtworkLabPage() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [habits, setHabits] = useState<ArtworkHabitInput[]>(() =>
    SCENARIOS[0].habits.map((habit) => ({ ...habit, scores: [...habit.scores] })),
  );
  const [grainStrength, setGrainStrength] = useState(DEFAULT_ARTWORK_SETTINGS.grainStrength);
  const [blendMethod, setBlendMethod] = useState<ArtworkBlendMethod>(DEFAULT_ARTWORK_SETTINGS.blendMethod);

  const settings = useMemo(
    () => ({ ...DEFAULT_ARTWORK_SETTINGS, grainStrength, blendMethod }),
    [blendMethod, grainStrength],
  );
  const preview = useMemo(
    () => generateWeeklyArtwork(habits, "preview", settings),
    [habits, settings],
  );
  const finalArtwork = useMemo(
    () => generateWeeklyArtwork(habits, "final", settings),
    [habits, settings],
  );

  function chooseScenario(index: number) {
    setScenarioIndex(index);
    setHabits(SCENARIOS[index].habits.map((habit) => ({ ...habit, scores: [...habit.scores] })));
  }

  function updateHabit(index: number, patch: Partial<ArtworkHabitInput>) {
    setHabits((current) =>
      current.map((habit, habitIndex) => habitIndex === index ? { ...habit, ...patch } : habit),
    );
    setScenarioIndex(-1);
  }

  function updateScore(habitIndex: number, dayIndex: number, value: string) {
    const scores = [...habits[habitIndex].scores];
    scores[dayIndex] = value === "" ? null : Number(value);
    updateHabit(habitIndex, { scores });
  }

  return (
    <main className="lab-shell">
      <header className="lab-header">
        <p className="eyebrow">A small study in keeping promises</p>
        <h1>One week, in colour</h1>
        <p className="intro">
          Artwork generator lab · isolated from the app. Change the scores, colours, blend, or paper grain.
        </p>
      </header>

      <section aria-labelledby="scenario-heading" className="controls-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Try a week</p>
            <h2 id="scenario-heading">Starting points</h2>
          </div>
          <span className="mono-label">{habits.length} {habits.length === 1 ? "habit" : "habits"}</span>
        </div>
        <div className="scenario-list">
          {SCENARIOS.map((scenario, index) => (
            <button
              aria-pressed={scenarioIndex === index}
              className="scenario-button"
              key={scenario.label}
              onClick={() => chooseScenario(index)}
              type="button"
            >
              {scenario.label}
            </button>
          ))}
        </div>

        <div className="habit-list">
          {habits.map((habit, habitIndex) => (
            <fieldset className="habit-fields" key={habit.id}>
              <legend>Habit {habitIndex + 1}</legend>
              <label className="color-control">
                <span>Colour</span>
                <input
                  aria-label={`Habit ${habitIndex + 1} colour`}
                  onChange={(event) => updateHabit(habitIndex, { color: event.target.value })}
                  type="color"
                  value={habit.color}
                />
              </label>
              <div className="score-controls">
                {DAYS.map((day, dayIndex) => (
                  <label className="score-control" key={day}>
                    <span>{day}</span>
                    <input
                      aria-label={`Habit ${habitIndex + 1}, ${day} score`}
                      max="100"
                      min="0"
                      onChange={(event) => updateScore(habitIndex, dayIndex, event.target.value)}
                      placeholder="—"
                      step="10"
                      type="number"
                      value={habit.scores[dayIndex] ?? ""}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="setting-controls">
          <label className="setting-control">
            <span>Colour blending</span>
            <select
              onChange={(event) => setBlendMethod(event.target.value as ArtworkBlendMethod)}
              value={blendMethod}
            >
              <option value="linear_rgb">Weighted linear-light RGB</option>
              <option value="hsl">Weighted HSL hue</option>
            </select>
          </label>
          <label className="setting-control grain-control">
            <span>Paper grain <output>{(grainStrength * 100).toFixed(1)}%</output></span>
            <input
              max="0.2"
              min="0"
              onChange={(event) => setGrainStrength(Number(event.target.value))}
              step="0.005"
              type="range"
              value={grainStrength}
            />
          </label>
        </div>
        <p className="settings-note">
          Default: weighted HSL blends hue around the colour wheel, so a strong week stays vivid
          instead of averaging toward grey. Linear-light RGB is available for softer, more muted
          mixes. Grain starts at 5.5% so it reads as paper, not noise. Both are adjustable here,
          not product decisions.
        </p>
      </section>

      <section aria-label="Artwork comparison" className="artwork-comparison">
        <ArtworkPreview artwork={preview} state="preview" title="In progress" />
        <ArtworkPreview artwork={finalArtwork} state="final" title="Week reveal" />
      </section>

      <style jsx>{`
        :global(*) { box-sizing: border-box; }
        :global(body) { margin: 0; background: #e8f1ed; color: #263650; }
        .lab-shell {
          --ink: #263650;
          --muted: #64728a;
          --paper: #fffaf0;
          --line: #c9d4cf;
          margin: 0 auto;
          max-width: 1440px;
          padding: clamp(20px, 4vw, 56px);
          font-family: Arial, Helvetica, sans-serif;
        }
        .lab-header { margin: 0 auto 30px; max-width: 760px; text-align: center; }
        .eyebrow, .mono-label, .artwork-state-note {
          color: var(--muted);
          font-family: "Courier New", monospace;
          font-size: 11px;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        h1, h2 { color: var(--ink); font-family: Georgia, "Times New Roman", serif; font-weight: 400; }
        h1 { font-size: clamp(38px, 6vw, 64px); letter-spacing: -.035em; margin: 7px 0 10px; }
        h2 { font-size: 25px; margin: 4px 0 0; }
        .intro { color: var(--muted); font-size: 15px; line-height: 1.65; }
        .controls-card {
          background: var(--paper);
          border: 1px solid #d6ddd4;
          border-radius: 20px;
          box-shadow: 0 12px 34px #2c465012;
          margin: 0 auto 28px;
          max-width: 1120px;
          padding: clamp(18px, 3vw, 30px);
        }
        .section-heading { align-items: end; display: flex; justify-content: space-between; }
        .scenario-list { display: flex; flex-wrap: wrap; gap: 9px; margin: 20px 0; }
        .scenario-button {
          background: #f3f5ef;
          border: 1px solid var(--line);
          border-radius: 999px;
          color: var(--ink);
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          padding: 10px 14px;
        }
        .scenario-button[aria-pressed="true"] { background: #dce8e7; border-color: #687b91; }
        .scenario-button:focus-visible, input:focus-visible, select:focus-visible {
          outline: 2px solid #587b9b;
          outline-offset: 2px;
        }
        .habit-list { display: grid; gap: 10px; }
        .habit-fields {
          align-items: center;
          border: 1px solid #e1e4dc;
          border-radius: 13px;
          display: grid;
          gap: 16px;
          grid-template-columns: minmax(75px, auto) minmax(220px, 1fr);
          margin: 0;
          padding: 12px;
        }
        .habit-fields legend { color: var(--muted); font: 11px "Courier New", monospace; padding: 0 5px; }
        .color-control { align-items: center; color: var(--muted); display: flex; gap: 10px; font-size: 12px; }
        .color-control input { background: transparent; border: 0; cursor: pointer; height: 32px; padding: 0; width: 42px; }
        .score-controls { display: grid; gap: 8px; grid-template-columns: repeat(7, minmax(42px, 1fr)); }
        .score-control { color: var(--muted); display: grid; font: 10px "Courier New", monospace; gap: 5px; text-align: center; }
        .score-control input {
          background: #fffdf8;
          border: 1px solid #dce1db;
          border-radius: 7px;
          color: var(--ink);
          font: 12px "Courier New", monospace;
          min-width: 0;
          padding: 7px 2px;
          text-align: center;
          width: 100%;
        }
        .setting-controls { align-items: end; display: flex; flex-wrap: wrap; gap: 28px; margin-top: 21px; }
        .setting-control { color: var(--muted); display: grid; font-size: 12px; gap: 8px; }
        .setting-control select { background: #fffdf8; border: 1px solid var(--line); border-radius: 8px; color: var(--ink); padding: 9px 30px 9px 10px; }
        .grain-control { flex: 1; min-width: 180px; }
        .grain-control span { display: flex; justify-content: space-between; }
        .grain-control output { font-family: "Courier New", monospace; }
        .grain-control input { accent-color: #657f91; width: 100%; }
        .settings-note { color: var(--muted); font-size: 12px; line-height: 1.6; margin: 15px 0 0; max-width: 740px; }
        .artwork-comparison { display: grid; gap: 24px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0 auto; max-width: 1120px; }
        :global(.artwork-figure) { margin: 0; min-width: 0; }
        :global(.artwork-caption) { color: var(--ink); font: 23px Georgia, "Times New Roman", serif; margin: 0 0 10px; }
        :global(.artwork-svg) {
          aspect-ratio: 4 / 3;
          background: #fff8e9;
          border: 1px solid #cbd4ce;
          border-radius: 12px;
          display: block;
          height: auto;
          overflow: hidden;
          width: 100%;
        }
        :global(.artwork-figure--preview .artwork-svg) { border-style: dashed; }
        :global(.artwork-state-note) { font-size: 10px; margin: 9px 0 0; text-align: center; }
        :global(.artwork-empty) { align-items: center; aspect-ratio: 4 / 3; background: #fff8e9; border: 1px solid #cbd4ce; border-radius: 12px; color: #64728a; display: flex; justify-content: center; padding: 20px; }
        @media (max-width: 760px) {
          .artwork-comparison { grid-template-columns: 1fr; }
          .habit-fields { grid-template-columns: 1fr; }
          .color-control { justify-content: space-between; }
        }
      `}</style>
    </main>
  );
}
