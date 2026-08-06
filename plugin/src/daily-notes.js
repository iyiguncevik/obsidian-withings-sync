const { moment } = require("obsidian");

/**
 * Core Daily Notes plugin instance (internal API).
 *
 * @param {import('obsidian').App} app
 */
function getDailyNotesInstance(app) {
  return app.internalPlugins?.getEnabledPluginById("daily-notes") ?? null;
}

/**
 * @param {import('obsidian').App} app
 */
function assertDailyNotesEnabled(app) {
  const instance = getDailyNotesInstance(app);
  if (!instance) {
    throw new Error("Core Daily Notes is not enabled.");
  }
  return instance;
}

/**
 * @param {import('obsidian').App} app
 * @param {string} dayKey YYYY-MM-DD
 */
async function resolveDailyNote(app, dayKey) {
  const dailyNotes = assertDailyNotesEnabled(app);
  const date = moment(dayKey, "YYYY-MM-DD", true);
  if (!date.isValid()) {
    throw new Error(`Invalid daily note date: ${dayKey}`);
  }

  let file = dailyNotes.getDailyNote(date);
  if (!file) {
    file = await dailyNotes.createDailyNote(date);
  }

  if (!file) {
    throw new Error(`Could not create daily note for ${dayKey}.`);
  }

  return file;
}

/**
 * @param {import('obsidian').App} app
 * @param {import('obsidian').TFile} file
 * @param {Record<string, number>} patch
 */
async function writeFrontmatterPatch(app, file, patch) {
  if (Object.keys(patch).length === 0) {
    return;
  }

  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    for (const [key, value] of Object.entries(patch)) {
      frontmatter[key] = value;
    }
  });
}

function startOfTodayUnix() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Math.floor(start.getTime() / 1000);
}

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

module.exports = {
  getDailyNotesInstance,
  assertDailyNotesEnabled,
  resolveDailyNote,
  writeFrontmatterPatch,
  startOfTodayUnix,
  nowUnix,
};
