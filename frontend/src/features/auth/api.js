import { request } from "../../shared/api/http.js";

// Return native Responses so callers retain their existing status/error handling.
export const requestSession = (options) => request("/api/auth/me", options);
export const requestLoginOptions = (options) =>
  request("/api/auth/login-options", options);
export const requestLogin = (options) => request("/api/auth/login", options);
export const requestPasswordChange = (options) =>
  request("/api/auth/change-password", options);
