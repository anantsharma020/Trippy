# Reusable takeaways (from building Trippy)

A grab-bag of preferences, architecture defaults, and hard-won bug lessons to carry
into future projects. Written to be detailed; trim/merge later.

---

## 1. Global preferences & base architecture

### Product mindset
- **Build for what people come back for.** Identify the 2–3 core loops and make them
  effortless; let everything else stay secondary. For a planner that was: capture ideas
  fast, see the itinerary, pack, and plan with others. Polish those first.
- **Start simple; defer fragile/over-scoped features.** Cut things that need scraping,
  paid APIs, or brittle integrations from v1 (e.g. Instagram import). Leave a clean seam
  (e.g. keep a `source` field) so they can be added later without rework.
- **One flexible data object beats many rigid ones.** A single record that surfaces in
  different views based on which fields are filled (no duplication) is simpler and more
  powerful than parallel models. Views are just filters over the same data.
- **Capture-first UX.** Quick-add inputs everywhere; full detail/edit is optional and
  progressive. Don't force structure up front.

### UI / UX defaults
- **Theme:** light/white background with a single accent color (here: light purple).
  Define color tokens once (Tailwind `@theme`) and drive everything off them.
- **Mobile-first, iPhone-shaped.** Assume a ~375–390px viewport. Test there. Never allow
  horizontal scroll (`overflow-x: hidden` on root, plus correct flex/grid min-widths).
- **Installable PWA** so it lives on the home screen and feels native; respect safe-area
  insets; standalone display.
- **View-first detail, then Edit.** Tapping an item opens a read-only detail view with an
  Edit button — not straight into a form.
- **Keep list/main views clean.** Move secondary actions (reactions, comments, etc.) into
  the item's detail view; show only a small indicator on the card.
- **Forms show only relevant fields per type.** Hide fields that don't apply (e.g. a flight
  has no "location"/"priority"). Group related fields; two-per-row for compact pairs
  (dates, times, cost+currency).
- **Bottom tab bar** for top-level sections; **sticky in-page section nav**; **scroll to
  top on every navigation**; **modals/sheets top-aligned** so the on-screen keyboard never
  covers inputs.
- **Auto-fill where you can** (e.g. duration from start/end times; currency from country).
- **Sensible empty states** with a clear primary action.

### Multi-user / collaboration
- Real accounts so users can log in from any device; profiles (name, photo, prefs).
- Sharing/collaboration scoped to the object (invite to a trip with view/edit roles),
  not a public feed. Show "added by" attribution.
- Friend/relationship rows: store **one shared row** owned by the initiator, derive
  direction per-user. (Two-row-per-side models fight row-level security — see §2.)

### Architecture & hosting (the "works when my PC is off" stack)
- **Static frontend on GitHub Pages** (free, always-on, no server to keep running) +
  **Supabase** (free tier: Postgres + Auth + Realtime) for the backend. The frontend is
  just files; Supabase is hosted — so nothing depends on my machine.
  - Alternative: Vercel/Netlify for the frontend if SSR/edge functions are needed; for a
    pure SPA, GitHub Pages is enough.
- **Local-first with optional cloud.** Abstract persistence behind a small `Store`
  interface with two implementations: `LocalStore` (localStorage) and a cloud store.
  Pick at runtime by presence of env vars. This means:
  - The app runs and is demoable with **zero setup**.
  - Cross-device + collaboration "turn on" by adding Supabase keys — no code rewrite.
- **Single generic table for cloud data.** One `documents` table (`id, collection,
  owner_id, trip_id, data jsonb, updated_at, deleted`) + RLS. The exact same app logic
  runs on local and cloud. Realtime subscribe to the one table.
- **Stack:** React + TypeScript + Vite + Tailwind v4 + Zustand (state) + React Router
  (HashRouter for GitHub Pages) + Leaflet/OpenStreetMap for maps.
- **Free, no-key data sources** (avoid paid APIs in v1):
  - Open-Meteo — weather forecast + seasonal/archive, and geocoding (cities).
  - Nominatim (OpenStreetMap) — POI/venue/address search.
  - open.er-api.com — FX rates.
  - BigDataCloud — reverse geocode (lat/lng → country).
  - Natural Earth GeoJSON (CDN) — world choropleth.
  - Cache responses in localStorage with a TTL to be kind to public endpoints.

