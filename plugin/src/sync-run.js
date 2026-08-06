const { Notice } = require("obsidian");
const { isConnected } = require("./auth-data");
const { loadAuthData } = require("./auth-data");
const { loadSettings, saveSettings, validateSyncSettings } = require("./plugin-settings");
const { getEnabledMeasurementSettings } = require("./measures");
const { fetchAllMeasureGroups } = require("./withings-api");
const {
  groupMeasureGrpsLatestPerDay,
  buildFrontmatterPatch,
} = require("./sync");
const {
  resolveDailyNote,
  writeFrontmatterPatch,
} = require("./daily-notes");
const { nowUnix } = require("./time");
const { logInfo, logWarn, logError, formatUnixTimestamp } = require("./log");
const { buildSyncFetchQuery } = require("./sync-fetch");

/** @typedef {import('./main.js').WithingsSyncPlugin} WithingsSyncPlugin */

/** @type {boolean} */
let syncInProgress = false;

/**
 * @returns {boolean}
 */
function tryBeginOperation() {
  if (syncInProgress) {
    return false;
  }
  syncInProgress = true;
  return true;
}

function endOperation() {
  syncInProgress = false;
}

/**
 * @param {string} message
 * @param {unknown} [err]
 */
function reportSyncError(message, err) {
  logError(message, err);
  new Notice(`Withings Sync: ${message}`);
}

/**
 * @param {WithingsSyncPlugin} plugin
 * @param {Map<string, object>} byDay
 * @param {object} settings
 * @param {"manual"|"automatic"|"backfill"} context
 */
async function writeMeasureGroupsToDailyNotes(plugin, byDay, settings, context) {
  let daysUpdated = 0;
  let daysSkippedEmptyPatch = 0;

  for (const [dayKey, group] of byDay.entries()) {
    const patch = buildFrontmatterPatch(
      group,
      settings.measurements,
      settings.unit,
      settings.numberLocale,
    );

    if (Object.keys(patch).length === 0) {
      daysSkippedEmptyPatch += 1;
      logInfo("Skipped day — no enabled measurements in latest group", {
        context,
        day: dayKey,
        groupId: group.grpid,
      });
      continue;
    }

    const file = await resolveDailyNote(plugin.app, dayKey);
    await writeFrontmatterPatch(plugin.app, file, patch);
    daysUpdated += 1;

    logInfo("Updated daily note frontmatter", {
      context,
      day: dayKey,
      file: file.path,
      properties: patch,
    });
  }

  return {
    daysUpdated,
    daysSkippedEmptyPatch,
  };
}

/**
 * @param {WithingsSyncPlugin} plugin
 * @param {"manual"|"automatic"} mode
 */
async function runSync(plugin, mode) {
  if (!tryBeginOperation()) {
    logInfo("Sync skipped — another sync or backfill is already running");
    return;
  }

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
    const fetchQuery = buildSyncFetchQuery(settings, mode);

    logInfo("Sync started", {
      mode,
      fetchStrategy: fetchQuery.strategy,
      meastypes,
      lookbackDays: settings.lookbackDays,
      startdate:
        fetchQuery.startdate != null
          ? formatUnixTimestamp(fetchQuery.startdate)
          : null,
      enddate:
        fetchQuery.enddate != null ? formatUnixTimestamp(fetchQuery.enddate) : null,
      lastupdate:
        fetchQuery.lastupdate != null
          ? formatUnixTimestamp(fetchQuery.lastupdate)
          : null,
      numberLocale: settings.numberLocale,
      unit: settings.unit,
    });

    const { measuregrps, updatetime } = await fetchAllMeasureGroups(plugin, {
      meastypes,
      startdate: fetchQuery.startdate,
      enddate: fetchQuery.enddate,
      lastupdate: fetchQuery.lastupdate,
    });

    const byDay = groupMeasureGrpsLatestPerDay(measuregrps);

    logInfo("Fetched measure groups from Withings", {
      mode,
      fetchStrategy: fetchQuery.strategy,
      measureGroupCount: measuregrps.length,
      calendarDayCount: byDay.size,
      withingsUpdatetime:
        updatetime > 0 ? formatUnixTimestamp(updatetime) : null,
    });

    if (measuregrps.length === 0) {
      logWarn("No measure groups returned for this sync", {
        mode,
        fetchStrategy: fetchQuery.strategy,
      });

      if (
        mode === "automatic" &&
        fetchQuery.strategy === "initial-lookback"
      ) {
        new Notice(
          `Withings Sync: No measurements found in the last ${settings.lookbackDays} day(s). Use Backfill for older data.`,
        );
      }
    }

    const writeStats = await writeMeasureGroupsToDailyNotes(
      plugin,
      byDay,
      settings,
      mode,
    );

    settings.lastSyncedAt = Date.now();
    if (updatetime > 0) {
      settings.lastupdate = updatetime;
    }
    await saveSettings(plugin, settings);
    plugin.settings = settings;
    plugin.refreshConnectionUI();

    logInfo("Sync finished", {
      mode,
      fetchStrategy: fetchQuery.strategy,
      daysUpdated: writeStats.daysUpdated,
      daysSkippedEmptyPatch: writeStats.daysSkippedEmptyPatch,
      lastupdate:
        settings.lastupdate > 0
          ? formatUnixTimestamp(settings.lastupdate)
          : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    reportSyncError(message, err);
  } finally {
    endOperation();
  }
}

module.exports = {
  runSync,
  tryBeginOperation,
  endOperation,
  reportSyncError,
  writeMeasureGroupsToDailyNotes,
};
