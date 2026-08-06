const { Modal, Setting } = require("obsidian");
const {
  validateBackfillRange,
  formatBackfillValidationError,
  MAX_BACKFILL_DAYS,
  MAX_CHUNK_DAYS,
  todayCalendarDate,
} = require("./backfill");
const { isConnected, loadAuthData } = require("./auth-data");
const { runBackfill } = require("./backfill-run");

/** @typedef {import('./main.js').WithingsSyncPlugin} WithingsSyncPlugin */

class BackfillModal extends Modal {
  /** @param {WithingsSyncPlugin} plugin */
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.fromValue = "";
    this.toValue = "";
    this.running = false;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Backfill date range" });
    contentEl.createEl("p", {
      text: `Choose a date range (maximum ${MAX_BACKFILL_DAYS} days inclusive). Data is fetched in ${MAX_CHUNK_DAYS}-day chunks and does not advance the incremental sync cursor.`,
      cls: "setting-item-description",
    });

    this.errorEl = contentEl.createEl("p", { cls: "mod-warning" });
    this.errorEl.hide();

    const today = todayCalendarDate();

    new Setting(contentEl)
      .setName("From")
      .addText((text) => {
        text.inputEl.type = "date";
        text.inputEl.max = today;
        text.onChange((value) => {
          this.fromValue = value;
          this.clearError();
        });
      });

    new Setting(contentEl)
      .setName("To")
      .addText((text) => {
        text.inputEl.type = "date";
        text.inputEl.max = today;
        text.onChange((value) => {
          this.toValue = value;
          this.clearError();
        });
      });

    new Setting(contentEl)
      .addButton((button) => {
        button.setButtonText("Cancel");
        button.onClick(() => this.close());
      })
      .addButton((button) => {
        this.confirmBtn = button;
        button.setButtonText("Backfill");
        button.setCta();
        button.onClick(() => {
          void this.onConfirm();
        });
      });
  }

  clearError() {
    this.errorEl.setText("");
    this.errorEl.hide();
  }

  /**
   * @param {string} message
   */
  showError(message) {
    this.errorEl.setText(message);
    this.errorEl.show();
  }

  async onConfirm() {
    if (this.running) {
      return;
    }

    const auth = await loadAuthData(this.plugin);
    if (!isConnected(auth)) {
      this.showError("Connect your Withings account first.");
      return;
    }

    const validation = validateBackfillRange(this.fromValue, this.toValue);
    if (!validation.ok) {
      this.showError(formatBackfillValidationError(validation.error));
      return;
    }

    this.running = true;
    this.confirmBtn.setDisabled(true);

    const result = await runBackfill(
      this.plugin,
      this.fromValue,
      this.toValue,
    );

    this.running = false;
    this.confirmBtn.setDisabled(false);

    if (result.ok) {
      this.close();
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

/** @param {WithingsSyncPlugin} plugin */
function openBackfillModal(plugin) {
  new BackfillModal(plugin).open();
}

module.exports = {
  BackfillModal,
  openBackfillModal,
};
