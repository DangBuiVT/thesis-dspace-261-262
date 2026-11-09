export const DSPACE_SETTING_ORDER = [
  "dspace_api_base_url",
  "dspace_api_user",
  "dspace_api_password",
];

export const HIDDEN_DSPACE_SETTINGS = new Set([
  "dspace_api_token",
  "dspace_root_community_id",
]);

export function isDspaceSettingKey(key) {
  return String(key || "").startsWith("dspace_");
}

export function sortDspaceSettings(items) {
  const rank = new Map(DSPACE_SETTING_ORDER.map((key, index) => [key, index]));
  return [...items].sort(
    (a, b) =>
      (rank.get(a.key) ?? 99) - (rank.get(b.key) ?? 99) ||
      a.key.localeCompare(b.key),
  );
}
