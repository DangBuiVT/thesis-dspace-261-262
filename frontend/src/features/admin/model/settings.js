export function isEmailSettingKey(key) {
  return (
    String(key || "").startsWith("email_") ||
    String(key || "").startsWith("smtp_")
  );
}

export function isDspaceSettingKey(key) {
  return String(key || "").startsWith("dspace_");
}

export function isSignatureSettingKey(key) {
  return String(key || "").startsWith("signature_");
}

export const EMAIL_TECHNICAL_KEYS = [
  "email_enabled",
  "smtp_host",
  "smtp_user",
  "smtp_password",
  "smtp_from",
];

export const SMTP_FIELD_LABELS = {
  email_enabled: "EMAIL_ENABLED",
  smtp_host: "SMTP_HOST",
  smtp_user: "SMTP_USER",
  smtp_password: "SMTP_PASSWORD",
  smtp_from: "SMTP_FROM",
};

export function isEmailTechnicalKey(key) {
  return EMAIL_TECHNICAL_KEYS.includes(key);
}

export function sortEmailTechnical(items) {
  const rank = new Map(EMAIL_TECHNICAL_KEYS.map((key, index) => [key, index]));
  return [...items].sort(
    (a, b) => (rank.get(a.key) ?? 99) - (rank.get(b.key) ?? 99),
  );
}
