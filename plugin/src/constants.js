/** Deployed Worker base URL (Step 2). */
const WORKER_BASE_URL = "https://withings-sync-auth.iyigun.workers.dev";

/** Optional hardcode; if empty, fetched from Worker GET /client-id on first Connect. */
const WITHINGS_CLIENT_ID = "";

const WITHINGS_AUTHORIZE_URL =
  "https://account.withings.com/oauth2_user/authorize2";
const WITHINGS_SCOPE = "user.metrics";
const WITHINGS_REDIRECT_URI = `${WORKER_BASE_URL}/callback`;
const PROTOCOL_ACTION = "withings-sync/auth";

/** Pending OAuth state lifetime. */
const STATE_TTL_MS = 10 * 60 * 1000;

/** Refresh access token this long before expiry. */
const TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000;

module.exports = {
  WORKER_BASE_URL,
  WITHINGS_CLIENT_ID,
  WITHINGS_AUTHORIZE_URL,
  WITHINGS_SCOPE,
  WITHINGS_REDIRECT_URI,
  PROTOCOL_ACTION,
  STATE_TTL_MS,
  TOKEN_REFRESH_SKEW_MS,
};
