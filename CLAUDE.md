# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CeliacAI** (formerly Gluten-Free Finder) is a full-stack app that helps people with celiac disease and dietary conditions find safe places to eat. It is evolving into a multi-condition allergy travel companion.

- **Frontend:** React 19 + Vite, Leaflet maps, GA4 — lives in `frontend/`
- **Backend:** Flask (Python 3.13), Google Places API, Google Gemini 1.5 Flash, Supabase — lives in `backend/`
- **Database:** Supabase (PostgreSQL) with a custom RPC function `find_nearby_searches` for proximity queries

**In progress:** A new marketing landing page (`LandingPage` screen) is being added as the app's entry point. Waitlist sign-ups are stored in **Airtable** (not Supabase). Users land on the landing page first; existing map/search functionality is reached via a CTA.

## Commands

### Frontend (run from `frontend/`)
```bash
npm run dev        # Dev server with HMR (Vite)
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

### Backend (run from `backend/`)
```bash
python app.py                   # Dev server on port 5007
gunicorn app:app                # Production (as in Procfile)
```

### Backend dependencies
```bash
pip install -r requirements.txt   # Root-level requirements.txt
```

## Environment Variables

**Frontend** (`frontend/.env`):
- `VITE_BACKEND_URL` — Flask backend URL (defaults to `http://localhost:5007`)
- `VITE_GA_MEASUREMENT_ID` — Google Analytics 4 measurement ID

**Backend** (`backend/.env`):
- `GEMINI_API_KEY` — Google Gemini API key
- `GOOGLE_PLACES_API_KEY` — Google Places API key
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_KEY` — Supabase service key

All four backend vars are required at startup — the app raises `ValueError` if any are missing.

## Architecture

### Frontend data flow

`App.jsx` owns top-level state: `currentView` (`'live'` | `'city'`), `userPosition`, and `isAppLoading`. On mount it races `Promise.all([minimumTimer(2s), navigator.geolocation])` — both must resolve before the loading screen clears.

- **`MapScreen`** — GPS-based search. Manages its own fetch state, filter selection, map markers, and the expandable list panel. Uses an `AbortController` ref to cancel in-flight requests on unmount or filter change.
- **`CitySearchScreen`** — City-name search. Geocodes the city via `/find-city-coordinates`, then fetches places via `/get-restaurants` with a `city` param. Same AbortController pattern.
- Both screens contain their own `PlaceDetailCard`, `FilterButtons`, and `ListViewPanel` sub-components defined inline in the same file — not extracted to `components/`.
- `components/` holds `LoadingScreen`, `Header`, `Navigation`, `SearchForm`, `EstablishmentCard`, `ResultsList`, `AdvisoryNote` — these are supporting UI pieces, not screen-level containers.

### Backend request pipeline

Every search hits `GET /get-restaurants?lat&lon&type&city`:

1. **City cache** — fuzzy `ILIKE` match on `city_name` in `search_live`, max 30 days old
2. **GPS proximity cache** — Supabase RPC `find_nearby_searches(lat, lon, type, 500m radius)`
3. **Cache miss** → Google Places API (NearbySearch for GPS, TextSearch for city) → up to 2 pages, deduped by `place_id`
4. **Gemini categorization** — sends place names + types to Gemini 1.5 Flash, receives JSON mapping `place_id → gf_status` (`"Dedicated GF"` | `"Offers GF"` | `"Status Unclear"`)
5. Filter out `"Status Unclear"`, sort (Dedicated GF first, then by distance), return
6. **Async Supabase save** — results saved in a background `threading.Thread` (non-blocking)

Other endpoints:
- `GET /find-city-coordinates?city=` — wraps Google Places `findplacefromtext`
- `POST /submit-feedback` — inserts into Supabase `feedback` table

### Caching behaviour

The `search_live` Supabase table stores `latitude`, `longitude`, `search_type`, `results` (JSON), and optionally `city_name`. City lookups use `ILIKE '%city%'` with a 30-day TTL. GPS lookups use the `find_nearby_searches` Postgres RPC which does a 500m radius check. Cache is checked on every request; misses trigger fresh API calls and a background save.

### Distance calculation

Haversine formula is implemented twice — `backend/find_places.py:calculate_distance` (Python, used for sorting) and `frontend/src/utils/distance.js:calculateDistance` (JS, used for display). Both take `(lat1, lon1, lat2, lon2)` / `({lat,lng}, {lat,lng})` and return km.

### Gemini integration

`find_places.py:categorize_places_with_gemini` posts to the REST endpoint directly (not via SDK). The response is plain text that may be markdown-wrapped JSON — a `re.search` strips the ` ```json ``` ` fences before `json.loads`. The prompt is inline in `find_places.py`; `prompts.py` contains an older unused prompt generator.

## Key constraints

- The Gemini response parser uses regex to strip markdown fences — if the model changes its output format, parsing will silently return `{}` and all places will default to `"Offers GF"`.
- The `search_live` table requires the `find_nearby_searches` Postgres RPC to exist in Supabase. If it's missing, the GPS cache check raises and falls through to a fresh API call.
- `fuzzywuzzy` (used for city matching in `app.py`) requires `python-Levenshtein` for speed; both are in `requirements.txt`.
