import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Image,
  Input,
  Radio,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import { useAdmin } from "../AdminContext";
import {
  requestWatermarkLogo,
  requestWatermarkLogoUpload,
  requestWatermarkPreview,
} from "../api.js";
import { authHeaders, parseTextResponse } from "../../../shared/api/http.js";
import {
  DEFAULT_SIGNATURE_STYLE,
  DEFAULT_WATERMARK_PAGES,
  DEFAULT_WATERMARK_TEXT,
  SIGNATURE_STYLES,
  WATERMARK_TEXT_MAX_LENGTH,
  normalizeSignatureStyle,
  signatureStyleLabel,
} from "../../../shared/signature.js";

const PdfCanvas = lazy(() => import("../../submissions/workflow/PdfCanvas"));

const { Paragraph, Text } = Typography;

const STYLE_HELP = {
  margin_strips:
    "A grey strip with the logo and wording runs along both margins of every page without covering the text.",
  diagonal:
    "A translucent ribbon with the wording crosses the centre of every page at 45 degrees.",
  invisible:
    "Only the cryptographic PAdES signature is embedded; pages stay visually unchanged.",
};

const MAX_LOGO_SIDE = 1024;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected file is not a readable image"));
    };
    image.src = url;
  });
}

function canvasToPng(canvas) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Unable to convert the logo"))),
      "image/png",
    ),
  );
}

// The server stores PNGs only: convert any browser-readable image (PNG, JPG, WebP, SVG)
// and build the grey copy used in the margin strips, keeping transparency.
async function buildLogoPngs(file) {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_LOGO_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);
  const color = await canvasToPng(canvas);
  const pixels = context.getImageData(0, 0, width, height);
  const data = pixels.data;
  for (let i = 0; i < data.length; i += 4) {
    const luma = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = data[i + 1] = data[i + 2] = luma;
  }
  context.putImageData(pixels, 0, 0);
  const gray = await canvasToPng(canvas);
  return { color, gray };
}

