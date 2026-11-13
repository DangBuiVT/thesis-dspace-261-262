import { requestSubmissionFile } from "../api.js";
import { lazy, Suspense, useEffect, useState } from "react";
import { Alert, Button, Empty, Select, Space, Spin } from "antd";
import { useI18n } from "../../../i18n/I18nProvider";

const PdfCanvas = lazy(() => import("../../../shared/pdf/PdfCanvas"));

export default function PdfPreview({ submissionId, files = [], token }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const file = files.find((item) => item.id === selected) || files[0];

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    setUrl("");
    setError("");
    if (!file) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    requestSubmissionFile(submissionId, file.id, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Session expired. Sign in again."
              : "Unable to preview PDF",
          );
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [submissionId, file?.id, token, retry]);

  if (!file) return <Empty description={t("No files")} />;
  const isPdf =
    /\.pdf$/i.test(file.fileName || "") || file.mimeType === "application/pdf";
  return (
    <section className="pdf-preview" aria-label={t("PDF preview")}>
      <Space wrap className="pdf-toolbar">
        <Select
          aria-label={t("Select file")}
          value={file.id}
          onChange={setSelected}
          options={files.map((item) => ({
            value: item.id,
            label: item.fileName,
          }))}
        />
        <Button
          href={url || undefined}
          target="_blank"
          rel="noopener noreferrer"
          disabled={!url}
        >
          {t("Open")}
        </Button>
        <Button
          href={url || undefined}
          download={file.fileName}
          disabled={!url}
        >
          {t("Download")}
        </Button>
      </Space>
      {loading && (
        <div className="preview-message">
          <Spin tip={t("Loading PDF...")}>
            <div />
          </Spin>
        </div>
      )}
      {error && (
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
      )}
      {url && isPdf && (
        <Suspense fallback={<Spin />}>
          <PdfCanvas url={url} />
        </Suspense>
      )}
      {url && (
        <p className="preview-hint">
          {t("If the preview is unavailable, open or download the file.")}
        </p>
      )}
    </section>
  );
}
