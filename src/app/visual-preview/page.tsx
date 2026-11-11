"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArtworkPreview } from "@/components/artwork-preview";
import {
  DEFAULT_ARTWORK_SETTINGS,
  generateWeeklyArtwork,
  type ArtworkHabitInput,
} from "@/lib/artwork";
import styles from "./visual-preview.module.css";

type Screen = "login" | "home" | "habit" | "reveal" | "archive";

const screens: readonly { id: Screen; label: string }[] = [
  { id: "login", label: "Login" },
  { id: "home", label: "Home" },
  { id: "habit", label: "Add habit" },
  { id: "reveal", label: "Week reveal" },
  { id: "archive", label: "Archive" },
];

const sampleHabits: ArtworkHabitInput[] = [
  { id: "walk", color: "#fc563b", scores: [100, 80, 100, 60, 100, 80, 100] },
  { id: "read", color: "#22cde0", scores: [80, 100, 60, 100, 80, 100, 80] },
  { id: "stretch", color: "#f1e600", scores: [100, 60, 100, 80, 100, 80, 100] },
];

const brightHabits = [
  { name: "Move outside", color: "#ff3b30", detail: "Yes / no", today: true },
  { name: "Drink water", color: "#00d8f0", detail: "Amount · 8 cups", today: false },
  { name: "How I feel", color: "#e7f000", detail: "Rating · 1–5", today: true },
];

const inventory = [
  { screen: "All full-treatment screens", assets: "Four replaceable botanical border corners: top-left, top-right, bottom-left, bottom-right. One repeatable hand-drawn border-edge ornament (optional)." },
  { screen: "Login and landing", assets: "One small hand-drawn habit / weekly-cycle emblem. The example artwork is generated from sample scores, not a decorative illustration." },
  { screen: "Home", assets: "Check-in completion mark; yes/no habit icon; amount habit icon; rating habit icon; add-habit plus; week-preview progress marker." },
  { screen: "Add and edit habit", assets: "Yes/no, amount, and rating type icons; frequency/calendar icon; colour-picker icon; step-progress marker; back and continue arrows." },
  { screen: "Week reveal", assets: "One reveal/celebration illustration placeholder. Artwork is generated from the week's scores." },
  { screen: "Archive", assets: "One archive/week-stack icon; optional per-week decorative title divider. Artwork thumbnails are generated from each archived week." },
  { screen: "Shared navigation", assets: "Home, archive, account/settings, and logout icons; close icon for the settings menu." },
];

function AssetPlaceholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span aria-label={`${label} — illustration placeholder`} className={`${styles.assetPlaceholder} ${className}`}>
      <span className={styles.assetPlus} aria-hidden="true">+</span>
      <span>{label}</span>
    </span>
  );
}

function PosterFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.poster}>
      <div aria-hidden="true" className={styles.posterBorder} />
      <AssetPlaceholder className={styles.cornerTopLeft} label="TL · corner asset" />
      <AssetPlaceholder className={styles.cornerTopRight} label="TR · corner asset" />
      <AssetPlaceholder className={styles.cornerBottomLeft} label="BL · corner asset" />
      <AssetPlaceholder className={styles.cornerBottomRight} label="BR · corner asset" />
      <div className={styles.posterContent}>{children}</div>
    </div>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return <p className={styles.kicker}>{children}</p>;
}