// System defaults for archiving: visible style, wording, logo and the pages that get the centred logo.
export default function SignatureSettingsPanel() {
  const { t, tr, auth, settings, loadingSettings, savingSettings, saveSignatureSettings } =
    useAdmin();
  const [style, setStyle] = useState(DEFAULT_SIGNATURE_STYLE);
  const [pages, setPages] = useState(DEFAULT_WATERMARK_PAGES);
  const [text, setText] = useState(DEFAULT_WATERMARK_TEXT);
  const [previewStyle, setPreviewStyle] = useState(DEFAULT_SIGNATURE_STYLE);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoCustom, setLogoCustom] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);
  const previewUrlRef = useRef("");

  useEffect(() => {
    const byKey = Object.fromEntries(settings.map((item) => [item.key, item.value]));
    const savedStyle = normalizeSignatureStyle(byKey.signature_style);
    setStyle(savedStyle);
    setPreviewStyle(savedStyle);
    setPages(byKey.signature_watermark_pages || DEFAULT_WATERMARK_PAGES);
    setText(byKey.signature_watermark_text || DEFAULT_WATERMARK_TEXT);
  }, [settings]);

  // Current logo (uploaded one, or the default HCMUT logo).
  useEffect(() => {
    if (!auth?.token) return undefined;
    const controller = new AbortController();
    let objectUrl;
    requestWatermarkLogo("color", {
      headers: authHeaders(auth.token),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load the watermark logo");
        setLogoCustom(response.headers.get("X-Watermark-Logo") === "custom");
        objectUrl = URL.createObjectURL(await response.blob());
        if (!controller.signal.aborted) setLogoUrl(objectUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLogoUrl("");
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [auth?.token, logoVersion]);

  // Live preview: re-render shortly after the wording, pages, style or logo change.
  useEffect(() => {
    if (!auth?.token) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPreviewLoading(true);
      setPreviewError("");
      requestWatermarkPreview({
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(auth.token) },
        body: JSON.stringify({ style: previewStyle, text: text.trim(), pages }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            const payload = await parseTextResponse(response);
            throw new Error(
              Array.isArray(payload?.message)
                ? payload.message.join(", ")
                : payload?.message || "Unable to build the watermark preview",
            );
          }
          const nextUrl = URL.createObjectURL(await response.blob());
          if (controller.signal.aborted) {
            URL.revokeObjectURL(nextUrl);
            return;
          }
          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = nextUrl;
          setPreviewUrl(nextUrl);
        })
        .catch((error) => {
          if (!controller.signal.aborted) setPreviewError(error.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setPreviewLoading(false);
        });
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [auth?.token, previewStyle, text, pages, logoVersion]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const uploadLogo = async (file) => {
    setLogoBusy(true);
    try {
      const { color, gray } = await buildLogoPngs(file);
      const form = new FormData();
      form.append("logo", color, "logo.png");
      form.append("grayLogo", gray, "logo-gray.png");
      const response = await requestWatermarkLogoUpload({
        method: "POST",
        headers: authHeaders(auth.token),
        body: form,
      });
      if (!response.ok) {
        const payload = await parseTextResponse(response);
        throw new Error(payload?.message || "Unable to upload the logo");
      }
      message.success(t("Watermark logo updated"));
      setLogoVersion((value) => value + 1);
    } catch (error) {
      message.error(tr ? tr(error.message) : error.message);
    } finally {
      setLogoBusy(false);
    }
    return false; // handled manually; stop antd's own upload
  };

  const resetLogo = async () => {
    setLogoBusy(true);
    try {
      const response = await requestWatermarkLogoUpload({
        method: "DELETE",
        headers: authHeaders(auth.token),
      });
      if (!response.ok) throw new Error("Unable to restore the default logo");
      message.success(t("Default logo restored"));
      setLogoVersion((value) => value + 1);
    } catch (error) {
      message.error(tr ? tr(error.message) : error.message);
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Alert
        type="info"
        showIcon
        message={t("Digital signature defaults")}
        description={t(
          "Archived theses are stamped, signed with the portal's RSA certificate (PAdES) and time-stamped (RFC 3161). These defaults apply unless the person archiving chooses another style.",
        )}
      />
      <Card size="small" title={t("Visible signature style")}>
        <Radio.Group
          value={style}
          onChange={(event) => {
            setStyle(event.target.value);
            setPreviewStyle(event.target.value);
          }}
          style={{ width: "100%" }}
        >
          <Space direction="vertical" size="middle">
            {SIGNATURE_STYLES.map((value) => (
              <Radio key={value} value={value}>
                <Space direction="vertical" size={0}>
                  <Text strong>{signatureStyleLabel(value, t)}</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {t(STYLE_HELP[value])}
                  </Text>
                </Space>
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </Card>
      <Card size="small" title={t("Watermark wording")}>
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          {t(
            "Printed next to the logo in the margin strips and on the diagonal ribbon. Leave it empty to use the default wording.",
          )}
        </Paragraph>
        <Space.Compact style={{ width: "100%", maxWidth: 560 }}>
          <Input
            value={text}
            maxLength={WATERMARK_TEXT_MAX_LENGTH}
            showCount
            onChange={(event) => setText(event.target.value)}
            placeholder={DEFAULT_WATERMARK_TEXT}
            aria-label={t("Watermark wording")}
          />
          <Button onClick={() => setText(DEFAULT_WATERMARK_TEXT)}>
            {t("Default")}
          </Button>
        </Space.Compact>
      </Card>
      <Card size="small" title={t("Logo watermark")}>
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          {t(
            "The logo is placed at low opacity in the centre of the listed pages only (for example 10, or 10,15, or 10-12), and in grey inside the margin strips. Pages the PDF does not have are skipped with a warning.",
          )}
        </Paragraph>
        <Space wrap align="start" size="large">
          <Space direction="vertical" align="center">
            <div
              style={{
                width: 120,
                height: 120,
                display: "grid",
                placeItems: "center",
                border: "1px dashed var(--ant-color-border, #d9d9d9)",
                borderRadius: 8,
                background: "#fff",
              }}
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={t("Watermark logo")}
                  width={104}
                  height={104}
                  style={{ objectFit: "contain" }}
                  preview={false}
                />
              ) : (
                <Spin />
              )}
            </div>
            <Tag color={logoCustom ? "blue" : "default"}>
              {logoCustom ? t("Uploaded logo") : t("Default logo")}
            </Tag>
          </Space>
          <Space direction="vertical">
            <Upload
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              showUploadList={false}
              beforeUpload={uploadLogo}
              disabled={logoBusy}
            >
              <Button loading={logoBusy}>{t("Upload logo image")}</Button>
            </Upload>
            <Button onClick={resetLogo} disabled={logoBusy || !logoCustom}>
              {t("Use default logo")}
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("PNG with a transparent background works best. Saved immediately.")}
            </Text>
          </Space>
        </Space>
        <Space wrap style={{ marginTop: 16 }}>
          <Text strong>{t("Watermark pages")}</Text>
          <Input
            style={{ width: 240 }}
            value={pages}
            onChange={(event) => setPages(event.target.value)}
            placeholder="10"
          />
        </Space>
      </Card>
      <Card
        size="small"
        title={t("Watermark preview")}
        extra={
          <Segmented
            value={previewStyle}
            onChange={setPreviewStyle}
            options={SIGNATURE_STYLES.map((value) => ({
              value,
              label: signatureStyleLabel(value, t),
            }))}
          />
        }
      >
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          {t(
            "Sample pages: page 1 shows the style on an ordinary page, the next page is the first page that gets the centred logo. Unsaved wording and pages are previewed too.",
          )}
        </Paragraph>
        {previewError && <Alert type="error" showIcon message={t(previewError)} />}
        <Spin spinning={previewLoading}>
          <div style={{ maxWidth: 520, margin: "0 auto", minHeight: 200 }}>
            {previewUrl && (
              <Suspense fallback={<Spin />}>
                <PdfCanvas url={previewUrl} />
              </Suspense>
            )}
          </div>
        </Spin>
      </Card>
      <Card size="small" title={t("Signing parameters")}>
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label={t("Algorithm")}>
            RSA-SHA256 · PAdES-B-T (CMS detached)
          </Descriptions.Item>
          <Descriptions.Item label={t("Timestamp")}>
            RFC 3161 (TSA_URL)
          </Descriptions.Item>
          <Descriptions.Item label={t("Certificate")}>
            {t(
              "SIGNING_KEY_PATH / SIGNING_CERT_PATH; without them a development CA is generated.",
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Button
        type="primary"
        loading={savingSettings}
        disabled={loadingSettings}
        onClick={() => void saveSignatureSettings({ style, pages, text })}
      >
        {t("Save configuration")}
      </Button>
    </Space>
  );
}
