# Withings Sync

Sync your Withings scale measurements into Obsidian **Daily Notes** —
automatically, in the background, with your preferred units and formatting.

## Features

- **Daily Notes integration** — weight and body composition land in the right
  daily note’s frontmatter
- **Latest reading per day** — if you weigh in multiple times, only the most
  recent value for that day is kept
- **Pick what to track** — enable the measurements you care about and rename
  the frontmatter fields to match your vault
- **Set it and forget it** — optional sync on startup and on a schedule; manual
  **Sync now** when you want a refresh
- **Fill in the past** — **Backfill** any date range (up to one year) for
  history before you started using the plugin
- **Your units, your locale** — kg or lb, and decimal formatting that fits your
  notes (e.g. `87,15` or `87.15`)

**Desktop only.** Requires Obsidian’s core **Daily Notes** plugin.

## Install

Requirements:

- Obsidian desktop (Windows, macOS, or Linux)
- Core **Daily Notes** enabled in your vault
- A Withings account with scale data
- Internet access to Withings and the author OAuth Worker

### From Community Plugins

1. Settings → **Community plugins** → turn off Restricted mode if needed.
2. Browse → search **Withings Sync** → Install → Enable.

### From GitHub Release

1. Open [Releases](https://github.com/iyiguncevik/obsidian-withings-sync/releases) and download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. In your vault, create `.obsidian/plugins/withings-sync/` if it does not exist.
3. Copy the three files into that folder.
4. Settings → **Community plugins** → turn off Restricted mode if needed → enable **Withings Sync**.

### From source (Makefile)

```bash
git clone https://github.com/iyiguncevik/obsidian-withings-sync.git
cd obsidian-withings-sync
make build
OBSIDIAN_VAULT=/path/to/vault make install-vault
```

For a throwaway test vault with Daily Notes pre-enabled:

```bash
make test-vault
```

Then in Obsidian: **File → Open folder as vault** → `.test-vault/` in this repo.

## Quick start

1. Open **Settings → Withings Sync**.
2. Click **Connect** and complete Withings login in the browser.
3. Approve opening Obsidian when the browser redirects (`obsidian://withings-sync/auth?...`).
4. Enable the measurements you want and adjust property names if needed.
5. Use **Sync now** in settings or the command palette, or wait for startup/interval sync.

## Settings overview

| Area             | What it does                                                                    |
| ---------------- | ------------------------------------------------------------------------------- |
| **Connection**   | Connect / Disconnect; shows last synced time                                    |
| **Options**      | Unit, number locale, startup sync, interval, Sync now + Backfill, lookback days |
| **Measurements** | Enable/disable each type; rename frontmatter property                           |

### Sync behavior

| Trigger                                    | Fetch strategy                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| **Startup / interval** (after first sync)  | Incremental — measurements since last sync                              |
| **Startup / interval** (before first sync) | Lookback window (default **7 days**); notifies if empty                 |
| **Sync now** (manual)                      | Full lookback window; overwrites frontmatter for those days             |
| **Backfill**                               | User-chosen date range (max **365** days, fetched in **90**-day chunks) |

Backfill updates **last synced** but does **not** advance the incremental sync cursor.

Automatic sync with no new data is silent. Empty first-time lookback and empty
backfill show a Notice.

Minimum sync interval: **10 minutes**, or **0** to disable interval sync.

## Commands

- Connect Withings account
- Disconnect
- Sync now
- Backfill date range…

## Troubleshooting

| Problem                             | What to try                                                               |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Connect does not return to Obsidian | Confirm Obsidian is the handler for `obsidian://` links on your OS        |
| Sync fails immediately              | Enable core Daily Notes; connect account; enable at least one measurement |
| No data on first sync               | Weigh-in may be outside lookback — use **Backfill** for older dates       |
| Values use wrong decimal separator  | Set **Number locale** in settings, then run **Sync now**                  |
| DevTools detail                     | **Ctrl+Shift+I** → Console → filter `Withings Sync`                       |

## Privacy and data flow

```text
You → Obsidian plugin (vault-local token storage)
Plugin → Withings API (getmeas with your access token)
Plugin → Author Worker (OAuth code exchange + token refresh only)
Worker → Withings token endpoint (holds Client Secret)
```

**Stored in your vault** (plugin data): OAuth access/refresh tokens, sync
settings, last sync timestamps.

**Not stored on the Worker**: your tokens are exchanged in transit only; the
Worker does not proxy measurements or keep a user database.

**Not sent to third parties** beyond Withings and the author Worker required
for OAuth and API calls.

**Brief exposure**: tokens appear in the `obsidian://withings-sync/auth?...`
URL during Connect (browser → Obsidian handoff). Do not share that URL or
screen recordings of it.

Worker logs are structured JSON without tokens or authorization codes. See
[docs/WORKER.md](docs/WORKER.md) for maintainer observability notes.
