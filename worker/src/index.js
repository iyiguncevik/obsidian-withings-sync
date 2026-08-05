import { logEvent } from "./log.js";
import {
  exchangeAuthorizationCode,
  refreshAccessToken,
} from "./withings.js";

const OBSIDIAN_AUTH_URL = "obsidian://withings-sync/auth";

/**
 * @param {Record<string, string | number | undefined | null>} params
 */
function buildObsidianRedirect(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${OBSIDIAN_AUTH_URL}?${query}` : OBSIDIAN_AUTH_URL;
}

/**
 * @param {Record<string, string | number | undefined | null>} params
 */
function redirectToObsidian(params) {
  return Response.redirect(buildObsidianRedirect(params), 302);
}

/**
 * @param {unknown} data
 * @param {number} status
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * @param {Record<string, string>} env
 */
function isConfigMissing(env) {
  return (
    !env.WITHINGS_CLIENT_ID ||
    !env.WITHINGS_CLIENT_SECRET ||
    !env.WITHINGS_REDIRECT_URI
  );
}

/**
 * @param {Record<string, string>} env
 */
function getWithingsConfig(env) {
  return {
    clientId: env.WITHINGS_CLIENT_ID,
    clientSecret: env.WITHINGS_CLIENT_SECRET,
    redirectUri: env.WITHINGS_REDIRECT_URI,
  };
}

/**
 * @param {Request} request
 * @param {Record<string, string>} env
 */
async function handleCallback(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";

  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    logEvent({
      event: "oauth_callback_denied",
      error: oauthError,
      hasState: Boolean(state),
    });
    return redirectToObsidian({ error: oauthError, state });
  }

  const code = url.searchParams.get("code");
  if (!code) {
    logEvent({ event: "oauth_callback_missing_code", hasState: Boolean(state) });
    return redirectToObsidian({ error: "missing_code", state });
  }

  if (isConfigMissing(env)) {
    logEvent({ event: "oauth_callback_config_error" });
    return redirectToObsidian({ error: "server_config", state });
  }

  try {
    const result = await exchangeAuthorizationCode({
      ...getWithingsConfig(env),
      code,
    });

    if (result.status !== 0 || !result.body) {
      logEvent({
        event: "oauth_token_exchange_failed",
        httpStatus: result.httpStatus,
        withingsStatus: result.status ?? null,
      });
      return redirectToObsidian({ error: "token_exchange_failed", state });
    }

    logEvent({
      event: "oauth_token_exchange_success",
      withingsStatus: 0,
      hasUserid: Boolean(result.body.userid),
    });

    return redirectToObsidian({
      access_token: String(result.body.access_token ?? ""),
      refresh_token: String(result.body.refresh_token ?? ""),
      expires_in: String(result.body.expires_in ?? ""),
      userid: String(result.body.userid ?? ""),
      state,
    });
  } catch (err) {
    logEvent({
      event: "oauth_token_exchange_error",
      message: err instanceof Error ? err.message : "unknown",
    });
    return redirectToObsidian({ error: "token_exchange_error", state });
  }
}

/**
 * @param {Request} request
 * @param {Record<string, string>} env
 */
async function handleRefresh(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  if (isConfigMissing(env)) {
    logEvent({ event: "refresh_config_error" });
    return jsonResponse({ error: "server_config" }, 500);
  }

  /** @type {{ refresh_token?: unknown }} */
  let body;
  try {
    body = await request.json();
  } catch {
    logEvent({ event: "refresh_invalid_json" });
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const refreshToken = body?.refresh_token;
  if (typeof refreshToken !== "string" || refreshToken.length === 0) {
    logEvent({ event: "refresh_missing_token" });
    return jsonResponse({ error: "missing_refresh_token" }, 400);
  }

  try {
    const result = await refreshAccessToken({
      ...getWithingsConfig(env),
      refreshToken,
    });

    if (result.status !== 0 || !result.body) {
      logEvent({
        event: "refresh_failed",
        httpStatus: result.httpStatus,
        withingsStatus: result.status ?? null,
      });
      return jsonResponse({ error: "refresh_failed" }, 401);
    }

    logEvent({ event: "refresh_success", withingsStatus: 0 });

    return jsonResponse({
      access_token: result.body.access_token,
      refresh_token: result.body.refresh_token,
      expires_in: result.body.expires_in,
    });
  } catch (err) {
    logEvent({
      event: "refresh_error",
      message: err instanceof Error ? err.message : "unknown",
    });
    return jsonResponse({ error: "refresh_error" }, 500);
  }
}

export default {
  /**
   * @param {Request} request
   * @param {Record<string, string>} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (
      pathname === "/health" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      return new Response(request.method === "HEAD" ? null : "ok", {
        status: 200,
      });
    }

    if (pathname === "/callback" && request.method === "HEAD") {
      logEvent({ event: "oauth_callback_head_probe" });
      return new Response(null, { status: 200 });
    }

    if (pathname === "/callback" && request.method === "GET") {
      return handleCallback(request, env);
    }

    if (pathname === "/refresh") {
      return handleRefresh(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};
