import { requestSubmissionHistory } from "../api.js";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
} from "antd";
import { useI18n } from "../../../i18n/I18nProvider";
import { formatDateTime, statusText } from "../../../i18n/labels";

const labels = {
  submitted: "Submitted",
  draft_saved: "Draft saved",
  draft_updated: "Draft updated",
  resubmitted: "Resubmitted",
  reviewer_approved: "Reviewer approved",
  reviewer_rejected: "Reviewer rejected",
  library_staff_approved: "Library intake approved",
  library_staff_rejected: "Library intake rejected",
  director_approved: "Director approved",
  director_archived: "Archived by director",
  director_rejected: "Director rejected",
  director_returned: "Returned to Editor",
  metadata_updated: "Metadata updated",
  status_changed: "Status changed",
  reverted_to_draft: "Moved to draft",
  digital_signature_signed: "Digitally signed",
};
const roles = {
  student: "Student",
  reviewer: "Reviewer",
  library_staff: "Editor",
  director: "Final Editor",
  admin: "Admin",
  system: "System",
};
const fields = {
  titleVi: "Title (Vietnamese)",
  titleEn: "Title (English)",
  abstract: "Abstract",
  keywords: "Keywords",
  thesisAdvisors: "Advisor(s)",
  major: "Major",
  thesisYear: "Year",
};
export function normalizeHistory(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    actorRole: item.actorRole || item.role,
    eventType:
      { SUBMIT: "submitted", RESUBMIT: "resubmitted" }[item.eventType] ||
      item.eventType,
    payload: item.payload || { comment: item.comment },
  }));
}
export function HistoryTimeline({ items }) {
  const { t, lang } = useI18n();
  const normalized = normalizeHistory(items);
  if (!normalized.length)
    return <Empty description={t("No workflow history")} />;
  return (
    <Timeline
      items={normalized.map((item, index) => ({
        key: item.id || index,
        color: item.eventType.includes("reject")
          ? "red"
          : item.eventType === "director_returned"
            ? "orange"
            : item.eventType === "digital_signature_signed"
              ? "purple"
              : "blue",
        children: (
          <div className="history-event">
            <Space wrap>
              <Tag>{t(labels[item.eventType] || item.eventType)}</Tag>
              <Typography.Text type="secondary">
                {formatDateTime(item.createdAt, lang)}
              </Typography.Text>
            </Space>
            <p>
              {item.actorName || t("System")} ·{" "}
              {t(roles[item.actorRole] || item.actorRole || "System")}
            </p>
            {item.payload?.comment && <p>{item.payload.comment}</p>}
            {item.eventType === "status_changed" && (
              <p>
                {statusText(item.payload?.from, t)} →{" "}
                {statusText(item.payload?.to, t)}
              </p>
            )}
            {item.eventType === "digital_signature_signed" && (
              <p className="signature-event">
                {[
                  item.payload?.algorithm,
                  item.payload?.certificate_serial
                    ? `${t("Certificate serial")}: ${item.payload.certificate_serial}`
                    : null,
                  item.payload?.tsa_status === "granted"
                    ? `${t("Timestamped")}: ${formatDateTime(item.payload.tsa_time, lang)}`
                    : t("No timestamp"),
                  item.payload?.sha256_hash
                    ? `SHA-256: ${String(item.payload.sha256_hash).slice(0, 16)}…`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {(item.payload?.changes || []).map((change) => (
              <div key={change.field} className="metadata-change">
                <strong>{t(fields[change.field] || change.field)}</strong>
                <div>
                  <del>{change.before || "—"}</del> → {change.after || "—"}
                </div>
              </div>
            ))}
            {!item.payload?.changes && item.payload?.updatedFields && (
              <p>
                {t("Updated fields")}:{" "}
                {Object.keys(item.payload.updatedFields)
                  .filter((key) => key !== "comment")
                  .map((key) => t(fields[key] || key))
                  .join(", ")}
              </p>
            )}
          </div>
        ),
      }))}
    />
  );
}

export default function ApprovalHistory({
  submissionId,
  token,
  refreshKey = 0,
}) {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setItems([]);
    requestSubmissionHistory(submissionId, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Session expired. Sign in again."
              : "Unable to load approval history",
          );
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) setItems(data);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [submissionId, token, refreshKey, retry]);
  if (loading) return <Spin />;
  if (error)
    return (
      <Alert
        type="error"
        showIcon
        message={t(error)}
        action={
          <Button onClick={() => setRetry((value) => value + 1)}>
            {t("Retry")}
          </Button>
        }
      />
    );
  return <HistoryTimeline items={items} />;
}
