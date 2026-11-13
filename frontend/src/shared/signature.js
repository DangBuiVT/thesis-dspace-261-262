// Digital-signature presentation shared by the admin and submissions features.
// The system default lives in system_settings (signature_style, signature_watermark_pages);
// localStorage only remembers the last choice made in this browser.

export const SIGNATURE_STYLES = ["margin_strips", "diagonal", "invisible"];
export const DEFAULT_SIGNATURE_STYLE = "margin_strips";
export const DEFAULT_WATERMARK_PAGES = "10";

const STYLE_KEY = "bklib_signature_style";
const PAGES_KEY = "bklib_watermark_pages";

export const SIGNATURE_STYLE_LABELS = {
  margin_strips: "Margin strips",
  diagonal: "Diagonal ribbon",
  invisible: "Invisible (no visible mark)",
};

export function normalizeSignatureStyle(value) {
  return SIGNATURE_STYLES.includes(value) ? value : DEFAULT_SIGNATURE_STYLE;
}

export function signatureStyleLabel(style, t = (text) => text) {
  return t(SIGNATURE_STYLE_LABELS[normalizeSignatureStyle(style)]);
}

export function signatureStyleOptions(t = (text) => text) {
  return SIGNATURE_STYLES.map((value) => ({
    value,
    label: t(SIGNATURE_STYLE_LABELS[value]),
  }));
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the server default still applies.
  }
}

export function getStoredSignatureStyle(fallback = DEFAULT_SIGNATURE_STYLE) {
  const value = readStorage(STYLE_KEY);
  return SIGNATURE_STYLES.includes(value) ? value : fallback;
}

export function setStoredSignatureStyle(style) {
  writeStorage(STYLE_KEY, normalizeSignatureStyle(style));
}

export function getStoredWatermarkPages(fallback = DEFAULT_WATERMARK_PAGES) {
  const value = readStorage(PAGES_KEY);
  return value && value.trim() ? value : fallback;
}

export function setStoredWatermarkPages(pages) {
  writeStorage(PAGES_KEY, String(pages ?? "").trim() || DEFAULT_WATERMARK_PAGES);
}
