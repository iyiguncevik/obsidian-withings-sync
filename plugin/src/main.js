const { Plugin, Notice } = require("obsidian");
const { connect, disconnect, registerAuthProtocol, isConnected, loadAuthData } = require("./auth");
const { WithingsSyncSettingTab } = require("./settings");
const {
  loadSettings,
  saveSettings,
  validateSyncSettings,
  DEFAULT_SETTINGS,
} = require("./plugin-settings");
const { runSync } = require("./sync-run");

class WithingsSyncPlugin extends Plugin {
  async onload() {
    this.settings = { ...DEFAULT_SETTINGS, ...(await loadSettings(this)) };
    this.syncIntervalId = null;

    registerAuthProtocol(this);

    this.settingsTab = new WithingsSyncSettingTab(this);
    this.addSettingTab(this.settingsTab);

    this.addCommand({
      id: "connect",
      name: "Connect Withings account",
      callback: () => {
        void connect(this);
      },
    });

    this.addCommand({
      id: "disconnect",
      name: "Disconnect",
      callback: () => {
        void disconnect(this);
      },
    });

    this.addCommand({
      id: "sync-now",
      name: "Sync now",
      callback: () => {
        void runSync(this, "lookback");
      },
    });

    this.addCommand({
      id: "sync-today",
      name: "Sync today",
      callback: () => {
        void runSync(this, "today");
      },
    });

    this.restartSyncInterval();

    if (this.settings.syncOnStartup) {
      const auth = await loadAuthData(this);
      if (isConnected(auth)) {
        void runSync(this, "lookback");
      }
    }
  }

  onunload() {
    this.stopSyncInterval();
  }

  /**
   * @param {Partial<typeof DEFAULT_SETTINGS>} patch
   */
  async updateSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    const error = validateSyncSettings(this.settings);
    if (error) {
      new Notice(`Withings Sync: ${error}`);
      this.settings = await loadSettings(this);
      this.refreshSettingsDisplay();
      return false;
    }

    await saveSettings(this, this.settings);
    this.restartSyncInterval();
    this.refreshSettingsDisplay();
    return true;
  }

  restartSyncInterval() {
    this.stopSyncInterval();
    const minutes = this.settings.syncIntervalMinutes;
    if (!minutes || minutes < 10) {
      return;
    }

    this.syncIntervalId = window.setInterval(() => {
      void runSync(this, "lookback");
    }, minutes * 60 * 1000);
  }

  stopSyncInterval() {
    if (this.syncIntervalId != null) {
      window.clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  refreshSettingsDisplay() {
    this.settingsTab?.display();
  }
}

module.exports = WithingsSyncPlugin;
