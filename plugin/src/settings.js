const { PluginSettingTab, Setting } = require("obsidian");
const { connect, disconnect, isConnected, loadAuthData } = require("./auth");
const {
  MEASUREMENT_CATALOG,
  formatLastSynced,
  loadSettings,
  normalizeSyncIntervalMinutes,
} = require("./plugin-settings");

/** @typedef {import('./main.js').WithingsSyncPlugin} WithingsSyncPlugin */

class WithingsSyncSettingTab extends PluginSettingTab {
  /** @param {WithingsSyncPlugin} plugin */
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  async display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Withings Sync" });

    const auth = await loadAuthData(this.plugin);
    const settings = await loadSettings(this.plugin);
    const connected = isConnected(auth);

    new Setting(containerEl).setName("Connection").setDesc(
      connected
        ? `Connected (user ${auth.userid || "unknown"}).`
        : "Not connected.",
    );

    if (auth.lastError) {
      new Setting(containerEl)
        .setName("Last error")
        .setDesc(auth.lastError)
        .setDisabled(true);
    }

    new Setting(containerEl)
      .setName("Connect")
      .setDesc("Open Withings in your browser to authorize this plugin.")
      .addButton((button) => {
        button.setButtonText("Connect");
        button.setDisabled(connected);
        button.onClick(() => {
          void connect(this.plugin);
        });
      });

    new Setting(containerEl)
      .setName("Disconnect")
      .setDesc("Remove stored Withings tokens from this vault.")
      .addButton((button) => {
        button.setButtonText("Disconnect");
        button.setDisabled(!connected);
        button.onClick(() => {
          void disconnect(this.plugin);
        });
      });

    new Setting(containerEl)
      .setName("Last synced")
      .setDesc(formatLastSynced(settings.lastSyncedAt))
      .setDisabled(true);

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
        .setDesc(`Withings meastype ${catalogEntry.type}`)
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

    containerEl.createEl("h3", { text: "Sync" });

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
      .setName("Lookback days")
      .setDesc("Sync now fetches this many days of history.")
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
  }
}

module.exports = { WithingsSyncSettingTab };
