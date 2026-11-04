import { useState } from "react";
import {
  Alert,
  Breadcrumb,
  Button,
  Descriptions,
  Space,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { useI18n } from "../../../i18n/I18nProvider";
import {
  decisionText,
  documentTypeText,
  languageCodeText,
  statusText,
} from "../../../i18n/labels";
import PdfPreview from "./PdfPreview";
import MetadataEditor, { METADATA_FIELDS } from "./MetadataEditor";
import ApprovalHistory from "./ApprovalHistory";
import { stageLabel } from "./TaskQueue";

export default function ReviewWorkspace({
  submission,
  auth,
  onSaved,
  actions,
  extraActions,
  fields = [],
}) {
  const { t } = useI18n();
  const [record, setRecord] = useState(submission);
  const [editing, setEditing] = useState(false);
  const [revision, setRevision] = useState(0);
  const status = record.status || record.submission_status;
  const canEdit =
    ["library_staff", "admin"].includes(auth.user.role) &&
    status === "reviewing" &&
    record.current_step_role === "library_staff";
  const save = (values) => {
    const updated = { ...record };
    for (const [key, column] of METADATA_FIELDS)
      if (values[key] !== undefined) updated[column] = values[key];
    updated.title = updated.title_en || updated.title_vi || updated.title;
    setRecord(updated);
    setEditing(false);
    setRevision((value) => value + 1);
    onSaved?.(updated);
  };
  return (
    <div className="review-workspace">
      <Breadcrumb
        items={[
          { title: t("Home") },
          { title: t("My tasks") },
          { title: t("Submission details") },
        ]}
      />
      <Typography.Title level={3}>
        {record.title_en || record.title || record.title_vi}
      </Typography.Title>
      <Space wrap>
        <Typography.Text type="secondary">
          {[record.faculty_name, record.semester_name, record.period_name]
            .filter(Boolean)
            .join(" / ")}
        </Typography.Text>
        <Tag color="blue">
          {["draft", "archived", "rejected"].includes(status)
            ? statusText(status, t)
            : t(stageLabel(record.current_step_role))}
        </Tag>
        <Tag>{statusText(status, t)}</Tag>
      </Space>
      {status === "archived" && (
        <Alert
          showIcon
          type="info"
          message={t("Archived in portal")}
          description={
            record.dspace_publish_status === "published" &&
            record.dspace_item_id &&
            !record.dspace_item_id.startsWith("dev-")
              ? t("Published to DSpace")
              : t("DSpace publication is pending or requires attention.")
          }
        />
      )}
      <Tabs
        defaultActiveKey="metadata"
        items={[
          {
            key: "metadata",
            label: t("Metadata"),
            children: (
              <div className="review-grid">
                <section aria-label={t("Metadata")}>
                  {canEdit && !editing && (
                    <Button onClick={() => setEditing(true)}>
                      {t("Edit metadata")}
                    </Button>
                  )}
                  {editing ? (
                    <MetadataEditor
                      record={record}
                      token={auth.token}
                      onSaved={save}
                      onCancel={() => setEditing(false)}
                    />
                  ) : (
                    <Descriptions bordered size="small" column={1}>
                      {[
                        ["Authors", record.author],
                        ...METADATA_FIELDS.map(([, column, label]) => [
                          label,
                          record[column],
                        ]),
                        ["Description", record.description],
                        ["Publisher", record.publisher],
                        ["Language", languageCodeText(record.language, t)],
                        ["Date of Issue", record.date_issued],
                        ["Type", documentTypeText(record.document_type, t)],
                        ["Submission period", record.period_name],
                        ["Email", record.student_email],
                        ...Object.entries(record.extra_metadata || {}).map(
                          ([key, value]) => [
                            fields.find((field) => field.fieldKey === key)
                              ?.label || key,
                            value,
                          ],
                        ),
                      ].map(([label, value]) => (
                        <Descriptions.Item key={label} label={t(label)}>
                          {value || "—"}
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  )}
                </section>
                <PdfPreview
                  submissionId={record.id}
                  files={record.files}
                  token={auth.token}
                />
              </div>
            ),
          },
          {
            key: "files",
            label: t("Files"),
            children: (
              <PdfPreview
                submissionId={record.id}
                files={record.files}
                token={auth.token}
              />
            ),
          },
          {
            key: "history",
            label: t("Approval history"),
            children: (
              <ApprovalHistory
                submissionId={record.id}
                token={auth.token}
                refreshKey={revision}
              />
            ),
          },
        ]}
      />
      {record.my_decision && (
        <p>
          {t("My decision")}: {decisionText(record.my_decision, t)}{" "}
          {record.my_comment}
        </p>
      )}
      {Array.isArray(record.reviews) && record.reviews.length > 0 && (
        <details>
          <summary>{t("Per-reviewer reviews")}</summary>
          {record.reviews.map((review, index) => (
            <p key={review.reviewerId || index}>
              {review.reviewer || review.username}:{" "}
              {decisionText(review.decision, t)} {review.comment}
            </p>
          ))}
        </details>
      )}
      {(actions || extraActions) && (
        <div className="workspace-actions">
          <Space wrap>
            {actions}
            {extraActions}
          </Space>
        </div>
      )}
    </div>
  );
}
