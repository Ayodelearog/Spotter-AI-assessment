# Deployment

This project deploys cleanly as **Vercel (frontend) + Render (backend)**, both with generous free tiers and automatic deploys from GitHub.

The order matters: deploy the backend first so you have its URL, then deploy the frontend pointed at it, then come back and lock the backend's CORS to the frontend domain.

## Prerequisites

- Code is on GitHub (already done — `Ayodelearog/Spotter-AI-assessment`)
- Free accounts at:
  - [render.com](https://render.com) — sign in with GitHub
  - [vercel.com](https://vercel.com) — sign in with GitHub

## 1. Backend → Render

1. **Render Dashboard → New → Web Service**, connect your GitHub repo.
2. Configure:

   | Field | Value |
   |---|---|
   | Name | `spotter-trip-api` (anything; becomes the subdomain) |
   | Region | nearest to you |
   | Branch | `main` |
   | Root Directory | `backend` |
   | Runtime | `Python 3` |
   | Build Command | `pip install -r requirements.txt && python manage.py collectstatic --noinput` |
   | Start Command | `gunicorn route_planner.wsgi:application` |
   | Instance Type | Free |

3. **Environment variables** (Settings → Environment):

   | Key | Value |
   |---|---|
   | `DJANGO_SECRET_KEY` | a long random string — generate with `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
   | `DJANGO_DEBUG` | `False` |
   | `DJANGO_ALLOWED_HOSTS` | `<your-render-subdomain>.onrender.com` (e.g. `spotter-trip-api.onrender.com`) |
   | `CORS_ALLOWED_ORIGINS` | leave blank for now; we'll fill it after Vercel deploys |

4. **Deploy.** First build takes 2–4 min. When it's green, hit `https://<your-subdomain>.onrender.com/api/plan-trip/` in the browser — you should see DRF's "Method Not Allowed" page (it accepts only POST). That confirms the API is live.

> **Free-tier caveat:** Render free web services spin down after 15 minutes of inactivity. The first request after idle takes 30–60s to wake up. Fine for a take-home demo. Upgrade to the $7/mo Starter tier to keep it warm.

## 2. Frontend → Vercel

1. **Vercel Dashboard → New Project**, import your GitHub repo.
2. Configure:

   | Field | Value |
   |---|---|
   | Framework Preset | Vite |
   | Root Directory | (leave at repo root) |
   | Build Command | `npm run build` (auto) |
   | Output Directory | `dist` (auto) |

3. **Environment variables** → add:

   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://<your-render-subdomain>.onrender.com/api` |

4. **Deploy.** Vercel gives you a URL like `https://spotter-ai-assessment.vercel.app`.

## 3. Lock CORS

Now that you have the Vercel URL, go back to Render → your service → Environment, and set:

| Key | Value |
|---|---|
| `CORS_ALLOWED_ORIGINS` | `https://spotter-ai-assessment.vercel.app` (and any preview URL pattern you want to allow) |

Save → Render redeploys automatically. The backend now only accepts cross-origin requests from your Vercel domain.

## 4. Verify

- Open the Vercel URL.
- Submit a trip (e.g. Dallas, TX → Memphis, TN → Atlanta, GA).
- Watch DevTools Network tab — the POST should go to your Render URL and return `200 OK` with the JSON payload.
- The map and log sheets should render. PNG download should work.

## How auto-deploy works after this

- **Push to `main`** → Render rebuilds the backend, Vercel rebuilds the frontend. Both happen in parallel, both take 1–3 min.
- **Open a PR** → Vercel posts a preview URL on the PR; Render does not preview by default.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Frontend shows a network error on submit | `VITE_API_BASE_URL` wrong, or backend is sleeping (wait 60s and retry), or CORS blocks the request |
| `Disallowed Host` error from Django | `DJANGO_ALLOWED_HOSTS` doesn't include the Render subdomain |
| `400 Bad Request` on POST with HTML response | `DJANGO_DEBUG` is `True` and Django returned an HTML error page; check Render logs |
| First request after idle hangs | Render free tier spinning up; that's expected |
| Map tiles missing | Leaflet pulls tiles from openstreetmap.org directly; should always work |

## Alternatives

- **Backend**: Railway, Fly.io, Heroku, AWS App Runner, DigitalOcean App Platform — all support Django + gunicorn the same way. Render has the simplest free tier.
- **Frontend**: Netlify or Cloudflare Pages work identically; the only setting that matters is `VITE_API_BASE_URL`.
- **Single-host option**: serve the built frontend from Django's `staticfiles`. Simpler URL but slower (no CDN). Not worth it here.

## A note on the external services

Both Nominatim and OSRM are free, public, no-key services with rate limits ([Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/), max ~1 req/sec). For real production traffic, swap them for paid alternatives:

- Geocoding: Google Maps Geocoding, Mapbox, LocationIQ
- Routing: Mapbox Directions, HERE, Google Maps Routes
