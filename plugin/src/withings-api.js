const { requestUrl } = require("obsidian");
const { ensureAccessToken, refreshTokens } = require("./auth");

const WITHINGS_MEASURE_URL = "https://wbsapi.withings.net/measure";
const WITHINGS_AUTH_ERROR = 343;

/**
 * @typedef {import('./main.js').WithingsSyncPlugin} WithingsSyncPlugin
 */

/**
 * @param {string} accessToken
 * @param {{
 *   meastypes: string;
 *   startdate?: number;
 *   enddate?: number;
 *   lastupdate?: number;
 *   offset?: number;
 * }} params
 */
async function requestGetmeasPage(accessToken, params) {
  const body = new URLSearchParams({
    action: "getmeas",
    meastypes: params.meastypes,
    offset: String(params.offset ?? 0),
  });

  if (params.startdate != null) {
    body.set("startdate", String(params.startdate));
  }
  if (params.enddate != null) {
    body.set("enddate", String(params.enddate));
  }
  if (params.lastupdate != null) {
    body.set("lastupdate", String(params.lastupdate));
  }

  return requestUrl({
    url: WITHINGS_MEASURE_URL,
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
}

/**
 * @param {WithingsSyncPlugin} plugin
 * @param {{
 *   meastypes: string;
 *   startdate?: number;
 *   enddate?: number;
 *   lastupdate?: number;
 *   offset?: number;
 * }} params
 */
async function requestGetmeas(plugin, params) {
  let token = await ensureAccessToken(plugin);
  let response = await requestGetmeasPage(token, params);
  let payload = response.json;

  if (payload?.status === WITHINGS_AUTH_ERROR) {
    token = (await refreshTokens(plugin)).accessToken;
    response = await requestGetmeasPage(token, params);
    payload = response.json;
  }

  if (payload?.status === 100) {
    return {
      measuregrps: [],
      updatetime: payload.body?.updatetime ?? 0,
      more: 0,
      offset: 0,
    };
  }

  if (!payload || payload.status !== 0) {
    const status = payload?.status ?? response.status;
    throw new Error(`Withings getmeas failed (${status}).`);
  }

  return payload.body;
}

/**
 * @param {WithingsSyncPlugin} plugin
 * @param {{
 *   meastypes: string;
 *   startdate?: number;
 *   enddate?: number;
 *   lastupdate?: number;
 * }} query
 */
async function fetchAllMeasureGroups(plugin, query) {
  /** @type {Array<{ date: number; measures?: Array<{ value: number; type: number; unit: number }> }>} */
  const measuregrps = [];
  let offset = 0;
  let updatetime = 0;

  while (true) {
    const body = await requestGetmeas(plugin, {
      ...query,
      offset,
    });

    measuregrps.push(...(body.measuregrps ?? []));
    updatetime = body.updatetime ?? updatetime;

    if (body.more !== 1) {
      break;
    }

    offset = body.offset ?? offset;
  }

  return { measuregrps, updatetime };
}

module.exports = {
  fetchAllMeasureGroups,
};
