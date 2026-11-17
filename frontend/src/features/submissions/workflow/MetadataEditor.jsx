import { requestSubmissionMetadata } from "../api.js";
import { useState } from "react";
import { Alert, Button, Form, Input, Space } from "antd";
import { useI18n } from "../../../i18n/I18nProvider";

export const METADATA_FIELDS = [
  ["titleVi", "title_vi", "Title (Vietnamese)"],
  ["titleEn", "title_en", "Title (English)"],
  ["thesisAdvisors", "thesis_advisors", "Advisor(s)"],
  ["major", "major", "Major"],
  ["thesisYear", "thesis_year", "Year"],
  ["abstract", "abstract", "Abstract"],
  ["keywords", "keywords", "Keywords"],
];

export default function MetadataEditor({ record, token, onSaved, onCancel }) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async (values) => {
    if (saving) return;
    setSaving(true);
    setError("");
    const changes = Object.fromEntries(
      METADATA_FIELDS.filter(
        ([key, column]) =>
          String(values[key] ?? "").trim() !== String(record[column] ?? ""),
      ).map(([key]) => [key, String(values[key] ?? "").trim()]),
    );
    try {
      const response = await requestSubmissionMetadata(record.id, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changes),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Session expired. Sign in again."
            : Array.isArray(payload.message)
              ? payload.message.join("; ")
              : payload.message || "Unable to save metadata",
        );
      onSaved(changes);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Form
      layout="vertical"
      initialValues={Object.fromEntries(
        METADATA_FIELDS.map(([key, column]) => [key, record[column] || ""]),
      )}
      onFinish={save}
    >
      <Alert
        type="info"
        showIcon
        message={t("Metadata edits are recorded in approval history.")}
      />
      {error && <Alert type="error" showIcon message={t(error)} />}
      {METADATA_FIELDS.map(([key, , label]) => (
        <Form.Item
          key={key}
          name={key}
          label={t(label)}
          rules={
            key === "thesisYear"
              ? [
                  {
                    pattern: /^\d{4}$/,
                    message: t("Year must be a four-digit number"),
                  },
                ]
              : []
          }
        >
          {key === "abstract" ? (
            <Input.TextArea rows={5} disabled={saving} />
          ) : (
            <Input disabled={saving} />
          )}
        </Form.Item>
      ))}
      <Space>
        <Button type="primary" htmlType="submit" loading={saving}>
          {t("Save metadata")}
        </Button>
        <Button onClick={onCancel} disabled={saving}>
          {t("Cancel")}
        </Button>
      </Space>
    </Form>
  );
}
