const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  formatNumberForFrontmatter,
  formatMeasureForFrontmatter,
  decimalSeparatorForLocale,
} = require("../src/locale-format");

test("formatNumberForFrontmatter uses dot decimals for en-US numbers", () => {
  assert.equal(formatNumberForFrontmatter(87.15, "en-US", 2, 2), 87.15);
});

test("formatNumberForFrontmatter uses comma decimals for tr-TR strings", () => {
  assert.equal(formatNumberForFrontmatter(87.15, "tr-TR", 2, 2), "87,15");
});

test("formatNumberForFrontmatter avoids grouping separators", () => {
  assert.equal(formatNumberForFrontmatter(1234.5, "de-DE", 1, 1), "1234,5");
});

test("formatMeasureForFrontmatter applies measure precision rules", () => {
  assert.equal(formatMeasureForFrontmatter(1, 87.154, "kg", "tr-TR"), "87,15");
  assert.equal(formatMeasureForFrontmatter(11, 72.4, "kg", "tr-TR"), "72");
});

test("decimalSeparatorForLocale reflects locale conventions", () => {
  assert.equal(decimalSeparatorForLocale("en-US"), ".");
  assert.equal(decimalSeparatorForLocale("tr-TR"), ",");
});
