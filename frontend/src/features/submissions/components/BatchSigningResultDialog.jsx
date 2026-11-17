import { Alert, Button, Modal, Tag, Typography } from "antd";
import { useSubmissions } from "../SubmissionContext.jsx";

// Outcome of a legacy batch signing run, including per-thesis watermark warnings.
export default function BatchSigningResultDialog() {
  const { t, batchResult, setBatchResult } = useSubmissions();
  const results = batchResult?.results || [];
  const hasWarnings = results.some((item) => item.warnings?.length > 0);
  return (
    <Modal
      title={t("Batch signing result")}
      open={Boolean(batchResult)}
      onCancel={() => setBatchResult(null)}
      width={650}
      footer={[
        <Button key="close" type="primary" onClick={() => setBatchResult(null)}>
          {t("Close")}
        </Button>,
      ]}
    >
      {batchResult ? (
        <>
          <Alert
            type={hasWarnings ? "warning" : "success"}
            showIcon
            message={t("Signed {{count}} of {{total}} submissions", {
              count: batchResult.successCount ?? 0,
              total: batchResult.total ?? results.length,
            })}
            description={
              hasWarnings
                ? t("Some PDFs reported warnings. Check the list below.")
                : t("Every selected thesis was signed with the configured settings.")
            }
            style={{ marginBottom: 14 }}
          />
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {results.map((item, index) => (
              <div
                key={item.submissionId || index}
                style={{
                  padding: "8px 12px",
                  marginBottom: 8,
                  border: "1px solid",
                  borderColor: item.warnings?.length ? "#fef08a" : "#bbf7d0",
                  background: item.warnings?.length ? "#fffbeb" : "#f0fdf4",
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Typography.Text strong>
                    {item.title || t("(untitled)")}
                  </Typography.Text>
                  {item.signed ? (
                    <Tag color="green">{t("Signed")}</Tag>
                  ) : (
                    <Tag color="red">{t("Failed")}</Tag>
                  )}
                </div>
                {item.warnings?.length ? (
                  <Typography.Text type="warning" style={{ fontSize: 12 }}>
                    {item.warnings.join(" | ")}
                  </Typography.Text>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Modal>
  );
}