function FullScreenShell({
  children,
  onNavigate,
}: {
  children: ReactNode;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <div className={styles.world}>
      <header className={styles.prototypeBar}>
        <span className={styles.prototypeLabel}>Visual prototype · placeholder content</span>
        <nav aria-label="Preview screens" className={styles.prototypeNav}>
          {screens.map((screen) => (
            <button key={screen.id} onClick={() => onNavigate(screen.id)} type="button">
              {screen.label}
            </button>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}

function LoginScreen({ onStart }: { onStart: () => void }) {
  return (
    <PosterFrame>
      <main className={styles.loginLayout}>
        <div className={styles.loginCopy}>
          <Kicker>A week, made visible</Kicker>
          <h1 className={styles.posterTitle}>Small things,<br />over time.</h1>
          <p className={styles.bodyCopy}>
            A quiet place to keep up with the habits you choose. By the end of the week,
            your check-ins have made something of their own.
          </p>
          <div className={styles.placeholderPanel}>
            <AssetPlaceholder label="Landing illustration / habit-cycle emblem" />
            <span className={styles.assetCaption}>Illustration placeholder · replace with approved hand-drawn asset</span>
          </div>
          <button className={styles.primaryButton} onClick={onStart} type="button">
            Continue to sign in
          </button>
          <p className={styles.finePrint}>Sign-in flow placeholder · connect account provider later</p>
        </div>
        <div className={styles.loginArtwork}>
          <Kicker>One week, in colour</Kicker>
          <ArtworkPreview
            artwork={generateWeeklyArtwork(sampleHabits, "final", DEFAULT_ARTWORK_SETTINGS)}
            state="final"
            title="A sample week"
          />
          <p className={styles.artworkDisclaimer}>Generated from example scores · not a saved week</p>
        </div>
      </main>
      <p className={styles.posterFootnote}>A weekly habit practice · account and copy are placeholders</p>
    </PosterFrame>
  );
}

function CalmShell({
  children,
  active,
  onNavigate,
}: {
  children: ReactNode;
  active: "home" | "habit";
  onNavigate: (screen: Screen) => void;
}) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  return (
    <div className={styles.world}>
      <header className={styles.prototypeBar}>
        <span className={styles.prototypeLabel}>Visual prototype · placeholder content</span>
        <nav aria-label="Preview screens" className={styles.prototypeNav}>
          {screens.map((screen) => (
            <button key={screen.id} onClick={() => onNavigate(screen.id)} type="button">
              {screen.label}
            </button>
          ))}
        </nav>
      </header>
      <div className={styles.calmShell}>
        <header className={styles.appHeader}>
          <button aria-label="Habit Tracker home" className={styles.wordmark} onClick={() => onNavigate("home")} type="button">
            <span className={styles.wordmarkMark}>H</span>
            <span>Habit practice</span>
          </button>
          <nav aria-label="Main navigation" className={styles.appNav}>
            <button aria-current={active === "home" ? "page" : undefined} onClick={() => onNavigate("home")} type="button">Today</button>
            <button onClick={() => onNavigate("archive")} type="button">Past weeks</button>
            <div className={styles.accountMenuWrap}>
              <button
                aria-controls="account-menu"
                aria-expanded={accountMenuOpen}
                aria-label="Account and settings"
                onClick={() => setAccountMenuOpen((open) => !open)}
                type="button"
              >
                Account
              </button>
              {accountMenuOpen ? (
                <div className={styles.accountMenu} id="account-menu">
                  <p>Account basics · placeholder</p>
                  <button onClick={() => onNavigate("login")} type="button">Log out · placeholder</button>
                </div>
              ) : null}
            </div>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}

function HomeScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [empty, setEmpty] = useState(true);

  return (
    <CalmShell active="home" onNavigate={onNavigate}>
      <main className={styles.calmMain}>
        <div className={styles.titleRow}>
          <div>
            <Kicker>Monday · sample date</Kicker>
            <h1 className={styles.calmTitle}>A little at a time.</h1>
          </div>
          <button className={styles.textButton} onClick={() => setEmpty((value) => !value)} type="button">
            {empty ? "Preview bright-color examples" : "Preview new-user empty state"}
          </button>
        </div>

        {empty ? (
          <section aria-labelledby="empty-heading" className={`${styles.card} ${styles.emptyCard}`}>
            <div className={styles.emptyIllustration}>
              <AssetPlaceholder label="First-week illustration placeholder" />
            </div>
            <Kicker>Your first week starts here</Kicker>
            <h2 id="empty-heading" className={styles.cardTitle}>Make room for one small thing.</h2>
            <p className={styles.bodyCopy}>
              Choose a habit that matters to you. Check in as the week unfolds; the preview will
              take shape alongside it.
            </p>
            <button className={styles.primaryButton} onClick={() => onNavigate("habit")} type="button">
              Set up your first habit
            </button>
            <p className={styles.softNote}>Up to five habits · add another whenever you are ready</p>
          </section>
        ) : (
          <section aria-label="Bright habit-color layout check" className={styles.card}>
            <div className={styles.cardHeader}>
              <div><Kicker>Today&apos;s check-ins · sample data</Kicker><h2 className={styles.cardTitle}>Keep your own colours.</h2></div>
              <span className={styles.monoTag}>3 / 5</span>
            </div>
            <p className={styles.softNote}>Stress-test examples · very bright habit colours stay on small, contained marks.</p>
            <div className={styles.checkinList}>
              {brightHabits.map((habit) => (
                <article className={styles.checkinRow} key={habit.name}>
                  <span aria-hidden="true" className={styles.colorDot} style={{ backgroundColor: habit.color }} />
                  <div className={styles.checkinCopy}>
                    <h3>{habit.name}</h3>
                    <p>{habit.detail}</p>
                  </div>
                  <span className={`${styles.checkinState} ${habit.today ? styles.checked : ""}`}>
                    {habit.today ? "Checked in" : "Not yet"}
                  </span>
                </article>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="preview-heading" className={styles.card}>
          <div className={styles.cardHeader}>
            <div><Kicker>This week · Monday to Sunday</Kicker><h2 className={styles.cardTitle} id="preview-heading">A preview, still forming</h2></div>
            <span className={styles.monoTag}>Preview</span>
          </div>
          <div className={styles.calmArtwork}>
            <ArtworkPreview artwork={generateWeeklyArtwork(empty ? [] : sampleHabits, "preview")} state="preview" />
          </div>
          <p className={styles.softNote}>The artwork stays unfinished until the week is complete.</p>
        </section>
      </main>
    </CalmShell>
  );
}

function HabitScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [step, setStep] = useState(0);
  const steps = ["Name", "Type", "Details", "Frequency", "Colour"];

  return (
    <CalmShell active="habit" onNavigate={onNavigate}>
      <main className={styles.calmMain}>
        <button className={styles.backButton} onClick={() => onNavigate("home")} type="button">← Back to today</button>
        <section aria-labelledby="habit-heading" className={`${styles.card} ${styles.habitCard}`}>
          <Kicker>Habit setup · visual placeholder</Kicker>
          <h1 className={styles.calmTitle} id="habit-heading">Start with one small thing.</h1>
          <ol aria-label="Habit setup steps" className={styles.stepList}>
            {steps.map((label, index) => (
              <li className={index === step ? styles.currentStep : ""} key={label}>
                <button aria-current={index === step ? "step" : undefined} onClick={() => setStep(index)} type="button">
                  <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                  {label}
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.formPreview}>
            <label className={styles.fieldLabel} htmlFor="habit-name">What would you like to practice?</label>
            <input id="habit-name" className={styles.textInput} placeholder="A name for your habit" />
            <p className={styles.softNote}>This field is a visual prototype; it does not save data yet.</p>
          </div>
          <div className={styles.typeChoices}>
            {["Yes / no", "Amount", "Rating"].map((type, index) => (
              <button className={styles.typeChoice} key={type} onClick={() => setStep(index === 0 ? 1 : 2)} type="button">
                <AssetPlaceholder label={`${type} icon`} />
                <span>{type}</span>
              </button>
            ))}
          </div>
          <aside className={styles.lockNote}>
            <span className={styles.lockMark}>i</span>
            <p>Your target is locked for the rest of this week. You can adjust it next week.</p>
          </aside>
          <div className={styles.formActions}>
            <button className={styles.secondaryButton} onClick={() => setStep((value) => Math.max(value - 1, 0))} type="button">Back</button>
            <button className={styles.primaryButton} onClick={() => setStep((value) => Math.min(value + 1, steps.length - 1))} type="button">Continue</button>
          </div>
        </section>
      </main>
    </CalmShell>
  );
}

function RevealScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <PosterFrame>
      <main className={styles.posterPage}>
        <Kicker>Week ending · sample date</Kicker>
        <h1 className={styles.posterTitle}>Look what grew.</h1>
        <p className={styles.bodyCopy}>Week-reveal copy placeholder · final tone and threshold are intentionally undecided.</p>
        <div className={styles.revealArtwork}>
          <ArtworkPreview artwork={generateWeeklyArtwork(sampleHabits, "final")} state="final" title="This week's artwork" />
        </div>
        <div className={styles.revealMeta}>
          <span className={styles.monoTag}>Week metrics placeholder</span>
          <span className={styles.monoTag}>Caption threshold placeholder</span>
        </div>
        <div className={styles.placeholderPanel}>
          <AssetPlaceholder label="Week-reveal illustration placeholder" />
          <span className={styles.assetCaption}>Replace with approved hand-drawn illustration</span>
        </div>
        <div className={styles.buttonRow}>
          <button className={styles.primaryButton} onClick={() => onNavigate("archive")} type="button">Browse past weeks</button>
          <button className={styles.outlineButton} onClick={() => onNavigate("home")} type="button">Back to today</button>
        </div>
      </main>
    </PosterFrame>
  );
}

function ArchiveScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <PosterFrame>
      <main className={styles.posterPage}>
        <Kicker>Your weeks, gathered</Kicker>
        <h1 className={styles.posterTitle}>A record in colour.</h1>
        <p className={styles.bodyCopy}>Archive labels and dates are examples. No account data is connected in this visual prototype.</p>
        <div className={styles.archiveGrid}>
          {["Week of · sample date", "Week of · sample date", "Week of · sample date"].map((label, index) => (
            <article className={styles.archiveCard} key={`${label}-${index}`}>
              <ArtworkPreview artwork={generateWeeklyArtwork(sampleHabits.map((habit) => ({
                ...habit,
                scores: habit.scores.map((score) => Math.max(20, (score ?? 0) - index * 20)),
              })), "final")} state="final" />
              <span className={styles.archiveLabel}>{label}</span>
              <span className={styles.monoTag}>Week summary placeholder</span>
            </article>
          ))}
        </div>
        <button className={styles.outlineButton} onClick={() => onNavigate("home")} type="button">Back to today</button>
      </main>
    </PosterFrame>
  );
}

function AssetInventory() {
  return (
    <details className={styles.inventory}>
      <summary>Hand-drawn asset placeholders · replacement checklist</summary>
      <p>These are placeholders only; no new decorative illustrations are included in this prototype.</p>
      <ul>
        {inventory.map((item) => <li key={item.screen}><strong>{item.screen}:</strong> {item.assets}</li>)}
      </ul>
    </details>
  );
}

export default function VisualPreviewPage() {
  const [screen, setScreen] = useState<Screen>("login");
  const content = useMemo(() => {
    switch (screen) {
      case "login": return <LoginScreen onStart={() => setScreen("home")} />;
      case "home": return <HomeScreen onNavigate={setScreen} />;
      case "habit": return <HabitScreen onNavigate={setScreen} />;
      case "reveal": return <RevealScreen onNavigate={setScreen} />;
      case "archive": return <ArchiveScreen onNavigate={setScreen} />;
    }
  }, [screen]);

  return (
    <div className={styles.previewPage}>
      {screen === "login" || screen === "reveal" || screen === "archive" ? (
        <FullScreenShell onNavigate={setScreen}>{content}</FullScreenShell>
      ) : content}
      <AssetInventory />
      <style jsx global>{`
        body { margin: 0; }
        .artwork-figure { margin: 0; min-width: 0; }
        .artwork-caption { color: #293d5c; font: 20px Georgia, "Times New Roman", serif; margin: 0 0 8px; }
        .artwork-svg { aspect-ratio: 4 / 3; background: #fff8e9; border: 1px solid #cbd4ce; border-radius: 10px; display: block; height: auto; width: 100%; }
        .artwork-figure--preview .artwork-svg { border-style: dashed; }
        .artwork-state-note { color: #64728a; font: 10px "Courier New", monospace; letter-spacing: .1em; margin: 7px 0 0; text-align: center; text-transform: uppercase; }
        .artwork-empty { align-items: center; aspect-ratio: 4 / 3; background: #fff8e9; border: 1px dashed #cbd4ce; border-radius: 10px; color: #64728a; display: flex; font: 13px Arial, sans-serif; justify-content: center; padding: 18px; text-align: center; }
      `}</style>
    </div>
  );
}
