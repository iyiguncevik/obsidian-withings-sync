const PREFIX = "Withings Sync";

/**
 * @param {string} message
 * @param {Record<string, unknown>} [data]
 */
function logInfo(message, data) {
  if (data !== undefined) {
    console.info(`${PREFIX}: ${message}`, data);
  } else {
    console.info(`${PREFIX}: ${message}`);
  }
}

/**
 * @param {string} message
 * @param {Record<string, unknown>} [data]
 */
function logWarn(message, data) {
  if (data !== undefined) {
    console.warn(`${PREFIX}: ${message}`, data);
  } else {
    console.warn(`${PREFIX}: ${message}`);
  }
}

/**
 * @param {string} message
 * @param {unknown} [err]
 */
function logError(message, err) {
  if (err !== undefined) {
    console.error(`${PREFIX}: ${message}`, err);
  } else {
    console.error(`${PREFIX}: ${message}`);
  }
}

/**
 * @param {number} unixSeconds
 */
function formatUnixTimestamp(unixSeconds) {
  return new Date(unixSeconds * 1000).toISOString();
}

module.exports = {
  logInfo,
  logWarn,
  logError,
  formatUnixTimestamp,
};
