const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSyncFetchQuery,
  hasPriorSync,
} = require("../src/sync-fetch");

test("hasPriorSync requires both lastSyncedAt and lastupdate", () => {
  assert.equal(hasPriorSync({ lastSyncedAt: 0, lastupdate: 0 }), false);
  assert.equal(hasPriorSync({ lastSyncedAt: 1000, lastupdate: 0 }), false);
  assert.equal(hasPriorSync({ lastSyncedAt: 0, lastupdate: 1000 }), false);
  assert.equal(hasPriorSync({ lastSyncedAt: 1000, lastupdate: 1000 }), true);
});

test("buildSyncFetchQuery uses lookback for manual sync", () => {
  const settings = { lookbackDays: 7, lastSyncedAt: 1000, lastupdate: 500 };
  const query = buildSyncFetchQuery(settings, "manual");

  assert.equal(query.strategy, "lookback");
  assert.ok(query.startdate);
  assert.ok(query.enddate);
  assert.equal(query.lastupdate, undefined);
});

test("buildSyncFetchQuery uses incremental sync after first successful sync", () => {
  const settings = { lookbackDays: 7, lastSyncedAt: 1000, lastupdate: 500 };
  const query = buildSyncFetchQuery(settings, "automatic");

  assert.equal(query.strategy, "incremental");
  assert.equal(query.lastupdate, 500);
  assert.equal(query.startdate, undefined);
  assert.equal(query.enddate, undefined);
});

test("buildSyncFetchQuery uses initial lookback before first sync", () => {
  const settings = { lookbackDays: 7, lastSyncedAt: 0, lastupdate: 0 };
  const query = buildSyncFetchQuery(settings, "automatic");

  assert.equal(query.strategy, "initial-lookback");
  assert.ok(query.startdate);
  assert.ok(query.enddate);
  assert.equal(query.lastupdate, undefined);
});
