import dayjs from "dayjs";
export function toIsoString(value) {
  if (!value) {
    return null;
  }
  if (typeof value.toISOString === "function") {
    return value.toISOString();
  }
  return dayjs(value).toISOString();
}

export function formatTreeDate(value) {
  if (!value) {
    return "—";
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "—";
}

export function periodStatusColor(status) {
  if (status === "open") {
    return "green";
  }
  if (status === "draft") {
    return "default";
  }
  if (status === "closed") {
    return "orange";
  }
  return "purple";
}
