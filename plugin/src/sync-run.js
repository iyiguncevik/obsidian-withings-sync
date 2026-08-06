const { Notice } = require("obsidian");
const { isConnected } = require("./auth-data");
const { loadAuthData } = require("./auth-data");
const { loadSettings, saveSettings, validateSyncSettings } = require("./plugin-settings");
const { getEnabledMeasurementSettings } = require("./measures");
const { fetchAllMeasureGroups } = require("./withings-api");
const {
  groupMeasureGrpsLatestPerDay,
  buildFrontmatterPatch,
  calendarDayKey,
} = require("./sync");
const {
  resolveDailyNote,
  writeFrontmatterPatch,
  startOfTodayUnix,
  nowUnix,
} = require("./daily-notes");

/** @typedef {import('./main.js').WithingsSyncPlugin} WithingsSyncPlugin */

/** @type {boolean} */
let syncInProgress = false;

/**
 * @param {string} message
 * @param {unknown} [err]
 */
function reportSyncError(message, err) {
  if (err !== undefined) {
    console.error(`Withings Sync: ${message}`, err);
  } else {
    console.error(`Withings Sync: ${message}`);
  }
  new Notice(`Withings Sync: ${message}`);
}

/**
 * @param {WithingsSyncPlugin} plugin
 * @param {"lookback"|"today"} mode
 */
async function runSync(plugin, mode) {
  if (syncInProgress) {
    return;
  }

  syncInProgress = true;
  try {
    const auth = await loadAuthData(plugin);
    if (!isConnected(auth)) {
      reportSyncError("connect your account first.");
      return;
    }

    const settings = await loadSettings(plugin);
    const validationError = validateSyncSettings(settings);
    if (validationError) {
      reportSyncError(validationError);
      return;
    }

    const enabled = getEnabledMeasurementSettings(settings.measurements);
    if (enabled.length === 0) {
      reportSyncError("enable at least one measurement in settings.");
      return;
    }

    const meastypes = enabled.map((entry) => entry.type).join(",");
    const enddate = nowUnix();
    let startdate;

    if (mode === "today") {
      startdate = startOfTodayUnix();
    } else {
      const lookbackStart = enddate - settings.lookbackDays * 86400;
      startdate =
        settings.lastupdate > 0
          ? Math.max(lookbackStart, settings.lastupdate)
          : lookbackStart;
    }

    const { measuregrps, updatetime } = await fetchAllMeasureGroups(plugin, {
      meastypes,
      startdate,
      enddate,
    });

    const byDay = groupMeasureGrpsLatestPerDay(measuregrps);
    const todayKey = calendarDayKey(enddate);

    for (const [dayKey, group] of byDay.entries()) {
      if (mode === "today" && dayKey !== todayKey) {
        continue;
      }

      const patch = buildFrontmatterPatch(
        group,
        settings.measurements,
        settings.unit,
      );

      if (Object.keys(patch).length === 0) {
        continue;
      }

      const file = await resolveDailyNote(plugin.app, dayKey);
      await writeFrontmatterPatch(plugin.app, file, patch);
    }

    settings.lastSyncedAt = Date.now();
    if (updatetime > 0) {
      settings.lastupdate = updatetime;
    }
    await saveSettings(plugin, settings);
    plugin.settings = settings;
    plugin.refreshSettingsDisplay();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    reportSyncError(message, err);
  } finally {
    syncInProgress = false;
  }
}

module.exports = {
  runSync,
};
