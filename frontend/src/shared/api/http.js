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

// Keep the native Response so JSON, PDF blobs, abort signals and status checks remain explicit.
export function request(path, options) {
  return fetch(path, options);
}
