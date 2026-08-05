.PHONY: build test install-vault test-vault

build:
	cd plugin && npm run build

test:
	cd plugin && npm test

install-vault:
ifndef OBSIDIAN_VAULT
	$(error OBSIDIAN_VAULT is not set. Export the path to your Obsidian vault, e.g. OBSIDIAN_VAULT=/path/to/vault)
endif
	$(MAKE) build
	mkdir -p "$(OBSIDIAN_VAULT)/.obsidian/plugins/withings-sync"
	cp plugin/main.js plugin/manifest.json plugin/styles.css "$(OBSIDIAN_VAULT)/.obsidian/plugins/withings-sync/"

test-vault:
	$(MAKE) build
	mkdir -p .test-vault/.obsidian/plugins/withings-sync
	cp plugin/main.js plugin/manifest.json plugin/styles.css .test-vault/.obsidian/plugins/withings-sync/
	printf '%s\n' '{' '  "communityPluginEnabled": true' '}' > .test-vault/.obsidian/app.json
	printf '%s\n' '[' '  "file-explorer",' '  "global-search",' '  "switcher",' '  "graph",' '  "backlink",' '  "canvas",' '  "outgoing-link",' '  "tag-pane",' '  "page-preview",' '  "daily-notes",' '  "templates",' '  "note-composer",' '  "command-palette",' '  "editor-status",' '  "bookmarks",' '  "markdown-importer",' '  "zk-prefixer",' '  "random-note",' '  "outline",' '  "word-count",' '  "slides",' '  "audio-recorder",' '  "workspaces",' '  "file-recovery",' '  "publish",' '  "sync",' '  "webviewer"' ']' > .test-vault/.obsidian/core-plugins.json
	printf '%s\n' '{' '  "format": "YYYY-MM-DD",' '  "folder": "Daily Notes",' '  "template": ""' '}' > .test-vault/.obsidian/daily-notes.json
	printf '%s\n' '[]' > .test-vault/.obsidian/community-plugins.json
	@echo "Test vault created at ./.test-vault/"
	@echo "Open it in Obsidian: File → Open folder as vault → select .test-vault/"
