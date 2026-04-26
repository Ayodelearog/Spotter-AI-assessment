# Spotter AI Full-Stack Assessment

This project is a React frontend plus a Django backend for planning a trucking trip under basic FMCSA Hours of Service assumptions.

The app accepts:

- Current location
- Pickup location
- Dropoff location
- Current cycle used in hours

The app returns:

- A route map
- Planned stops for breaks, fuel, resets, pickup, and dropoff
- One or more daily paper-log style sheets

## Stack

- Frontend: React, Vite, Material UI, Leaflet
- Backend: Django
- External services: Nominatim for geocoding, OSRM for routing

## Backend layout

- `backend/route_planner/settings.py` — project configuration: installed apps and the middleware chain applied to every request.
- `backend/route_planner/urls.py` — top-level URL router; forwards `/api/...` traffic into the planner app.
- `backend/planner/views.py` — HTTP layer; accepts the POST from the frontend and returns JSON.
- `backend/planner/services.py` — core domain logic: geocoding, routing, HOS scheduling, and log-sheet rendering.
- `backend/planner/tests.py` — backend tests covering the log-sheet calculations.

## Assumptions implemented

- Property-carrying driver
- 70-hour / 8-day cycle
- 11-hour driving limit
- 14-hour on-duty window
- 30-minute break after 8 cumulative driving hours
- Fuel stop every 1,000 miles
- 1 hour for pickup
- 1 hour for dropoff
- Automatic 34-hour restart if cycle hours are exhausted

## Local development

### 1. Backend

```bash
cd backend
../.venv/bin/python manage.py runserver
```

Backend runs at `http://127.0.0.1:8000`.

### 2. Frontend

```bash
npm run dev
```

Frontend runs at `http://127.0.0.1:5173`.

The frontend expects the backend API at `http://127.0.0.1:8000/api` by default.

## Verification

Backend checks:

```bash
cd backend
../.venv/bin/python manage.py check
../.venv/bin/python manage.py test
```

Frontend build:

```bash
npm run build
```

## Architecture and deployment

- [docs/architecture.md](docs/architecture.md) — system diagram, request lifecycle, response shape, and a file-by-file map.
- [docs/deployment.md](docs/deployment.md) — step-by-step Vercel (frontend) + Render (backend) deploy guide.

## Notes

- The backend has city fallbacks for a few sample locations so the demo still works if geocoding is temporarily unavailable.
- Production config is environment-driven: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, and `CORS_ALLOWED_ORIGINS` all read from the environment with safe local-dev defaults.
