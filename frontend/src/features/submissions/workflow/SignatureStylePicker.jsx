import { useState } from "react";
import { Button, Card, Space, Typography, message } from "antd";
import { requestSubmissionFilePreview } from "../api.js";
import { authHeaders, parseResponse } from "../../../shared/api/http.js";
import { useI18n } from "../../../i18n/I18nProvider";
import {
  SIGNATURE_STYLES,
  getStoredSignatureStyle,
  setStoredSignatureStyle,
  signatureStyleLabel,
} from "../../../shared/signature.js";

const LOGO = "/hcmut_nobg.png";

// Miniature page showing where the visible mark goes for a style.
export function SignaturePagePreview({ style, page, width = 125 }) {
  const height = Math.round(width * 1.36);
  const stripStyle = {
    writingMode: "vertical-rl",
    display: "flex",
    alignItems: "center",
    gap: 2,
    fontSize: 6,
    fontWeight: "bold",
    color: "#595959",
    opacity: 0.6,
    letterSpacing: 0.5,
    whiteSpace: "nowrap",
  };
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        background: "#fff",
        border: "1px solid #cbd5e1",
        borderRadius: 4,
        padding: "6px 12px",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: 8,
          fontWeight: "bold",
          textAlign: "center",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: 2,
          marginBottom: 4,
          color: "#1e293b",
        }}
      >
        {page}
      </div>
      {[80, 95, 90, 85, 92].map((w, index) => (
        <div
          key={index}
          style={{
            height: 2.5,
            background: index ? "#f1f5f9" : "#e2e8f0",
            borderRadius: 2,
            marginBottom: 3,
            width: `${w}%`,
          }}
        />
      ))}
      {style === "margin_strips" && (
        <>
          <div
            style={{
              position: "absolute",
              left: 2,
              top: 8,
              bottom: 8,
              width: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ ...stripStyle, transform: "rotate(180deg)" }}>
              <img
                src={LOGO}
                alt=""
                style={{ width: 8, height: 8, filter: "grayscale(1)" }}
              />
              TRƯỜNG ĐẠI HỌC BÁCH KHOA - HCMUT
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              right: 2,
              top: 8,
              bottom: 8,
              width: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={stripStyle}>
              <img
                src={LOGO}
                alt=""
                style={{ width: 8, height: 8, filter: "grayscale(1)" }}
              />
              TRƯỜNG ĐẠI HỌC BÁCH KHOA - HCMUT
            </div>
          </div>
        </>
      )}
      {style === "diagonal" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              transform: "rotate(-45deg)",
              fontSize: 7,
              fontWeight: "bold",
              color: "rgba(0,51,102,0.22)",
              border: "1px dashed rgba(0,51,102,0.3)",
              padding: "3px 6px",
              borderRadius: 3,
              whiteSpace: "nowrap",
            }}
          >
            ĐH BÁCH KHOA - HCMUT
          </div>
        </div>
      )}
      {style === "invisible" && (
        <div
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            fontSize: 6,
            color: "#94a3b8",
            fontStyle: "italic",
          }}
        >
          PAdES
        </div>
      )}
    </div>
  );
}

// Lets the person archiving choose the visible style and download a stamped preview first.
export default function SignatureStylePicker({ submissionId, files = [], token }) {
  const { t } = useI18n();
  const [style, setStyle] = useState(() => getStoredSignatureStyle());
  const [downloading, setDownloading] = useState(false);
  const pdf = files.find((file) => /\.pdf$/i.test(file.fileName || ""));

  const choose = (value) => {
    setStyle(value);
    setStoredSignatureStyle(value);
  };

  const downloadPreview = async () => {
    if (!pdf) return;
    setDownloading(true);
    try {
      const response = await requestSubmissionFilePreview(
        submissionId,
        pdf.id,
        style,
        { headers: { ...authHeaders(token) } },
      );
      if (!response.ok) {
        const payload = await parseResponse(response);
        throw new Error(payload?.message || "Unable to open file");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120000);
    } catch (error) {
      message.error(t(error.message || "Unable to open file"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card
      size="small"
      title={t("Visible signature style for archiving")}
      extra={
        <Space>
          {SIGNATURE_STYLES.map((value) => (
            <Button
              key={value}
              size="small"
              type={style === value ? "primary" : "default"}
              onClick={() => choose(value)}
            >
              {signatureStyleLabel(value, t)}
            </Button>
          ))}
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        {t(
          "The mark is applied to every page when the thesis is archived; the PDF is then signed (PAdES) and time-stamped.",
        )}
      </Typography.Paragraph>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "6px 0" }}>
        {[1, 2, 3].map((page) => (
          <SignaturePagePreview
            key={page}
            style={style}
            page={t("Page {{page}}", { page })}
          />
        ))}
      </div>
      {pdf ? (
        <Button size="small" loading={downloading} onClick={downloadPreview}>
          {t("Preview stamped PDF ({{style}})", {
            style: signatureStyleLabel(style, t),
          })}
        </Button>
      ) : null}
    </Card>
  );
}
