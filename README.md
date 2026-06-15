# ✈️ Trippy

A flexible travel-planning workspace. **Plan as little or as much as you want** — start with a name and a destination, then add ideas, an itinerary, bookings, tasks, and packing lists over time. Built to run on your iPhone as an installable web app (PWA), and to be planned together with friends.

## What it does

- **Home** — upcoming trips with countdowns & live summaries, dream destinations, and a world map.
- **Flexible items** — one record surfaces wherever it's relevant: no date → **Ideas**, has a date → **Itinerary**, has a booking → **Travel Details**, has a location → **Map**, has a task → **Action Items**.
- **Ideas** — quick capture, categories, statuses, priorities, tags; list / board / category / priority / by-person / map views; reactions & comments.
- **Itinerary** — flexible time precision (exact time, rough time, date-only, multi-day); day-by-day, timeline, and a map view with a numbered route through the day's stops.
- **Travel Details** — flights, hotels, car rental, trains/ferries/transfers, confirmations & links.
- **Action Items** — tasks with due dates, assignees, priority, status, and links to related items.
- **Packing** — manual lists plus 14 smart templates (beach, hiking, ski, road trip, baby…).
- **Weather** by destination (real forecast when close, typical seasonal otherwise) and **currency → EUR** conversion — both from free, no-key APIs.
- **Collaboration** — profiles, friends, invite travel partners to a trip with view/edit roles, "added by" attribution, assignments, comments, and reactions.

## Running locally

```bash
npm install
npm run dev
```

Open the printed URL. With no configuration, Trippy runs in **local mode** — all data lives in your browser. You can create multiple profiles (sign out → Create profile) and switch between them to try the friends/collaboration flow on a single device.

## Cloud sync + friends (login from any device)

Local mode is single-device. To log in from any device and share trips with friends for real, connect a free **Supabase** project:

1. Create a project at [supabase.com](https://supabase.com).
2. In the dashboard, open **SQL → New query**, paste [`supabase/schema.sql`](supabase/schema.sql), and run it.
3. Copy **Settings → API → Project URL** and **anon public key**.
4. Create a `.env` (see [`.env.example`](.env.example)):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Restart `npm run dev`. Now sign-up creates a real account, trips sync across devices live, and you can add friends by email and invite them to trips.

> Friends/sharing require cloud mode (Supabase). The schema's row-level security ensures people only see the trips they're members of.

## Deploy to GitHub Pages

This repo includes [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

1. Push the repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. (For cloud sync) **Settings → Secrets and variables → Actions** → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Push to `main`. The workflow builds and publishes to `https://<you>.github.io/<repo>/`.

On your iPhone, open that URL in Safari → **Share → Add to Home Screen** to install it like an app.

## Tech

React + TypeScript + Vite · Tailwind v4 · React Router (hash) · Zustand · Leaflet + OpenStreetMap · Open-Meteo (weather/geocoding) · open.er-api.com (FX) · Supabase (optional) · vite-plugin-pwa.

## Not in this MVP

- **Instagram import** was intentionally deferred (reliable extraction needs an AI step / fragile scraping). The data model already stores a `source` per item, so it's a clean addition later.
- Premium maps/routing (Google) — swappable for the free OSM/Leaflet layer used today.
