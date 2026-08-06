/** @typedef {import('./main.js').WithingsSyncPlugin} WithingsSyncPlugin */

const AUTH_FIELDS = [
  "accessToken",
  "refreshToken",
  "expiresAt",
  "userid",
  "pendingState",
  "pendingStateExpiresAt",
  "lastError",
];

const DEFAULT_AUTH_DATA = {
  accessToken: "",
  refreshToken: "",
  expiresAt: 0,
  userid: "",
  pendingState: "",
  pendingStateExpiresAt: 0,
  lastError: "",
};

/**
 * @param {Record<string, unknown>} stored
 */
function pickAuthFields(stored) {
  /** @type {Record<string, unknown>} */
  const auth = {};
  for (const key of AUTH_FIELDS) {
    if (stored[key] !== undefined) {
      auth[key] = stored[key];
    }
  }
  return auth;
}

/**
 * @param {WithingsSyncPlugin} plugin
 */
async function readStoredData(plugin) {
  return (await plugin.loadData()) || {};
}

/**
 * @param {WithingsSyncPlugin} plugin
 */
async function loadAuthData(plugin) {
  const stored = await readStoredData(plugin);
  return { ...DEFAULT_AUTH_DATA, ...pickAuthFields(stored) };
}

/**
 * @param {WithingsSyncPlugin} plugin
 * @param {object} data
 */
async function saveAuthData(plugin, data) {
  const stored = await readStoredData(plugin);
  await plugin.saveData({
    ...stored,
    ...pickAuthFields(data),
  });
}

/**
 * @param {object} data
 */
function isConnected(data) {
  return Boolean(data.refreshToken);
}

module.exports = {
  DEFAULT_AUTH_DATA,
  AUTH_FIELDS,
  readStoredData,
  loadAuthData,
  saveAuthData,
  isConnected,
};
