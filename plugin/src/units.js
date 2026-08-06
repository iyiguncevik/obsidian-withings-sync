const { isMassMeasureType } = require("./measures");

const KG_TO_LB = 2.2046226218;

/**
 * @param {number} value
 * @param {number} decimals
 */
function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * @param {number} kgValue decoded kg from Withings
 * @param {"kg"|"lb"} unit
 */
function convertMassForUnit(kgValue, unit) {
  if (unit === "lb") {
    return roundTo(kgValue * KG_TO_LB, 1);
  }
  return roundTo(kgValue, 2);
}

/**
 * @param {number} type
 * @param {number} decodedValue kg or raw unit from API decode
 * @param {"kg"|"lb"} unit
 */
function formatMeasureValue(type, decodedValue, unit) {
  if (isMassMeasureType(type)) {
    return convertMassForUnit(decodedValue, unit);
  }
  if (type === 6) {
    return roundTo(decodedValue, 1);
  }
  if (type === 11) {
    return Math.round(decodedValue);
  }
  return decodedValue;
}

module.exports = {
  KG_TO_LB,
  roundTo,
  convertMassForUnit,
  formatMeasureValue,
};
