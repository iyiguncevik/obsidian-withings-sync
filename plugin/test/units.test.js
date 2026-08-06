const { test } = require("node:test");
const assert = require("node:assert/strict");
const { convertMassForUnit, formatMeasureValue } = require("../src/units");

test("convertMassForUnit keeps kg to 2 decimals", () => {
  assert.equal(convertMassForUnit(75.123, "kg"), 75.12);
});

test("convertMassForUnit converts kg to lb with 1 decimal", () => {
  assert.equal(convertMassForUnit(75, "lb"), 165.3);
});

test("formatMeasureValue leaves fat ratio and heart rate non-mass rules", () => {
  assert.equal(formatMeasureValue(6, 18.46, "lb"), 18.5);
  assert.equal(formatMeasureValue(11, 72.4, "kg"), 72);
});
