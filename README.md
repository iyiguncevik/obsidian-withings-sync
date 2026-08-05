# Withings Sync

Desktop Obsidian plugin that connects to your Withings account and syncs scale measurements into **core Daily Notes** frontmatter.

**Status:** Step 1 scaffold — plugin and worker packages are buildable; no OAuth, sync, or vault integration yet.

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

## Worker

```bash
cd worker
npm install
npx wrangler dev   # local dev (health check only in Step 1)
```

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
