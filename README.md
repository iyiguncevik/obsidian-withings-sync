# Withings Sync

Desktop Obsidian plugin that connects to your Withings account and syncs scale measurements into **core Daily Notes** frontmatter.

**Status:** Step 3 — plugin Connect/Disconnect implemented; measurement sync is Step 5.

## Repository layout

```text
plugin/   Obsidian plugin (esbuild)
worker/   Cloudflare Worker OAuth bridge (wrangler)
```

## Plugin

```bash
cd plugin
npm install
npm run build      # production build → main.js
npm test           # placeholder tests (real tests in Step 4)
```

### Sideload for development

```bash
make build
make test-vault    # or OBSIDIAN_VAULT=/path/to/vault make install-vault
```

In Obsidian: enable **Community plugins**, turn off Restricted mode, enable **Withings Sync**, then run **Connect Withings account** from the command palette or plugin settings.

CI runs `npm test` and `npm run build` in `plugin/` on every push/PR to `master`.

## Worker

OAuth bridge routes:

| Route | Method | Purpose |
| ----- | ------ | ------- |
| `/health` | GET | Uptime check (`ok`) |
| `/callback` | GET | Withings OAuth redirect; exchanges code; redirects to `obsidian://withings-sync/auth?...` |
| `/callback` | HEAD | Withings redirect URI verification probe (returns 200) |
| `/refresh` | POST | JSON `{ "refresh_token": "..." }` → `{ access_token, refresh_token, expires_in }` |
| `/client-id` | GET | Public Withings Client ID (used by plugin if not hardcoded) |

### Required configuration

Set these in Cloudflare (never commit values):

| Name | Type | Description |
| ---- | ---- | ----------- |
| `WITHINGS_CLIENT_ID` | secret | Withings Public API Client ID |
| `WITHINGS_CLIENT_SECRET` | secret | Withings Public API Client Secret |
| `WITHINGS_REDIRECT_URI` | secret or var | Must match the Withings developer app exactly, e.g. `https://withings-sync-auth.<account>.workers.dev/callback` |

### Local development

```bash
cd worker
cp .dev.vars.example .dev.vars   # fill in your credentials
npm install
npm run dev                      # http://localhost:8787
```

For local OAuth testing, register `http://localhost:8787/callback` as an additional redirect URI in the Withings developer dashboard (or use the deployed Worker URL for callback testing).

### Deploy

```bash
cd worker
wrangler login
wrangler secret put WITHINGS_CLIENT_ID
wrangler secret put WITHINGS_CLIENT_SECRET
wrangler secret put WITHINGS_REDIRECT_URI
npm run deploy
```

After deploy:

1. Note the Worker base URL (e.g. `https://withings-sync-auth.<account>.workers.dev`).
2. In the Withings developer dashboard, set the application **redirect URI** to `{WORKER_BASE_URL}/callback`.
3. Save the Worker base URL and public Client ID for Step 3 (plugin hardcoded constants).

Structured logs use JSON (`event`, `withingsStatus`, etc.) and never include tokens or authorization codes. Wire Cloudflare Workers Observability → Grafana Cloud OTLP for logs/traces.

## Makefile

From the repo root:

```bash
make build         # build the plugin
make test          # run plugin tests
make test-vault    # create ./.test-vault/ with Daily Notes enabled
OBSIDIAN_VAULT=/path/to/vault make install-vault   # copy build into a vault
```

Open the test vault in Obsidian: **File → Open folder as vault** → select `.test-vault/` in this repo.

## Author

iyiguncevik
