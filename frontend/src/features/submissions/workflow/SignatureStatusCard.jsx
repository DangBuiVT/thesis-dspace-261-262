import { useEffect, useState } from "react";
import { Alert, Button, Descriptions, Space, Spin, Tag, Typography } from "antd";
import { requestSignatureStatus } from "../api.js";
import { authHeaders, parseResponse } from "../../../shared/api/http.js";
import { useI18n } from "../../../i18n/I18nProvider";
import { formatDateTime } from "../../../i18n/labels";

// Live check of the stored signed copy: hash, PAdES signature and RFC 3161 timestamp.
export default function SignatureStatusCard({ submissionId, token }) {
  const { t, lang } = useI18n();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    requestSignatureStatus(submissionId, {
      headers: authHeaders(token),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await parseResponse(response);
        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to load signature status",
          );
        }
        if (!controller.signal.aborted) setStatus(payload);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [submissionId, token, retry]);

  if (loading) return <Spin />;
  if (error) {
    return (
      <Alert
        type="warning"
        showIcon
        message={t(error)}
        action={
          <Button onClick={() => setRetry((value) => value + 1)}>
            {t("Retry")}
          </Button>
        }
      />
    );
  }
  if (!status?.signed) {
    return (
      <Alert
        type="info"
        showIcon
        message={t("No digital signature")}
        description={t(
          "This thesis has no signed PDF copy yet. It is signed when it is archived.",
        )}
      />
    );
  }
  if (status.fileFound === false) {
    return (
      <Alert
        type="error"
        showIcon
        message={t("Signed copy missing on server")}
      />
    );
  }
  const verification = status.verification || { valid: false, errors: [] };
  const valid = verification.valid && status.hashMatches;
  return (
    <Alert
      type={valid ? "success" : "error"}
      showIcon
      message={
        <Space wrap>
          <Typography.Text strong>
            {valid ? t("Digital signature valid") : t("Digital signature problem")}
          </Typography.Text>
          <Tag color="geekblue">RSA-SHA256 · PAdES-B-T</Tag>
          {status.timestamp?.status === "granted" ? (
            <Tag color="green">{t("Timestamped")}</Tag>
          ) : (
            <Tag color="orange">{t("No timestamp")}</Tag>
          )}
        </Space>
      }
      description={
        <>
          <Descriptions size="small" column={1} style={{ marginTop: 8 }}>
            <Descriptions.Item label={t("Signed copy")}>
              {status.fileName}
            </Descriptions.Item>
            <Descriptions.Item label={t("Certificate serial")}>
              <Typography.Text code>{status.certificateSerial}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label={t("Issuer")}>
              {status.issuer}
            </Descriptions.Item>
            <Descriptions.Item label={t("Signed at")}>
              {formatDateTime(status.signedAt, lang)}
            </Descriptions.Item>
            <Descriptions.Item label={t("Timestamp (RFC 3161)")}>
              {status.timestamp?.status === "granted" && status.timestamp?.time
                ? `${formatDateTime(status.timestamp.time, lang)} · ${status.timestamp.tsaUrl}`
                : t("Not available")}
            </Descriptions.Item>
            <Descriptions.Item label={t("File integrity")}>
              {status.hashMatches ? t("Hash matches") : t("Hash mismatch")}
            </Descriptions.Item>
          </Descriptions>
          {verification.errors?.length ? (
            <ul style={{ margin: "4px 0 0 16px" }}>
              {verification.errors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </>
      }
    />
  );
}
