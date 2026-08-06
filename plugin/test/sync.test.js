const { test } = require("node:test");
const assert = require("node:assert/strict");
const fixture = require("./fixtures/getmeas-sample.json");
const { getDefaultMeasurementSettings } = require("../src/measures");
const {
  calendarDayKey,
  groupMeasureGrpsLatestPerDay,
  buildFrontmatterPatch,
} = require("../src/sync");

test("calendarDayKey uses local timezone calendar date", () => {
  assert.equal(calendarDayKey(1705312800), "2024-01-15");
  assert.equal(calendarDayKey(1705399200), "2024-01-16");
});

test("groupMeasureGrpsLatestPerDay keeps latest group per day", () => {
  const groups = fixture.body.measuregrps;
  const byDay = groupMeasureGrpsLatestPerDay(groups);

  assert.equal(byDay.size, 2);
  assert.equal(byDay.get("2024-01-15").grpid, 1002);
  assert.equal(byDay.get("2024-01-16").grpid, 1003);
});

test("buildFrontmatterPatch maps enabled properties only", () => {
  const settings = getDefaultMeasurementSettings().map((entry) =>
    entry.type === 6
      ? { ...entry, enabled: true, property: "body_fat_pct" }
      : entry,
  );
  const latest = fixture.body.measuregrps[1];

  assert.deepEqual(buildFrontmatterPatch(latest, settings, "kg"), {
    weight: 71,
    body_fat_pct: 19,
  });
});

test("buildFrontmatterPatch converts mass fields to lb", () => {
  const settings = getDefaultMeasurementSettings();
  const latest = fixture.body.measuregrps[1];

  assert.deepEqual(buildFrontmatterPatch(latest, settings, "lb"), {
    weight: 156.5,
  });
});

test("buildFrontmatterPatch omits disabled and missing measures", () => {
  const settings = getDefaultMeasurementSettings();
  const dayTwo = fixture.body.measuregrps[2];
  const patch = buildFrontmatterPatch(dayTwo, settings, "kg");

  assert.deepEqual(patch, { weight: 70.5 });
  assert.equal(Object.hasOwn(patch, "heart_rate"), false);
});

test("buildFrontmatterPatch formats values for selected locale", () => {
  const settings = getDefaultMeasurementSettings();
  const dayTwo = fixture.body.measuregrps[2];

  assert.deepEqual(buildFrontmatterPatch(dayTwo, settings, "kg", "tr-TR"), {
    weight: "70,50",
  });
});
