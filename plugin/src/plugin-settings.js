const {
  getDefaultMeasurementSettings,
  MEASUREMENT_CATALOG,
  validateMeasurementSettings,
} = require("./measures");
const { readStoredData } = require("./auth-data");

/** @typedef {import('./main.js').WithingsSyncPlugin} WithingsSyncPlugin */

const SETTINGS_FIELDS = [
  "measurements",
  "unit",
  "syncOnStartup",
  "syncIntervalMinutes",
  "lookbackDays",
  "lastupdate",
  "lastSyncedAt",
];

const DEFAULT_SETTINGS = {
  measurements: getDefaultMeasurementSettings(),
  unit: "kg",
  syncOnStartup: true,
  syncIntervalMinutes: 60,
  lookbackDays: 7,
  lastupdate: 0,
  lastSyncedAt: 0,
};

/**
 * @param {Record<string, unknown>} stored
 */
function pickSettingsFields(stored) {
  /** @type {Record<string, unknown>} */
  const settings = {};
  for (const key of SETTINGS_FIELDS) {
    if (stored[key] !== undefined) {
      settings[key] = stored[key];
    }
  }
  return settings;
}

/**
 * @param {WithingsSyncPlugin} plugin
 */
async function loadSettings(plugin) {
  const stored = await readStoredData(plugin);
  const settings = {
    ...DEFAULT_SETTINGS,
    ...pickSettingsFields(stored),
  };

  if (!Array.isArray(settings.measurements)) {
    settings.measurements = getDefaultMeasurementSettings();
  }

  return settings;
}

/**
 * @param {WithingsSyncPlugin} plugin
 * @param {object} settings
 */
async function saveSettings(plugin, settings) {
  const stored = await readStoredData(plugin);
  await plugin.saveData({
    ...stored,
    ...pickSettingsFields(settings),
  });
}

/**
 * @param {number} minutes
 */
function normalizeSyncIntervalMinutes(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value === 0) {
    return 0;
  }
  return Math.max(10, Math.round(value));
}

/**
 * @param {object} settings
 */
function validateSyncSettings(settings) {
  const measurementError = validateMeasurementSettings(settings.measurements);
  if (measurementError) {
    return measurementError;
  }

  if (settings.unit !== "kg" && settings.unit !== "lb") {
    return "Unit must be kg or lb.";
  }

  const lookback = Number(settings.lookbackDays);
  if (!Number.isFinite(lookback) || lookback < 1) {
    return "Lookback days must be at least 1.";
  }

  const interval = Number(settings.syncIntervalMinutes);
  if (!Number.isFinite(interval) || (interval !== 0 && interval < 10)) {
    return "Sync interval must be 0 (off) or at least 10 minutes.";
  }

  return null;
}

/**
 * @param {number} [timestampMs]
 */
function formatLastSynced(timestampMs) {
  if (!timestampMs) {
    return "Never";
  }
  return new Date(timestampMs).toLocaleString();
}

module.exports = {
  DEFAULT_SETTINGS,
  SETTINGS_FIELDS,
  loadSettings,
  saveSettings,
  normalizeSyncIntervalMinutes,
  validateSyncSettings,
  formatLastSynced,
  MEASUREMENT_CATALOG,
};
