import { request } from "../../shared/api/http.js";

// Public endpoints: no login required, so anyone holding a deposited PDF can check it.
export const requestSignatureVerification = (file, options = {}) => {
  const body = new FormData();
  body.append("file", file);
  return request("/api/signatures/verify", { method: "POST", body, ...options });
};

export const TRUST_ANCHOR_PEM_URL = "/api/signatures/trust-anchor.pem";
export const TRUST_ANCHOR_CRT_URL = "/api/signatures/trust-anchor.crt";
