const { test } = require("node:test");
const assert = require("node:assert/strict");
const fixture = require("./fixtures/getmeas-sample.json");
const {
  validateBackfillRange,
  chunkBackfillRange,
  inclusiveDaySpan,
  parseCalendarDate,
} = require("../src/backfill");

test("validateBackfillRange accepts ordered in-range dates", () => {
  const result = validateBackfillRange("2024-01-01", "2024-01-31", "2024-02-01");
  assert.equal(result.ok, true);
});

test("validateBackfillRange rejects from after to", () => {
  const result = validateBackfillRange("2024-02-01", "2024-01-01", "2024-03-01");
  assert.equal(result.ok, false);
  assert.equal(result.error, "from_after_to");
});

test("validateBackfillRange rejects future to date", () => {
  const result = validateBackfillRange("2024-01-01", "2024-03-01", "2024-02-01");
  assert.equal(result.ok, false);
  assert.equal(result.error, "to_in_future");
});

test("validateBackfillRange rejects spans over 365 days", () => {
  const result = validateBackfillRange("2023-01-01", "2024-01-01", "2024-06-01");
  assert.equal(result.ok, false);
  assert.equal(result.error, "range_too_long");
});

test("validateBackfillRange rejects invalid calendar dates", () => {
  const result = validateBackfillRange("2024-02-30", "2024-03-01", "2024-06-01");
  assert.equal(result.ok, false);
  assert.equal(result.error, "invalid_date");
});

test("chunkBackfillRange splits into contiguous 90-day windows", () => {
  const chunks = chunkBackfillRange("2024-01-01", "2024-06-01");
  assert.equal(chunks.length, 2);
  assert.deepEqual(chunks[0], { from: "2024-01-01", to: "2024-03-30" });
  assert.deepEqual(chunks[1], { from: "2024-03-31", to: "2024-06-01" });
  assert.equal(inclusiveDaySpan(parseCalendarDate(chunks[0].from), parseCalendarDate(chunks[0].to)), 90);
});

test("chunkBackfillRange returns single chunk for short ranges", () => {
  const chunks = chunkBackfillRange("2024-01-01", "2024-01-15");
  assert.deepEqual(chunks, [{ from: "2024-01-01", to: "2024-01-15" }]);
});
