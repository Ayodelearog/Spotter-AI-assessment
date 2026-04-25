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

## Django structure explained

If Django is new to you, these are the important files:

- `backend/route_planner/settings.py`
  This is the backend configuration file. It tells Django which apps are enabled and what middleware should run on every request.

- `backend/route_planner/urls.py`
  This is the top-level URL router. It sends `/api/...` requests into the planner app.

- `backend/planner/views.py`
  This is the HTTP layer. It receives the POST request from React and returns JSON.

- `backend/planner/services.py`
  This is the core business logic. It geocodes locations, fetches the route, applies HOS assumptions, and builds the log-sheet data.

- `backend/planner/tests.py`
  These are lightweight backend tests around the log-sheet calculations.

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
`
```bash
npm run build
```

## Notes

- The backend has city fallbacks for a few sample locations so the demo still works if geocoding is temporarily unavailable.
- For real deployment, the frontend can go on Vercel and the Django backend can go on Render, Railway, or another Python host.
