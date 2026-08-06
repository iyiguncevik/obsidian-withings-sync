const MAX_BACKFILL_DAYS = 365;
const MAX_CHUNK_DAYS = 90;

/**
 * @param {string} dateStr YYYY-MM-DD
 */
function parseCalendarDate(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * @param {Date} date
 */
function formatCalendarDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayCalendarDate() {
  return formatCalendarDate(new Date());
}

/**
 * Inclusive day count between two valid calendar dates.
 * @param {Date} from
 * @param {Date} to
 */
function inclusiveDaySpan(from, to) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay) + 1;
}

/**
 * @param {string} fromStr
 * @param {string} toStr
 * @param {string} [todayStr]
 */
function validateBackfillRange(fromStr, toStr, todayStr = todayCalendarDate()) {
  const from = parseCalendarDate(fromStr);
  const to = parseCalendarDate(toStr);
  const today = parseCalendarDate(todayStr);

  if (!from || !to) {
    return { ok: false, error: "invalid_date" };
  }

  if (from.getTime() > to.getTime()) {
    return { ok: false, error: "from_after_to" };
  }

  if (today && to.getTime() > today.getTime()) {
    return { ok: false, error: "to_in_future" };
  }

  if (inclusiveDaySpan(from, to) > MAX_BACKFILL_DAYS) {
    return { ok: false, error: "range_too_long" };
  }

  return { ok: true };
}

/**
 * @param {Date} date
 * @param {number} days
 */
function addCalendarDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * @param {string} fromStr
 * @param {string} toStr
 * @param {number} [maxChunkDays]
 */
function chunkBackfillRange(fromStr, toStr, maxChunkDays = MAX_CHUNK_DAYS) {
  const from = parseCalendarDate(fromStr);
  const to = parseCalendarDate(toStr);
  if (!from || !to || from.getTime() > to.getTime()) {
    return [];
  }

  /** @type {Array<{ from: string; to: string }>} */
  const chunks = [];
  let cursor = from;

  while (cursor.getTime() <= to.getTime()) {
    const chunkEnd = addCalendarDays(cursor, maxChunkDays - 1);
    const end = chunkEnd.getTime() > to.getTime() ? to : chunkEnd;
    chunks.push({
      from: formatCalendarDate(cursor),
      to: formatCalendarDate(end),
    });
    cursor = addCalendarDays(end, 1);
  }

  return chunks;
}

module.exports = {
  MAX_BACKFILL_DAYS,
  MAX_CHUNK_DAYS,
  parseCalendarDate,
  formatCalendarDate,
  todayCalendarDate,
  inclusiveDaySpan,
  validateBackfillRange,
  chunkBackfillRange,
};
