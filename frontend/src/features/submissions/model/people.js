import { foldSearchText } from "../../../shared/search.js";

export function studentEmailFromUser(user) {
  if (!user?.username) {
    return "";
  }
  const username = user.username.trim().toLowerCase();
  return username.includes("@") ? username : `${username}@hcmut.edu.vn`;
}

export function personOptionLabel(displayName, username) {
  const name = displayName || username || "";
  return username && name !== username
    ? `${name} (${username})`
    : name || username;
}

export function personOptionFilter(input, option) {
  const query = foldSearchText(input).trim();
  if (!query) {
    return true;
  }
  const haystack = option?.searchText || foldSearchText(option?.label);
  return String(haystack).includes(query);
}
