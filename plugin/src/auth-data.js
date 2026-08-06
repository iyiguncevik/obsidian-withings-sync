/** @typedef {import('./main.js').WithingsSyncPlugin} WithingsSyncPlugin */

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
 * @param {WithingsSyncPlugin} plugin
 */
async function loadAuthData(plugin) {
  const stored = await plugin.loadData();
  return { ...DEFAULT_AUTH_DATA, ...stored };
}

/**
 * @param {WithingsSyncPlugin} plugin
 * @param {object} data
 */
async function saveAuthData(plugin, data) {
  await plugin.saveData(data);
}

/**
 * @param {object} data
 */
function isConnected(data) {
  return Boolean(data.refreshToken);
}

module.exports = {
  DEFAULT_AUTH_DATA,
  loadAuthData,
  saveAuthData,
  isConnected,
};
