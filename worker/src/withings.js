const WITHINGS_TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2";

/**
 * @param {Record<string, string>} params
 */
async function requestToken(params) {
  const body = new URLSearchParams(params);
  const response = await fetch(WITHINGS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  /** @type {{ status?: number; body?: Record<string, unknown>; error?: string }} */
  const data = await response.json();

  return {
    ok: response.ok,
    httpStatus: response.status,
    status: data.status,
    body: data.body,
    error: data.error,
  };
}

/**
 * @param {{ clientId: string; clientSecret: string; code: string; redirectUri: string }} args
 */
export async function exchangeAuthorizationCode({
  clientId,
  clientSecret,
  code,
  redirectUri,
}) {
  return requestToken({
    action: "requesttoken",
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });
}

/**
 * @param {{ clientId: string; clientSecret: string; refreshToken: string }} args
 */
export async function refreshAccessToken({
  clientId,
  clientSecret,
  refreshToken,
}) {
  return requestToken({
    action: "requesttoken",
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
}
