import { lazy, Suspense, useEffect, useState } from "react";
import { Alert, Button, Empty, Select, Space, Spin } from "antd";
import { useI18n } from "../../i18n/I18nProvider";

const PdfCanvas = lazy(() => import("./PdfCanvas"));

export default function PdfPreview({ submissionId, files = [], token }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);

  const fileList = Array.isArray(files) ? files : [];
  const file = fileList.find((item) => item.id === selected) || fileList[0];

  useEffect(() => {
    if (!file || !submissionId) {
      setUrl("");
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let objectUrl = "";
    setUrl("");
    setError("");
    setLoading(true);

    fetch(`/api/submissions/${submissionId}/files/${file.id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Session expired. Sign in again."
              : "Unable to preview PDF"
          );
        }
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(reason.message || "Unable to preview PDF");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [submissionId, file?.id, token, retry]);

  if (!file) {
    return <Empty description={t("No files attached to preview")} />;
  }

  const isPdf =
    /\.pdf$/i.test(file.fileName || "") || file.fileType === "thesis";

  return (
    <section className="pdf-preview" aria-label={t("PDF preview")} style={{ marginTop: 8 }}>
      <Space wrap style={{ marginBottom: 12 }}>
        {fileList.length > 1 && (
          <Select
            aria-label={t("Select file")}
            value={file.id}
            onChange={setSelected}
            style={{ minWidth: 200 }}
            options={fileList.map((item) => ({
              value: item.id,
              label: `${item.fileType ? `[${item.fileType}] ` : ""}${item.fileName}`,
            }))}
          />
        )}
        <Button
          href={url || undefined}
          target="_blank"
          rel="noopener noreferrer"
          disabled={!url}
        >
          {t("Open in new tab")}
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
        <div style={{ display: "grid", placeItems: "center", minHeight: 180, background: "#f5f7fa", borderRadius: 6 }}>
          <Spin tip={t("Loading PDF...")} />
        </div>
      )}

      {error && (
        <Alert
          type="error"
          showIcon
          message={t(error)}
          style={{ marginBottom: 12 }}
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

      {url && !isPdf && (
        <Alert
          type="info"
          message={t("Only PDF files support direct visual preview. Please download or open the file.")}
        />
      )}

      {url && isPdf && (
        <p style={{ color: "#666", fontSize: 12, marginTop: 8, marginBottom: 0 }}>
          {t("If the preview is unavailable or misaligned, please click 'Open in new tab' or 'Download'.")}
        </p>
      )}
    </section>
  );
}

