import { useEffect, useRef, useState } from "react";
import { Alert, Button, Space, Spin } from "antd";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?worker&url";
import { useI18n } from "../../../i18n/I18nProvider";

GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfCanvas({ url }) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [width, setWidth] = useState(500);
  const [loaded, setLoaded] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const pdf = loaded?.url === url ? loaded.pdf : null;

  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(160, entries[0].contentRect.width - 24)),
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let disposed = false;
    setLoaded(null);
    setReady(false);
    setError("");
    setPageNumber(1);
    const task = getDocument({ url, isEvalSupported: false });
    task.onPassword = () => {
      if (!disposed) setError("Password-protected PDF cannot be previewed.");
      void task.destroy();
    };
    task.promise
      .then((document) => {
        if (!disposed) setLoaded({ url, pdf: document });
      })
      .catch(() => {
        if (!disposed)
          setError(
            (previous) =>
              previous || "Unable to render PDF. Open or download the file.",
          );
      });
    return () => {
      disposed = true;
      void task.destroy();
    };
  }, [url]);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    let renderTask;
    setReady(false);
    pdf
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: width / base.width });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = canvasRef.current;
        canvas.width = Math.ceil(viewport.width * ratio);
        canvas.height = Math.ceil(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        renderTask = page.render({
          canvas,
          canvasContext: canvas.getContext("2d"),
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        return renderTask.promise;
      })
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((reason) => {
        if (!cancelled && reason.name !== "RenderingCancelledException")
          setError("Unable to render PDF. Open or download the file.");
      });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, width]);

  return (
    <>
      <Space wrap className="pdf-pagination">
        <Button
          aria-label={t("Previous page")}
          disabled={!pdf || pageNumber <= 1}
          onClick={() => setPageNumber((number) => number - 1)}
        >
          {t("Previous page")}
        </Button>
        <span aria-live="polite">
          {pdf
            ? t("Page {{page}} of {{total}}", {
                page: pageNumber,
                total: pdf.numPages,
              })
            : t("Loading PDF...")}
        </span>
        <Button
          aria-label={t("Next page")}
          disabled={!pdf || pageNumber >= pdf.numPages}
          onClick={() => setPageNumber((number) => number + 1)}
        >
          {t("Next page")}
        </Button>
      </Space>
      {error && <Alert type="error" showIcon message={t(error)} />}
      <div
        ref={containerRef}
        className="pdf-canvas-container"
        aria-busy={!ready && !error}
      >
        {!ready && !error && <Spin />}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t("PDF preview")}
          data-rendered={ready ? "true" : "false"}
          style={{ display: ready && !error ? "block" : "none" }}
        />
      </div>
    </>
  );
}
