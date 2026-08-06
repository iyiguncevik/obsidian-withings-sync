const { decodeMeasuresFromGroup } = require("./measures");
const { formatMeasureForFrontmatter, DEFAULT_NUMBER_LOCALE } = require("./locale-format");

/**
 * Calendar day for measure groups uses the local timezone of the runtime
 * (Node in tests/CI, Obsidian desktop in sync).
 *
 * @param {number} unixSeconds
 */
function calendarDayKey(unixSeconds) {
  const date = new Date(unixSeconds * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * @param {Array<{ date: number }>} measuregrps
 * @returns {Map<string, { date: number; measures?: Array<{ value: number; type: number; unit: number }> }>}
 */
function groupMeasureGrpsLatestPerDay(measuregrps) {
  /** @type {Map<string, { date: number; measures?: Array<{ value: number; type: number; unit: number }> }>} */
  const byDay = new Map();

  for (const group of measuregrps) {
    const day = calendarDayKey(group.date);
    const existing = byDay.get(day);
    if (!existing || group.date > existing.date) {
      byDay.set(day, group);
    }
  }

  return byDay;
}

/**
 * @param {{ measures?: Array<{ value: number; type: number; unit: number }> }} group
 * @param {Array<{ type: number; enabled: boolean; property: string }>} measurementSettings
 * @param {"kg"|"lb"} [unit]
 * @param {string} [numberLocale]
 */
function buildFrontmatterPatch(
  group,
  measurementSettings,
  unit = "kg",
  numberLocale = DEFAULT_NUMBER_LOCALE,
) {
  const decoded = decodeMeasuresFromGroup(group);
  /** @type {Record<string, number | string>} */
  const patch = {};

  for (const setting of measurementSettings) {
    if (!setting.enabled) {
      continue;
    }
    if (!decoded.has(setting.type)) {
      continue;
    }
    patch[setting.property] = formatMeasureForFrontmatter(
      setting.type,
      decoded.get(setting.type),
      unit,
      numberLocale,
    );
  }

  return patch;
}

module.exports = {
  calendarDayKey,
  groupMeasureGrpsLatestPerDay,
  buildFrontmatterPatch,
};
