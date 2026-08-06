const { Notice, requestUrl } = require("obsidian");
const {
  WORKER_BASE_URL,
  WITHINGS_CLIENT_ID,
  WITHINGS_AUTHORIZE_URL,
  WITHINGS_SCOPE,
  WITHINGS_REDIRECT_URI,
  PROTOCOL_ACTION,
  STATE_TTL_MS,
  TOKEN_REFRESH_SKEW_MS,
} = require("./constants");
const { isConnected, loadAuthData, saveAuthData } = require("./auth-data");

/** @typedef {import('./main.js').WithingsSyncPlugin} WithingsSyncPlugin */

/** @type {string} */
let cachedClientId = WITHINGS_CLIENT_ID;

/**
 * @param {WithingsSyncPlugin} plugin
 */
async function getClientId(plugin) {
  if (cachedClientId) {
    return cachedClientId;
  }

  const response = await requestUrl({
    url: `${WORKER_BASE_URL}/client-id`,
    method: "GET",
  });

  if (response.status !== 200) {
    throw new Error("Could not load Withings Client ID from Worker.");
  }

  const body = response.json;
  if (!body?.client_id) {
    throw new Error("Worker returned an invalid Client ID response.");
  }

  cachedClientId = String(body.client_id);
  return cachedClientId;
}

function generateState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * @param {string} clientId
 * @param {string} state
 */
function buildAuthorizeUrl(clientId, state) {
  const url = new URL(WITHINGS_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", WITHINGS_SCOPE);
  url.searchParams.set("redirect_uri", WITHINGS_REDIRECT_URI);
  url.searchParams.set("state", state);
  return url.toString();
}

/**
 * @param {WithingsSyncPlugin} plugin
 */
async function connect(plugin) {
  try {
    const clientId = await getClientId(plugin);
    const state = generateState();
    const data = await loadAuthData(plugin);

    data.pendingState = state;
    data.pendingStateExpiresAt = Date.now() + STATE_TTL_MS;
    data.lastError = "";
    await saveAuthData(plugin, data);

    const authorizeUrl = buildAuthorizeUrl(clientId, state);
    window.open(authorizeUrl);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Connect failed unexpectedly.";
    const data = await loadAuthData(plugin);
    data.lastError = message;
    await saveAuthData(plugin, data);
    new Notice(`Withings Sync: ${message}`);
  }
}

/**
 * @param {WithingsSyncPlugin} plugin
 */
async function disconnect(plugin) {
  try {
    await saveAuthData(plugin, {
      accessToken: "",
      refreshToken: "",
      expiresAt: 0,
      userid: "",
      pendingState: "",
      pendingStateExpiresAt: 0,
      lastError: "",
    });
    plugin.stopSyncInterval?.();
    plugin.refreshSettingsDisplay();
    new Notice("Withings Sync: disconnected.");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Disconnect failed unexpectedly.";
    new Notice(`Withings Sync: ${message}`);
  }
}

/**
 * @param {Record<string, string>} params
 */
function readParam(params, key) {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

/**
 * @param {WithingsSyncPlugin} plugin
 * @param {Record<string, string>} params
 */
async function handleAuthCallback(plugin, params) {
  const error = readParam(params, "error");
  if (error) {
    const data = await loadAuthData(plugin);
    data.pendingState = "";
    data.pendingStateExpiresAt = 0;
    data.lastError = error;
    await saveAuthData(plugin, data);
    plugin.refreshSettingsDisplay();
    new Notice(`Withings Sync: authorization failed (${error}).`);
    return;
  }

  const state = readParam(params, "state");
  const accessToken = readParam(params, "access_token");
  const refreshToken = readParam(params, "refresh_token");
  const expiresIn = Number(readParam(params, "expires_in"));
  const userid = readParam(params, "userid");

  const data = await loadAuthData(plugin);

  if (
    !data.pendingState ||
    !state ||
    state !== data.pendingState ||
    Date.now() > data.pendingStateExpiresAt
  ) {
    data.pendingState = "";
    data.pendingStateExpiresAt = 0;
    data.lastError = "state_mismatch";
    await saveAuthData(plugin, data);
    plugin.refreshSettingsDisplay();
    new Notice("Withings Sync: authorization failed (invalid state).");
    return;
  }

  if (!accessToken || !refreshToken || !Number.isFinite(expiresIn)) {
    data.pendingState = "";
    data.pendingStateExpiresAt = 0;
    data.lastError = "missing_tokens";
    await saveAuthData(plugin, data);
    plugin.refreshSettingsDisplay();
    new Notice("Withings Sync: authorization failed (missing tokens).");
    return;
  }

  data.accessToken = accessToken;
  data.refreshToken = refreshToken;
  data.expiresAt = Date.now() + expiresIn * 1000 - TOKEN_REFRESH_SKEW_MS;
  data.userid = userid;
  data.pendingState = "";
  data.pendingStateExpiresAt = 0;
  data.lastError = "";
  await saveAuthData(plugin, data);
  plugin.restartSyncInterval?.();
  plugin.refreshSettingsDisplay();
  new Notice("Withings Sync: connected.");
}

/**
 * @param {WithingsSyncPlugin} plugin
 */
async function refreshTokens(plugin) {
  const data = await loadAuthData(plugin);
  if (!data.refreshToken) {
    throw new Error("Not connected.");
  }

  const response = await requestUrl({
    url: `${WORKER_BASE_URL}/refresh`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: data.refreshToken }),
  });

  if (response.status !== 200) {
    throw new Error("Token refresh failed.");
  }

  const body = response.json;
  if (!body?.access_token || !body?.refresh_token) {
    throw new Error("Token refresh returned an invalid response.");
  }

  const expiresIn = Number(body.expires_in);
  data.accessToken = String(body.access_token);
  data.refreshToken = String(body.refresh_token);
  data.expiresAt =
    Date.now() +
    (Number.isFinite(expiresIn) ? expiresIn : 0) * 1000 -
    TOKEN_REFRESH_SKEW_MS;
  data.lastError = "";
  await saveAuthData(plugin, data);
  return data;
}

/**
 * @param {WithingsSyncPlugin} plugin
 */
async function ensureAccessToken(plugin) {
  const data = await loadAuthData(plugin);
  if (!isConnected(data)) {
    throw new Error("Not connected.");
  }

  if (data.accessToken && Date.now() < data.expiresAt) {
    return data.accessToken;
  }

  const refreshed = await refreshTokens(plugin);
  return refreshed.accessToken;
}

/**
 * @param {WithingsSyncPlugin} plugin
 */
function registerAuthProtocol(plugin) {
  plugin.registerObsidianProtocolHandler(PROTOCOL_ACTION, (params) => {
    void handleAuthCallback(plugin, params);
  });
}

module.exports = {
  connect,
  disconnect,
  ensureAccessToken,
  refreshTokens,
  registerAuthProtocol,
  isConnected,
  loadAuthData,
};
