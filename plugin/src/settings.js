const { PluginSettingTab, Setting } = require("obsidian");
const { connect, disconnect, isConnected, loadAuthData } = require("./auth");
const { openBackfillModal } = require("./backfill-modal");
const { runSync } = require("./sync-run");
const {
  MEASUREMENT_CATALOG,
  formatLastSynced,
  loadSettings,
  normalizeSyncIntervalMinutes,
} = require("./plugin-settings");
const { LOCALE_OPTIONS } = require("./locale-format");

/** @typedef {import('./main.js').WithingsSyncPlugin} WithingsSyncPlugin */

/**
 * @param {object} auth
 * @param {object} settings
 */
function buildConnectionDescription(auth, settings) {
  const parts = [];
  parts.push(isConnected(auth) ? "Connected." : "Not connected.");
  parts.push(`Last synced: ${formatLastSynced(settings.lastSyncedAt)}.`);
  if (auth.lastError) {
    parts.push(`Last error: ${auth.lastError}`);
  }
  return parts.join(" ");
}

/**
 * @param {HTMLElement} el
 */
function getScrollParent(el) {
  let node = el.parentElement;
  while (node) {
    if (node.scrollHeight > node.clientHeight) {
      const style = window.getComputedStyle(node);
      if (style.overflowY === "auto" || style.overflowY === "scroll") {
        return node;
      }
    }
    node = node.parentElement;
  }
  return null;
}

class WithingsSyncSettingTab extends PluginSettingTab {
  /** @param {WithingsSyncPlugin} plugin */
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
    /** @type {Setting | null} */
    this.connectionSetting = null;
    /** @type {import('obsidian').ButtonComponent | null} */
    this.connectionButton = null;
    /** @type {import('obsidian').ButtonComponent | null} */
    this.syncNowButton = null;
    /** @type {import('obsidian').ButtonComponent | null} */
    this.backfillButton = null;
  }

  /**
   * @param {boolean} connected
   */
  setConnectionButton(connected) {
    if (!this.connectionButton) {
      return;
    }

    if (connected) {
      this.connectionButton.setButtonText("Disconnect");
      this.connectionButton.onClick(() => {
        void disconnect(this.plugin);
      });
    } else {
      this.connectionButton.setButtonText("Connect");
      this.connectionButton.onClick(() => {
        void connect(this.plugin);
      });
    }
  }

  /**
   * @param {boolean} connected
   */
  setSyncButtonsEnabled(connected) {
    this.syncNowButton?.setDisabled(!connected);
    this.backfillButton?.setDisabled(!connected);
  }

  async updateConnectionHeader() {
    if (!this.connectionSetting) {
      return;
    }

    const auth = await loadAuthData(this.plugin);
    const settings = await loadSettings(this.plugin);
    const connected = isConnected(auth);

    this.connectionSetting.setDesc(buildConnectionDescription(auth, settings));
    this.setConnectionButton(connected);
    this.setSyncButtonsEnabled(connected);
  }

  async display() {
    const { containerEl } = this;
    const scrollEl = getScrollParent(containerEl) ?? containerEl.parentElement;
    const scrollTop = scrollEl?.scrollTop ?? 0;

    containerEl.empty();
    this.connectionSetting = null;
    this.connectionButton = null;
    this.syncNowButton = null;
    this.backfillButton = null;

    const auth = await loadAuthData(this.plugin);
    const settings = await loadSettings(this.plugin);
    const connected = isConnected(auth);

    this.connectionSetting = new Setting(containerEl)
      .setName("Connection")
      .setDesc(buildConnectionDescription(auth, settings))
      .addButton((button) => {
        this.connectionButton = button;
        this.setConnectionButton(connected);
      });

    containerEl.createEl("h3", { text: "Options" });

    new Setting(containerEl)
      .setName("Unit")
      .setDesc("Mass measurements are stored in this unit.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("kg", "kg")
          .addOption("lb", "lb")
          .setValue(settings.unit)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ unit: value });
          });
      });

    new Setting(containerEl)
      .setName("Number locale")
      .setDesc("Decimal separator used when writing values to Daily Notes frontmatter.")
      .addDropdown((dropdown) => {
        for (const option of LOCALE_OPTIONS) {
          dropdown.addOption(option.value, option.label);
        }
        dropdown.setValue(settings.numberLocale).onChange(async (value) => {
          await this.plugin.updateSettings({ numberLocale: value });
        });
      });

    new Setting(containerEl)
      .setName("Sync on startup")
      .setDesc("Run sync when Obsidian loads.")
      .addToggle((toggle) => {
        toggle.setValue(settings.syncOnStartup);
        toggle.onChange(async (value) => {
          await this.plugin.updateSettings({ syncOnStartup: value });
        });
      });

    new Setting(containerEl)
      .setName("Sync interval (minutes)")
      .setDesc("Automatic sync interval. Use 0 to disable (minimum 10).")
      .addText((text) => {
        text.setValue(String(settings.syncIntervalMinutes));
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.onChange(async (value) => {
          await this.plugin.updateSettings({
            syncIntervalMinutes: normalizeSyncIntervalMinutes(value),
          });
        });
      });

    new Setting(containerEl)
      .setName("Sync")
      .setDesc(
        "Sync now re-fetches recent measurements. Backfill imports a custom date range (up to 365 days).",
      )
      .addButton((button) => {
        this.syncNowButton = button;
        button.setButtonText("Sync now");
        button.setDisabled(!connected);
        button.onClick(() => {
          void runSync(this.plugin, "manual");
        });
      })
      .addButton((button) => {
        this.backfillButton = button;
        button.setButtonText("Backfill…");
        button.setDisabled(!connected);
        button.onClick(() => {
          openBackfillModal(this.plugin);
        });
      });

    new Setting(containerEl)
      .setName("Lookback days")
      .setDesc(
        "Manual Sync now re-fetches this many days and overwrites frontmatter. Automatic sync uses this window only before the first successful sync.",
      )
      .addText((text) => {
        text.setValue(String(settings.lookbackDays));
        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.onChange(async (value) => {
          await this.plugin.updateSettings({
            lookbackDays: Number(value),
          });
        });
      });

    containerEl.createEl("h3", { text: "Measurements" });

    for (const catalogEntry of MEASUREMENT_CATALOG) {
      const measurement = settings.measurements.find(
        (entry) => entry.type === catalogEntry.type,
      );
      if (!measurement) {
        continue;
      }

      new Setting(containerEl)
        .setName(catalogEntry.key.replace(/_/g, " "))
        .addToggle((toggle) => {
          toggle.setValue(measurement.enabled);
          toggle.onChange(async (value) => {
            measurement.enabled = value;
            await this.plugin.updateSettings({
              measurements: settings.measurements,
            });
          });
        })
        .addText((text) => {
          text
            .setPlaceholder("frontmatter property")
            .setValue(measurement.property);
          text.onChange(async (value) => {
            measurement.property = value;
          });
          text.inputEl.addEventListener("blur", () => {
            void this.plugin.updateSettings({
              measurements: settings.measurements,
            });
          });
        });
    }

    if (scrollEl) {
      requestAnimationFrame(() => {
        scrollEl.scrollTop = scrollTop;
      });
    }
  }
}

module.exports = { WithingsSyncSettingTab, buildConnectionDescription };