### Deployment / GitHub / ops
- Deploy via **GitHub Actions → Pages**. Key gotchas:
  - Set `VITE_BASE=/<repo>/` for project Pages sites; use a **hash router** so deep links
    work; add an SPA fallback (`cp dist/index.html dist/404.html`).
  - Put Supabase URL + anon key in **repo Actions secrets**; the anon key is public by
    design (safe to ship in the bundle).
  - `gh` CLI needs the **`workflow` scope** to push a workflow file
    (`gh auth refresh -s workflow`), and `gh auth setup-git` so git can push over HTTPS.
  - After deploy, **verify the built bundle** actually contains the expected env (e.g. grep
    the deployed JS for the Supabase project ref) rather than assuming.
- **Auto-updating PWA** so users don't have to delete/re-add the home-screen app:
  `registerType: 'autoUpdate'` + workbox `skipWaiting` + `clientsClaim` +
  `cleanupOutdatedCaches`, and a manual `registerSW({ immediate, onRegisteredSW })` that
  polls `registration.update()` on an interval. Note: one manual refresh is still needed to
  adopt the *first* build that includes this; after that it's automatic.
- **Data portability:** ship an export/import (JSON) early. It doubles as backup and as the
  migration path from local → cloud and between devices.

---

## 2. Global bugs, watch-outs & preventive checks

### Supabase / Row-Level Security (the biggest time sinks)
- **`.upsert()` triggers the UPDATE policy on inserts.** supabase-js `.upsert()` compiles to
  `INSERT ... ON CONFLICT DO UPDATE`, so Postgres also evaluates the UPDATE policy — and if
  that policy needs the row's parent to already exist, **creating brand-new rows fails RLS**.
  Fix: **insert first; on conflict (`23505`) fall back to `update`.** Also fall back to
  update on `42501` when the user is allowed to update a row they don't own (e.g. accepting
  a friend request on a row owned by the sender) — but only treat it as success if a row was
  actually updated, else surface the real error.
- **Always give the owner access in SELECT/UPDATE/DELETE.** A policy that only lists
  collaboration branches (trip membership, etc.) silently locks owners out of their *own*
  rows (symptom here: a user's packing templates simply didn't appear, and edits failed).
  Include `owner_id = auth.uid()::text` in every policy.
