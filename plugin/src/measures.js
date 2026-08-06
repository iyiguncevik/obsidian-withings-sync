/** v1 measurement catalog (type ids from Withings API). */
const MEASUREMENT_CATALOG = [
  { type: 1, key: "weight", defaultProperty: "weight", defaultEnabled: true },
  {
    type: 5,
    key: "fat_free_mass",
    defaultProperty: "fat_free_mass",
    defaultEnabled: false,
  },
  { type: 6, key: "fat_ratio", defaultProperty: "fat_ratio", defaultEnabled: false },
  { type: 8, key: "fat_mass", defaultProperty: "fat_mass", defaultEnabled: false },
  {
    type: 76,
    key: "muscle_mass",
    defaultProperty: "muscle_mass",
    defaultEnabled: false,
  },
  { type: 77, key: "hydration", defaultProperty: "hydration", defaultEnabled: false },
  { type: 88, key: "bone_mass", defaultProperty: "bone_mass", defaultEnabled: false },
  {
    type: 11,
    key: "heart_rate",
    defaultProperty: "heart_rate",
    defaultEnabled: false,
  },
];

/** Mass meastypes converted when unit is lb (API values are always kg). */
const MASS_MEASURE_TYPES = new Set([1, 5, 8, 76, 77, 88]);

/**
 * @param {number} value
 * @param {number} unit
 */
function decodeMeasure(value, unit) {
  return value * 10 ** unit;
}

/**
 * @param {{ measures?: Array<{ value: number; type: number; unit: number }> }} group
 * @returns {Map<number, number>}
 */
function decodeMeasuresFromGroup(group) {
  /** @type {Map<number, number>} */
  const decoded = new Map();
  for (const measure of group.measures ?? []) {
    decoded.set(measure.type, decodeMeasure(measure.value, measure.unit));
  }
  return decoded;
}

function getDefaultMeasurementSettings() {
  return MEASUREMENT_CATALOG.map((entry) => ({
    type: entry.type,
    enabled: entry.defaultEnabled,
    property: entry.defaultProperty,
  }));
}

/**
 * @param {Array<{ type: number; enabled: boolean; property: string }>} settings
 */
function getEnabledMeasurementSettings(settings) {
  return settings.filter((entry) => entry.enabled);
}

/**
 * @param {Array<{ type: number; enabled: boolean; property: string }>} measurements
 */
function validateMeasurementSettings(measurements) {
  /** @type {Set<string>} */
  const seen = new Set();

  for (const entry of measurements) {
    const property = String(entry.property ?? "").trim();
    if (!entry.enabled) {
      continue;
    }
    if (!property) {
      return "Enabled measurements need a property name.";
    }
    if (seen.has(property)) {
      return `Duplicate property name: ${property}`;
    }
    seen.add(property);
  }

  return null;
}

/**
 * @param {number} type
 */
function isMassMeasureType(type) {
  return MASS_MEASURE_TYPES.has(type);
}

module.exports = {
  MEASUREMENT_CATALOG,
  MASS_MEASURE_TYPES,
  decodeMeasure,
  decodeMeasuresFromGroup,
  getDefaultMeasurementSettings,
  getEnabledMeasurementSettings,
  validateMeasurementSettings,
  isMassMeasureType,
};
