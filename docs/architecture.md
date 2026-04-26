# Architecture

## System overview

```mermaid
flowchart LR
    User([User<br/>browser])

    subgraph Frontend["Frontend · React + Vite (Vercel)"]
        TripForm[TripForm.jsx]
        Api[lib/api.js]
        TripResults[TripResults.jsx]
        MapPanel[MapPanel.jsx]
        DigitalLog[DigitalLogSheet.jsx]
    end

    subgraph Backend["Backend · Django REST Framework (Render)"]
        URLs[urls.py<br/>routing]
        View[views.py<br/>PlanTripView]
        Service[services.py<br/>TripPlanner]
    end

    subgraph External["External services (no auth, free tier)"]
        Nominatim[(Nominatim<br/>geocode + reverse)]
        OSRM[(OSRM<br/>routing)]
    end

    User -->|fills form| TripForm
    TripForm -->|planTrip JSON| Api
    Api -->|POST /api/plan-trip/| URLs
    URLs --> View
    View --> Service
    Service -->|search + reverse| Nominatim
    Service -->|driving route| OSRM
    Service -->|JSON payload| View
    View -->|200 OK + JSON| Api
    Api --> TripResults
    TripResults --> MapPanel
    TripResults --> DigitalLog
```

## Request lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as React (Vercel)
    participant BE as Django (Render)
    participant N as Nominatim
    participant O as OSRM

    U->>FE: Submit TripForm (current, pickup, dropoff, cycle hrs)
    FE->>BE: POST /api/plan-trip/
    BE->>BE: PlanTripView.post()
    BE->>BE: TripPlanner(...).plan()

    par Geocode 3 anchors
        BE->>N: GET /search?q=current
        N-->>BE: {lat,lng,label}
        BE->>N: GET /search?q=pickup
        N-->>BE: {lat,lng,label}
        BE->>N: GET /search?q=dropoff
        N-->>BE: {lat,lng,label}
    end

    BE->>O: GET /route current→pickup
    O-->>BE: distance, duration, polyline
    BE->>O: GET /route pickup→dropoff
    O-->>BE: distance, duration, polyline

    Note over BE: HOS engine walks each leg<br/>(11h drive, 14h window, breaks,<br/>fuel, 10h reset, 34h restart)

    loop Each duty-status change
        BE->>N: GET /reverse?lat&lon
        N-->>BE: City, ST (cached after first hit)
    end

    BE->>BE: Build per-day log sheets +<br/>remarkEvents + summary + stops
    BE-->>FE: JSON {summary, map, stops, logSheets, assumptions}

    FE->>FE: Render metric cards
    FE->>FE: MapPanel draws polyline + markers
    FE->>FE: DigitalLogSheet × N (one per day)
    U->>FE: (optional) Click Download PNG
    FE->>U: Saves driver-log-YYYY-MM-DD.png
```

## Response payload shape

```text
{
  summary: {
    totalMiles, totalDrivingHours, totalTripHours,
    route: [{label, value}, ...]
  },
  map: {
    center: {lat, lng},
    routePolyline: [{lat, lng}, ...],
    markers: [{title, location, ...}, ...]
  },
  stops:    [{title, location, timestamp, ...}],
  logSheets: [
    {
      date, displayDate,
      segments:    [{status, label, startHour, endHour, hours, miles}],
      remarkEvents:[{hour, location, label}],
      totals:      {offDuty, sleeper, driving, onDuty},
      header:      {month, day, year, fromLocation, toLocation, ...},
      remarks:     [string]
    }
  ],
  assumptions: [string]
}
```

## What lives where

| Layer | File | Responsibility |
|---|---|---|
| Frontend entry | `frontend/src/main.jsx` | Mounts React |
| App shell | `frontend/src/App.jsx` | Form → loading → results state |
| API client | `frontend/src/lib/api.js` | Single `planTrip()` fetch wrapper, base URL via `VITE_API_BASE_URL` |
| Form | `frontend/src/components/TripForm.jsx` | Inputs + submit |
| Output | `frontend/src/components/TripResults.jsx` | Metric cards, dispatch summary, log sheets grid |
| Map | `frontend/src/components/MapPanel.jsx` | Leaflet polyline + stop markers |
| Log render | `frontend/src/components/DigitalLogSheet.jsx` | Native SVG FMCSA log + PNG export |
| URL routing | `backend/route_planner/urls.py` + `backend/planner/urls.py` | `POST /api/plan-trip/` |
| HTTP layer | `backend/planner/views.py` | DRF `APIView` adapter |
| Domain logic | `backend/planner/services.py` | Geocoding, routing, HOS engine, log-sheet builder |
| Tests | `backend/planner/tests.py` | Backend unit tests |

## Why stateless

- No database. Every plan is recomputed from inputs.
- Trade-off: simpler deploy, no migrations, no auth — at the cost of no history and no shareable trip URLs. Both would be a small Django model away if needed.
