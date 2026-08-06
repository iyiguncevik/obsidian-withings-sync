const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  decodeMeasure,
  decodeMeasuresFromGroup,
  getDefaultMeasurementSettings,
  getEnabledMeasurementSettings,
} = require("../src/measures");

test("decodeMeasure applies Withings value * 10^unit", () => {
  assert.equal(decodeMeasure(7500, -2), 75);
  assert.equal(decodeMeasure(1850, -2), 18.5);
});

test("decodeMeasuresFromGroup maps types to decoded values", () => {
  const group = {
    measures: [
      { value: 7100, type: 1, unit: -2 },
      { value: 6200, type: 76, unit: -2 },
    ],
  };
  const decoded = decodeMeasuresFromGroup(group);
  assert.equal(decoded.get(1), 71);
  assert.equal(decoded.get(76), 62);
});

test("default catalog enables weight only", () => {
  const settings = getDefaultMeasurementSettings();
  const enabled = getEnabledMeasurementSettings(settings);
  assert.equal(enabled.length, 1);
  assert.equal(enabled[0].type, 1);
  assert.equal(enabled[0].property, "weight");
});
