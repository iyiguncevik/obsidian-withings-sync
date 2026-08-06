const { Notice } = require("obsidian");
const { isConnected, loadAuthData } = require("./auth-data");
const { loadSettings, saveSettings, validateSyncSettings } = require("./plugin-settings");
const { getEnabledMeasurementSettings } = require("./measures");
const { fetchAllMeasureGroups } = require("./withings-api");
const { groupMeasureGrpsLatestPerDay } = require("./sync");
const { assertDailyNotesEnabled } = require("./daily-notes");
const {
  validateBackfillRange,
  chunkBackfillRange,
  calendarDayStartUnix,
  calendarDayEndUnix,
  isCalendarDayInRange,
} = require("./backfill");
const {
  tryBeginOperation,
  endOperation,
  reportSyncError,
  writeMeasureGroupsToDailyNotes,
} = require("./sync-run");
const { logInfo, logWarn, formatUnixTimestamp } = require("./log");

/** @typedef {import('./main.js').WithingsSyncPlugin} WithingsSyncPlugin */

/**
 * @param {WithingsSyncPlugin} plugin
 * @param {string} fromStr
 * @param {string} toStr
 */
async function runBackfill(plugin, fromStr, toStr) {
  const validation = validateBackfillRange(fromStr, toStr);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  if (!tryBeginOperation()) {
    reportSyncError("sync or backfill is already running.");
    return { ok: false, error: "already_running" };
  }

  try {
    const auth = await loadAuthData(plugin);
    if (!isConnected(auth)) {
      reportSyncError("connect your account first.");
      return { ok: false, error: "not_connected" };
    }

    const settings = await loadSettings(plugin);
    const validationError = validateSyncSettings(settings);
    if (validationError) {
      reportSyncError(validationError);
      return { ok: false, error: "settings_invalid" };
    }

    const enabled = getEnabledMeasurementSettings(settings.measurements);
    if (enabled.length === 0) {
      reportSyncError("enable at least one measurement in settings.");
      return { ok: false, error: "no_measures" };
    }

    try {
      assertDailyNotesEnabled(plugin.app);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Core Daily Notes is not enabled.";
      reportSyncError(message, err);
      return { ok: false, error: "daily_notes" };
    }

    const meastypes = enabled.map((entry) => entry.type).join(",");
    const chunks = chunkBackfillRange(fromStr, toStr);
    let daysUpdated = 0;
    let daysSkippedEmptyPatch = 0;
    let measureGroupCount = 0;

    logInfo("Backfill started", {
      from: fromStr,
      to: toStr,
      chunkCount: chunks.length,
      meastypes,
      numberLocale: settings.numberLocale,
      unit: settings.unit,
    });

    for (const [index, chunk] of chunks.entries()) {
      const startdate = calendarDayStartUnix(chunk.from);
      const enddate = calendarDayEndUnix(chunk.to);

      logInfo("Backfill chunk fetch", {
        chunk: index + 1,
        of: chunks.length,
        from: chunk.from,
        to: chunk.to,
        startdate: formatUnixTimestamp(startdate),
        enddate: formatUnixTimestamp(enddate),
      });

      const { measuregrps } = await fetchAllMeasureGroups(plugin, {
        meastypes,
        startdate,
        enddate,
      });

      measureGroupCount += measuregrps.length;

      const byDay = groupMeasureGrpsLatestPerDay(measuregrps);
      /** @type {Map<string, object>} */
      const inRange = new Map();

      for (const [dayKey, group] of byDay.entries()) {
        if (isCalendarDayInRange(dayKey, fromStr, toStr)) {
          inRange.set(dayKey, group);
        }
      }

      logInfo("Backfill chunk fetched", {
        chunk: index + 1,
        measureGroupCount: measuregrps.length,
        calendarDayCount: inRange.size,
      });

      if (measuregrps.length === 0) {
        logWarn("No measure groups returned for backfill chunk", {
          from: chunk.from,
          to: chunk.to,
        });
      }

      const writeStats = await writeMeasureGroupsToDailyNotes(
        plugin,
        inRange,
        settings,
        "backfill",
      );

      daysUpdated += writeStats.daysUpdated;
      daysSkippedEmptyPatch += writeStats.daysSkippedEmptyPatch;
    }

    settings.lastSyncedAt = Date.now();
    await saveSettings(plugin, settings);
    plugin.settings = settings;
    plugin.refreshConnectionUI();

    logInfo("Backfill finished", {
      from: fromStr,
      to: toStr,
      daysUpdated,
      daysSkippedEmptyPatch,
      measureGroupCount,
    });

    if (measureGroupCount === 0) {
      new Notice(
        "Withings Sync: Backfill complete — no measurements found in this date range.",
      );
    } else {
      new Notice(
        `Withings Sync: Backfill complete — ${daysUpdated} day(s) updated.`,
      );
    }
    return { ok: true, daysUpdated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backfill failed.";
    reportSyncError(message, err);
    return { ok: false, error: "fetch_failed" };
  } finally {
    endOperation();
  }
}

module.exports = {
  runBackfill,
};
