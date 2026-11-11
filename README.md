# Habit Tracker foundation

This project contains the data/auth foundation and pure scoring/date-rule modules, plus an isolated artwork-generator lab. The lab is not a product screen and is not connected to the app flow.

## Run locally

The app uses Supabase for Auth and Postgres, and supports anonymous sessions so a person can start without creating an account. No hosted Supabase project is needed for local development, but the local Supabase services require Docker Desktop.

1. Install and start Docker Desktop. The commands below run the Supabase CLI through `npx`, so a separate global CLI install is optional.
2. Start the local Supabase services from this folder:

   ```powershell
   npx supabase start
   ```

3. Copy `.env.example` to `.env.local`. Set the URL and anon key to the API URL and anon key printed by `npx supabase status`.
4. Apply migrations and start Next.js:

   ```powershell
   npx supabase db reset
   npm run dev
   ```

5. Create an anonymous session by sending a `POST` request to `http://localhost:3000/api/session`. The session is stored in HTTP-only Supabase cookies. Email/password login and account linking are intentionally deferred.

If Docker is not installed/running, the scoring tests and type checks still work without Supabase; the session endpoint and database cannot run until Supabase is available.

## Scoring and date rules

`src/lib/scoring.ts` and `src/lib/week.ts` are pure domain modules and do not depend on Next.js or Supabase. Dates use ISO calendar dates and Monday–Sunday weeks. A weekly-count occurrence contributes its type-specific score divided by the weekly goal, and the total is capped at 100%; a week with no entries returns `null`. Unlogged scheduled days score zero, while days before habit creation are blank (`null`). There is no weekly rollup rule for specific-day habits in this stage.

Weekly settings are snapshotted so past weeks remain reproducible. **Placeholder behavior:** the database currently locks the full weekly settings snapshot (target, frequency, name, and color) after a week starts. The brief only explicitly locks targets; confirm whether the other settings should also be locked. Database triggers reject logs before habit creation or after the following Monday in the person's timezone, and enforce the five-active-habit limit. RLS policies scope records to the signed-in Supabase user.

Run the checks:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

## Artwork generator lab

Visit `/artwork-lab` while the dev server is running to inspect the standalone weekly artwork generator. Its deterministic grid distributes week-level habit scores across separate blobs; each cell combines the habit palette instead of representing one particular habit-day. This generator is independent of the scoring module and is not connected to the product screens.

The initial blend is weighted HSL hue: hue is averaged around the color wheel, helping a strong week stay vivid instead of averaging toward grey. Weighted linear-light RGB is also available for softer, more muted mixes. Grain defaults to a light 5.5% overlay so the paper texture stays secondary to the blobs; both blend mode and grain are adjustable on the lab page. The preview reveals a deterministic minority of cells rather than looking like a pale final image.

## Visual screen prototype

Visit `/visual-preview` to preview login, home (including its new-user empty state and bright-color stress test), add-habit, week reveal, and archive. Use the prototype navigation to switch between them. The prototype is not wired to authentication or persistence. It uses replaceable, text-only illustration placeholders; open the “Hand-drawn asset placeholders” checklist at the bottom of the page for the full asset inventory. Check the same route at narrow phone widths to review the decorative frame and card layouts.
