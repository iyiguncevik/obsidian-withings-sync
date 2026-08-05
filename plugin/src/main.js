const { Plugin } = require("obsidian");

module.exports = class WithingsSyncPlugin extends Plugin {
  async onload() {
    console.log("Withings Sync: loaded");
  }

  onunload() {
    console.log("Withings Sync: unloaded");
  }
};
