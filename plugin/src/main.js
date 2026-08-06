const { Plugin } = require("obsidian");
const { connect, disconnect, registerAuthProtocol } = require("./auth");
const { WithingsSyncSettingTab } = require("./settings");

class WithingsSyncPlugin extends Plugin {
  async onload() {
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
  }

  onunload() {}

  refreshSettingsDisplay() {
    this.settingsTab?.display();
  }
}

module.exports = WithingsSyncPlugin;
