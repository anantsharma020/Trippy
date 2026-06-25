# Trippy — session handoff

Pick-up notes for a new chat so it doesn't have to read the whole codebase.
Pair this with `TAKEAWAYS.md` (preferences + recurring-bug lessons).

## What Trippy is
A flexible travel-planning **PWA** for iPhone. Plan as little or as much as you want:
trips hold ideas, an itinerary, travel details (bookings), action items, packing, and a
map. Collaborate with friends. Dream destinations are lightweight "draft trips."

- **Live:** https://anantsharma020.github.io/Trippy/  (GitHub Pages, repo `anantsharma020/Trippy`)
- **Deploy:** push to `main` → GitHub Actions builds and publishes. Auto-updating PWA.
- **Backend:** Supabase project ref `hgytcijqxszhamwapanh` (Auth + Postgres + Realtime),
  keys set as repo Actions secrets `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

## Stack & how to run
- React + TypeScript + Vite + Tailwind v4 + Zustand + React Router (**HashRouter**) +
  Leaflet/OpenStreetMap. PWA via `vite-plugin-pwa`.
- **Node isn't on the default PATH** — prefix commands: `export PATH="/opt/homebrew/bin:$PATH"`.
- Dev: `npm run dev` (preview/launch config uses port **5223**). To test on a phone, run
  `vite --host` and open the Mac's LAN IP.
- Before deploy: `npx tsc --noEmit` and `npx vite build` must pass.

## Local-first + cloud architecture (important)
- All data persists as generic docs `{ id, collection, ownerId, tripId, data, updatedAt, deleted }`
  through a `Store` interface (`src/lib/store.ts`) with two backends:
  - `LocalStore` (localStorage) — default, zero-setup.
  - `SupabaseStore` — single `documents` table + RLS. **Save = insert, then update on
    conflict/`42501`** (never `.upsert()`; see TAKEAWAYS §2).
  - Chosen at runtime by presence of `VITE_SUPABASE_URL` (`src/lib/supabase.ts` → `isCloud`).
- **Flexible `Item` model** (`src/lib/types.ts`): one record shows up in Ideas (no date),
  Itinerary (has date), Travel Details (booking), Map (location), Action Items — never duplicated.
- **Dreams are trips** with `isDream: true`; "Plan trip" flips it off. Items keyed by the
  dream's id are its ideas.

## Theming gotcha (read before touching styles)
The app is a **light theme built on dark-sounding token names**. In `src/index.css` `@theme`,
the `ink-*` scale is remapped to light surfaces and the **bright end of `slate-*` is remapped to
dark text**. So in JSX: `bg-ink-900` ≈ white card, `bg-ink-850` ≈ input bg, `text-slate-100/200`
≈ dark text, `text-slate-400/500` ≈ muted, `brand-*` ≈ purple accent. Don't "fix" these to look
light — they already are.

## File map
- `src/lib/`
  - `types.ts` — domain model (Item, Trip, Profile, PackItem/Template, etc.).
  - `store.ts` — Store interface + LocalStore + SupabaseStore.
  - `db.ts` — Zustand `useApp`: loads docs into collections; auth wiring; trips/dreams/
    friends/members CRUD; `createTrip({isDream})`, `convertDreamToTrip`, `migrateDreams`.
  - `data.ts` — typed helpers for items/actions/packing/comments/reactions/templates;
    `saveItem` reconciles a "Book {title}" action from `bookingStatus`; `seedTemplates`
    (version **3**, theme-only templates + DEFAULT_CORE merged into profile core list);
    `CATEGORY_EMOJI`. **Packing is per-member**: `newPacking` stamps `person`=current user;
    `myPacking(tripId, ownerId)` returns just your items (legacy person-less rows fall to the
    owner).
  - `auth.ts` — auth over Supabase + local profiles (with non-crypto hash fallback).
  - `api.ts` — `geocode` (Nominatim), `weatherFor` (Open-Meteo), `fxRates`,
    `reverseCountryCode` (BigDataCloud), `resolveMapsLink` (proxy-resolves short links).
  - `util.ts` — `uid`, date helpers, `durationBetween`, `parseMapsLink`, `money`;
    `tripPhase`/`tripStatusLabel` (upcoming/active/past over the full start→end range — an
    ongoing trip reads "Day 2 of 8", not "Ended yesterday").
  - `currencies.ts`, `countries.ts` (alpha2→name+continent), `world.ts` (GeoJSON loader),
    `packingTemplates.ts` (`DEFAULT_CORE` + theme-only `PACKING_TEMPLATES`), `backup.ts`
    (export/import with owner remap).
- `src/ui/` — `primitives.tsx` (Button, **Modal** [top-aligned by default], Field, Input,
  Select, **DateTimeField** [custom placeholder, hidden native icon], Avatar, Chip, Card,
  SegTabs, EmptyState, Spinner), `AppShell.tsx` (header + avatar menu, optional `bottomNav`;
  optional `subBar` rendered **inside** the sticky header so a page's section nav stays glued
  to the title bar with no gap and never floats over content; `safe-top` lives on the header),
  `BottomNav.tsx` (Trips / World / Dreams).
- `src/components/` — `ItemCard` (clean card, optional `showDone` checkbox), `ItemModal`
  (view → Edit), `ItemEditor` (per-category fields, `FlightLegs`, `MapsLinkInput`),
  `LocationSearch` (pointerdown/up tap detection), `MapView`, `WorldMap` (static thumbnail +
  fullscreen pinch-zoom), `Weather`, `Currency`, `TripCreateModal`, `TripSettingsModal`,
  `ImagePicker`, `Comments`. (`DreamModal` is legacy/likely unused.)
- `src/pages/` — `Home` (exports `TripCard` + `isPast`/`isActive`; "Happening now" +
  "Upcoming" + "Past trips"; auto-opens the lone active trip once per session via
  `sessionStorage['trippy-active-opened']`), `AuthScreen`, `Friends`, `ProfilePage`,
  `CorePackingPage`, `PastTripsPage`, `WorldPage`, `DreamsPage`, `DreamDetail`,
  `TripLayout` (passes the section nav to `AppShell` as `subBar`; `useTrip()` context).
- `src/sections/` — `Overview` (tiles: summary → open actions [hidden when none] → next-4
  upcoming itinerary → **smart `KeyTravel`** [current/next accommodation always; flights/car/
  transfers only within 3 days; tiles expand inline] → currency → weather → packing), `Itinerary`
  (entry model; accommodation → check-in/out lines; scrolls to today), `Ideas` (filters incl.
  "Hide done"), `TravelDetails` (only `DETAIL_CATS`: stays/flights/car/train/ferry/transfer —
  no generic-booking catch-all), `ActionItems` (assignee/priority filters), `Packing`
  (per-member via `myPacking`; `PackRow` editable, alphabetical, quantity stepper; templates),
  `TripMap`.
- `src/App.tsx` — routes + `ScrollToTop`. `src/main.tsx` — `registerSW`.
- `vite.config.ts` — PWA config + `VITE_BASE`. `supabase/schema.sql` — owner-based RLS.
  `.github/workflows/deploy.yml` — Pages deploy.

## Conventions
- New screen = `AppShell` (+ `bottomNav` for top-level, or `back="/path"`).
- New persisted entity = add a `collection` in `db.ts` (group + state) and helpers in `data.ts`.
- Cards stay clean; reactions/comments live in `ItemModal` detail.
- Forms: only relevant fields per category; pairs two-per-row; use `DateTimeField` for dates/times.
- Always set base `grid-cols-1` on responsive grids; wrap input+select rows with explicit widths.

## Current state / open threads
- **Action required by user (may be done):** run the RLS owner-branch SQL (SELECT + UPDATE) in
  Supabase so cloud users can read/update their own `packtemplates` — otherwise themed packing
  templates won't appear. Snippet is in the last assistant message of the prior chat and matches
  `supabase/schema.sql`.
- **Google Maps short links** (`maps.app.goo.gl`) resolve best-effort via proxy; the reliable
  fallback is pasting raw `lat, lng`. Don't over-invest here without a paid Places API.
- Email confirmation in Supabase should be **off** (it was causing rate-limit failures).
- Everything through the last deploy is live and verified at ~375px width.

## Recently shipped (so you don't redo it)
Light-purple theme; bottom nav; World choropleth (static + fullscreen) with manual visited
countries + visited/continents counters; dreams-as-trips with "Plan trip"; per-user core packing
list + theme-only templates; editable/alphabetical packing with quantity steppers; itinerary
accommodation check-in/out + opens on today; mark-idea-done + hide-done filter; archive past
trips; export/import backup; Google-Maps-link pin; auto-updating PWA; many mobile form fixes.

**Latest (status + overview pass):** range-aware trip status (`tripPhase`/`tripStatusLabel`, so
an ongoing trip reads "Day 2 of 8"); Home "Happening now" section + highlighted active card +
auto-open the lone active trip; Overview retiled (smart `KeyTravel` with inline-expanding tiles,
next-4 upcoming itinerary, open-actions hidden when empty); Travel Details scoped to real travel
categories; section nav glued under the header via `AppShell` `subBar`; **per-member packing
lists** (`person` field + `myPacking`).
