.PHONY: build test install-vault test-vault

build:
	cp manifest.json plugin/manifest.json
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

test-vault: build
	$(MAKE) build
	mkdir -p .test-vault/.obsidian/plugins/withings-sync
	mkdir -p .test-vault/Daily\ Notes
	cp plugin/main.js plugin/manifest.json plugin/styles.css .test-vault/.obsidian/plugins/withings-sync/
	printf '%s\n' '{' '  "communityPluginEnabled": true' '}' > .test-vault/.obsidian/app.json
	printf '%s\n' '{' '  "file-explorer": true,' '  "global-search": true,' '  "switcher": true,' '  "graph": true,' '  "backlink": true,' '  "outgoing-link": true,' '  "tag-pane": true,' '  "page-preview": true,' '  "daily-notes": true,' '  "templates": true,' '  "note-composer": true,' '  "command-palette": true,' '  "editor-status": true,' '  "bookmarks": true,' '  "outline": true,' '  "word-count": true,' '  "properties": true' '}' > .test-vault/.obsidian/core-plugins.json
	printf '%s\n' '{' '  "format": "YYYY-MM-DD",' '  "folder": "Daily Notes",' '  "template": ""' '}' > .test-vault/.obsidian/daily-notes.json
	printf '%s\n' '[' '  "withings-sync"' ']' > .test-vault/.obsidian/community-plugins.json
	@echo "Test vault ready at ./.test-vault/"
	@echo "Open in Obsidian: File → Open folder as vault → .test-vault/"
	@echo "Daily Notes and Withings Sync are pre-enabled; turn off Restricted mode if prompted."
