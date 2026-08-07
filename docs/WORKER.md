# Worker (maintainer)

The Cloudflare Worker holds the Withings **Client Secret** and performs OAuth
code exchange and token refresh. End users of the plugin never configure the
Worker.

## Routes

| Route        | Method | Purpose                                                                                   |
| ------------ | ------ | ----------------------------------------------------------------------------------------- |
| `/health`    | GET    | Uptime check (`ok`)                                                                       |
| `/callback`  | GET    | Withings OAuth redirect; exchanges code; redirects to `obsidian://withings-sync/auth?...` |
| `/callback`  | HEAD   | Withings redirect URI verification probe (returns 200)                                    |
| `/refresh`   | POST   | JSON `{ "refresh_token": "..." }` → `{ access_token, refresh_token, expires_in }`         |
| `/client-id` | GET    | Public Withings Client ID (optional; plugin may hardcode Client ID)                       |

## Required secrets

Set in Cloudflare (never commit values):

| Name                     | Description                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `WITHINGS_CLIENT_ID`     | Withings Public API Client ID                                                                                   |
| `WITHINGS_CLIENT_SECRET` | Withings Public API Client Secret                                                                               |
| `WITHINGS_REDIRECT_URI`  | Must match the Withings developer app exactly, e.g. `https://withings-sync-auth.<account>.workers.dev/callback` |

## Local development

```bash
cd worker
cp .dev.vars.example .dev.vars   # fill in credentials
npm install
npm run dev                      # http://localhost:8787
```

For local OAuth testing, register `http://localhost:8787/callback` as an
additional redirect URI in the Withings developer dashboard, or use the
deployed Worker URL.

## Deploy

```bash
cd worker
wrangler login
wrangler secret put WITHINGS_CLIENT_ID
wrangler secret put WITHINGS_CLIENT_SECRET
wrangler secret put WITHINGS_REDIRECT_URI
npm run deploy
```

After deploy:

1. Note the Worker base URL (e.g.
   `https://withings-sync-auth.<account>.workers.dev`).
2. In the Withings developer dashboard, set the application **redirect URI** to
   `{WORKER_BASE_URL}/callback`.
3. Ensure `plugin/src/constants.js` `WORKER_BASE_URL` matches the deployed URL
   before cutting a plugin release.

Structured logs use JSON (`event`, `withingsStatus`, etc.) and never include
tokens or authorization codes. Optional: Cloudflare Workers Observability →
Grafana Cloud OTLP for logs/traces.