- **Avoid RLS chicken-and-egg.** Don't gate an INSERT on a membership check that requires the
  row to already exist (a new trip can't be created if the policy asks "are you a member of
  this trip?"). Keep INSERT simple: `with check (owner_id = auth.uid())`. Visibility is still
  governed by SELECT, so this doesn't leak.
- **Soft-delete is an UPDATE.** If you "delete" by setting `deleted = true`, it's governed by
  the UPDATE policy, not DELETE. Owners need UPDATE rights or deletes fail.
- **Prove RLS with a real token before assuming.** Sign up a throwaway user via the auth REST
  endpoint, grab the access token, and `curl` the REST API (insert/update/select) to confirm
  policies behave. This caught the upsert and owner-access bugs definitively.
- **Grant table privileges, not just RLS.** Tables created via raw SQL may lack
  `grant ... to authenticated`; RLS allows a row but the role still gets "permission denied
  for table" until granted.

### Supabase Auth
- **Email confirmation is ON by default** and the free built-in SMTP has a tiny rate limit —
  signups/friends fail with "email rate limit exceeded." For low-stakes apps, **disable email
  confirmation** (Auth → Providers → Email). In code, detect the "user created but no session"
  case and surface it instead of silently doing nothing.

### Secure context / browser APIs
- **`crypto.subtle` (Web Crypto) only exists in secure contexts** (HTTPS or `localhost`). On a
  plain-HTTP LAN IP it's `undefined` and throws. Either serve over HTTPS or provide a non-crypto
  fallback. (Same class of issue affects service workers and full PWA behavior — another reason
  to deploy to HTTPS early.)

### CSS / responsive layout
- **`grid sm:grid-cols-2` with no base `grid-cols-1`** makes the mobile column size to content
  (`auto`), so long text blows past the screen. Always set the base `grid-cols-1` (which is
  `minmax(0,1fr)`). This was the real cause of repeated "items too wide on phone."
- **`w-full` vs `flex-1` conflict.** A child carrying `w-full` (e.g. a shared Input/Select base)
  next to a `flex-1` sibling: the `w-full` one wins and crushes the sibling. Fix by wrapping each
  control in an explicit-width container (`flex-1 min-w-0` for the grow item, `w-32 shrink-0` for
  the fixed one) instead of relying on `w-auto`/`flex-1` on the element itself.
- **`truncate` needs `min-w-0` on every flex ancestor**, or it won't clip.
- **Native date/time inputs are a mess on iOS.** They render blank-looking when empty, have an
  intrinsic min-width that causes overlap in narrow columns, and the picker icon eats space. Fixes:
  hide `::-webkit-calendar-picker-indicator`, overlay your own placeholder (make the value text
  transparent while empty), force dark text, and lay them out two-per-row.

### Mobile interaction
- **Tap vs. scroll on custom dropdowns.** `onClick` on result rows is unreliable on touch: the
  input's blur can swallow the tap, *or* scrolling the list instantly selects an item. Use
  `pointerdown` to record the start position and select on `pointerup` only if the finger barely
  moved (movement < ~12px).
- **History stacking / back-swipe.** In-page tab navigation that `push`es history means the OS
  back-swipe cycles through tabs instead of leaving the section. Use `replace` for tab/secondary
  navigation, and a `ScrollToTop` on route change.

### React / state
- **StrictMode double-invokes effects** in dev — any "seed/migrate once" effect runs twice and
  creates duplicates before the first async write lands. Guard with a module-level in-flight flag,
  and make the operation idempotent (dedupe; version flags).
- **Last-write-wins clobbering.** A modal that writes some changes immediately *and* has a Save
  button that writes the (stale) form copy will erase the immediate changes. Edit one source of
  truth (form state) and persist once on Save.
- **Don't assume list order for "self".** "Traveling with {others}" via `slice(1)` assumed the
  owner is first; for a non-owner viewer it showed *their own* name. Exclude the current user
  explicitly.

### Migrations & data
- **Version your seed/migration data** (`templatesVersion`) and **set the version only after the
  migration succeeds**, so a failure (e.g. RLS not yet fixed) retries cleanly instead of marking
  done and leaving the user stuck. Make it idempotent (dedupe by name/title), and **never clobber
  user-created data** — distinguish seeded (`auto: true`) from user content.
- **Cross-device/local→cloud import:** remap the old user id to the current user (force
  `owner_id = current user` on every imported row), **insert parents before children** (so RLS
  membership/relationship checks pass), and **skip-and-report** failures rather than aborting the
  whole import.

### Third-party / external links
- **URL shorteners (e.g. Google Maps `maps.app.goo.gl`) can't be resolved reliably client-side** —
  short links carry no coordinates, CORS blocks reading redirects, and the target serves an
  anti-scraping page. Best-effort via a redirect-following proxy (with a timeout + a second proxy),
  but **always provide a 100%-reliable manual fallback** (here: paste raw `lat, lng`, which you get
  by long-pressing a spot in Maps).

### Preventive checklist (run before declaring done / deploying)
- [ ] `tsc --noEmit` and a production build both pass.
- [ ] Viewed at ~375px width: no horizontal scroll, no overlapping/crushed fields, long text
      truncates.
- [ ] For every owned collection: SELECT / INSERT / UPDATE(/soft-delete) / DELETE policies all
      permit the owner; verified with a real authenticated token via curl.
- [ ] Auth flow works with email confirmation in its actual state; the "no session" path is handled.
- [ ] Creating a brand-new top-level record works in cloud mode (catches the upsert/RLS trap).
- [ ] PWA picks up new deploys without reinstall (after the one-time SW adoption).
- [ ] Export/import round-trips data (and remaps owner on import).
- [ ] Deployed bundle actually contains the expected env/config.
