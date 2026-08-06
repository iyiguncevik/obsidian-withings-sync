const { PluginSettingTab, Setting } = require("obsidian");
const { connect, disconnect, isConnected, loadAuthData } = require("./auth");

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

    const data = await loadAuthData(this.plugin);
    const connected = isConnected(data);

    new Setting(containerEl).setName("Connection").setDesc(
      connected
        ? `Connected (user ${data.userid || "unknown"}).`
        : "Not connected.",
    );

    if (data.lastError) {
      new Setting(containerEl)
        .setName("Last error")
        .setDesc(data.lastError)
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
  }
}

module.exports = { WithingsSyncSettingTab };
