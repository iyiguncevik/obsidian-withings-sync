const { isMassMeasureType } = require("./measures");
const { formatMeasureValue } = require("./units");

/** @typedef {{ value: string; label: string }} LocaleOption */

/** @type {LocaleOption[]} */
const LOCALE_OPTIONS = [
  { value: "en-US", label: "English (US) — 87.15" },
  { value: "en-GB", label: "English (UK) — 87.15" },
  { value: "tr-TR", label: "Turkish — 87,15" },
  { value: "de-DE", label: "German — 87,15" },
  { value: "fr-FR", label: "French — 87,15" },
  { value: "es-ES", label: "Spanish — 87,15" },
  { value: "it-IT", label: "Italian — 87,15" },
  { value: "nl-NL", label: "Dutch — 87,15" },
  { value: "pt-PT", label: "Portuguese — 87,15" },
  { value: "sv-SE", label: "Swedish — 87,15" },
];

const DEFAULT_NUMBER_LOCALE = "en-US";

/**
 * @param {string} locale
 */
function isSupportedNumberLocale(locale) {
  return LOCALE_OPTIONS.some((option) => option.value === locale);
}

/**
 * @param {string} locale
 */
function decimalSeparatorForLocale(locale) {
  const formatter = new Intl.NumberFormat(locale, { useGrouping: false });
  const part = formatter.formatToParts(1.1).find((entry) => entry.type === "decimal");
  return part?.value ?? ".";
}

/**
 * @param {number} value
 * @param {string} locale
 * @param {number} minFractionDigits
 * @param {number} maxFractionDigits
 * @returns {number | string}
 */
function formatNumberForFrontmatter(
  value,
  locale,
  minFractionDigits,
  maxFractionDigits,
) {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
    useGrouping: false,
  });
  const formatted = formatter.format(value);

  if (decimalSeparatorForLocale(locale) === ",") {
    return formatted;
  }

  const parsed = Number(formatted);
  return Number.isFinite(parsed) ? parsed : formatted;
}

/**
 * @param {number} type
 * @param {"kg"|"lb"} unit
 */
function fractionDigitsForMeasureType(type, unit) {
  if (isMassMeasureType(type)) {
    return unit === "lb" ? { min: 1, max: 1 } : { min: 2, max: 2 };
  }
  if (type === 6) {
    return { min: 1, max: 1 };
  }
  if (type === 11) {
    return { min: 0, max: 0 };
  }
  return { min: 0, max: 2 };
}

/**
 * @param {number} type
 * @param {number} decodedValue
 * @param {"kg"|"lb"} unit
 * @param {string} [locale]
 * @returns {number | string}
 */
function formatMeasureForFrontmatter(type, decodedValue, unit, locale = DEFAULT_NUMBER_LOCALE) {
  const numericValue = formatMeasureValue(type, decodedValue, unit);
  const { min, max } = fractionDigitsForMeasureType(type, unit);
  return formatNumberForFrontmatter(numericValue, locale, min, max);
}

module.exports = {
  LOCALE_OPTIONS,
  DEFAULT_NUMBER_LOCALE,
  isSupportedNumberLocale,
  decimalSeparatorForLocale,
  formatNumberForFrontmatter,
  formatMeasureForFrontmatter,
  fractionDigitsForMeasureType,
};
