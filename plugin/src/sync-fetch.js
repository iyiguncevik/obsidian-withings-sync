const { nowUnix } = require("./time");

/**
 * @param {object} settings
 */
function hasPriorSync(settings) {
  return settings.lastSyncedAt > 0 && settings.lastupdate > 0;
}

/**
 * @param {object} settings
 * @param {"manual"|"automatic"} mode
 */
function buildSyncFetchQuery(settings, mode) {
  const enddate = nowUnix();
  const lookbackStart = enddate - settings.lookbackDays * 86400;

  if (mode === "manual") {
    return {
      strategy: "lookback",
      startdate: lookbackStart,
      enddate,
    };
  }

  if (hasPriorSync(settings)) {
    return {
      strategy: "incremental",
      lastupdate: settings.lastupdate,
    };
  }

  return {
    strategy: "initial-lookback",
    startdate: lookbackStart,
    enddate,
  };
}

module.exports = {
  hasPriorSync,
  buildSyncFetchQuery,
};
