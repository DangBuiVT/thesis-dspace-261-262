export function authHeaders(token) {
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

export async function parseResponse(response) {
  const rawBody = await response.text();
  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch (_error) {
    return null;
  }
}

export async function parseTextResponse(response) {
  const body = await response.text();
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return { message: body };
  }
}

/** Fired when the API rejects a request that carried a bearer token (expired or revoked session). */
export const SESSION_EXPIRED_EVENT = "thesis:session-expired";

function bearerTokenOf(options) {
  const headers = options?.headers;
  const value =
    headers instanceof Headers ? headers.get("Authorization") : headers?.Authorization;
  return typeof value === "string" && value.startsWith("Bearer ")
    ? value.slice("Bearer ".length)
    : null;
}

// Keep the native Response so JSON, PDF blobs, abort signals and status checks remain explicit.
export async function request(path, options) {
  const response = await fetch(path, options);
  if (response.status === 401) {
    const token = bearerTokenOf(options);
    if (token) {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { token } }));
    }
  }
  return response;
}
