import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Empty,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
} from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  DownloadOutlined,
  ExclamationCircleFilled,
  FilePdfOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { parseResponse } from "../../shared/api/http.js";
import { useI18n } from "../../i18n/I18nProvider";
import { formatDateTime } from "../../i18n/labels";
import {
  requestSignatureVerification,
  TRUST_ANCHOR_CRT_URL,
  TRUST_ANCHOR_PEM_URL,
} from "./api.js";

const { Title, Text, Paragraph } = Typography;

const STATUS_STYLE = {
  VALID: { color: "success", label: "VALID", icon: <CheckCircleFilled /> },
  VALID_UNTRUSTED: {
    color: "warning",
    label: "VALID, SIGNER NOT VERIFIED",
    icon: <ExclamationCircleFilled />,
  },
  INVALID: { color: "error", label: "INVALID", icon: <CloseCircleFilled /> },
  NO_SIGNATURE: { color: "default", label: "NO SIGNATURE", icon: null },
};

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function StatusTag({ status }) {
  const { t } = useI18n();
  const style = STATUS_STYLE[status] || STATUS_STYLE.INVALID;
  return (
    <Tag color={style.color} icon={style.icon} style={{ fontWeight: 600 }}>
      {t(style.label)}
    </Tag>
  );
}

/** Ô thông tin dạng nhãn nhỏ + giá trị trong khung, giống bố cục của Stirling PDF. */
function Field({ label, children, span = 12 }) {
  return (
    <Col xs={24} md={span}>
      <Text
        type="secondary"
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <div
        style={{
          marginTop: 4,
          padding: "8px 12px",
          border: "1px solid var(--ant-color-border, #e5e7eb)",
          borderRadius: 8,
          minHeight: 38,
          wordBreak: "break-word",
          background: "rgba(0,0,0,0.015)",
        }}
      >
        {children ?? <Text type="secondary">—</Text>}
      </div>
    </Col>
  );
}

function Check({ ok, warn, children }) {
  const icon = ok ? (
    <CheckCircleFilled style={{ color: "#52c41a" }} />
  ) : warn ? (
    <ExclamationCircleFilled style={{ color: "#faad14" }} />
  ) : (
    <CloseCircleFilled style={{ color: "#ff4d4f" }} />
  );
  return (
    <Space align="start" size={8}>
      {icon}
      <Text>{children}</Text>
    </Space>
  );
}

function CertificateDetails({ cert }) {
  const { t, lang } = useI18n();
  if (!cert) return null;
  return (
    <Row gutter={[16, 12]}>
      <Field label={t("Issuer")}>{cert.issuer}</Field>
      <Field label={t("Subject")}>{cert.subject}</Field>
      <Field label={t("Serial number")}>
        <Text code copyable style={{ fontSize: 12 }}>
          {cert.serialNumber}
        </Text>
      </Field>
      <Field label={t("Valid from")}>{formatDateTime(cert.validFrom, lang)}</Field>
      <Field label={t("Valid until")}>{formatDateTime(cert.validTo, lang)}</Field>
      <Field label={t("Algorithm")}>{cert.signatureAlgorithm}</Field>
      <Field label={t("Key size")}>
        {cert.keySize ? `${cert.keySize} bits (${cert.publicKeyAlgorithm})` : cert.publicKeyAlgorithm}
      </Field>
      <Field label={t("Version")}>{cert.version}</Field>
      <Field label={t("Key usage")}>{cert.keyUsage.length ? cert.keyUsage.join(", ") : null}</Field>
      <Field label={t("Extended key usage")}>
        {cert.extendedKeyUsage.length ? cert.extendedKeyUsage.join(", ") : null}
      </Field>
      <Field label={t("Self-signed")}>{cert.selfSigned ? t("Yes") : t("No")}</Field>
      <Field label={t("Certificate authority")}>{cert.isCA ? t("Yes") : t("No")}</Field>
      <Field label={t("SHA-256 fingerprint")} span={24}>
        <Text code style={{ fontSize: 12 }}>
          {cert.sha256Fingerprint}
        </Text>
      </Field>
    </Row>
  );
}

function SignatureCard({ signature }) {
  const { t, lang } = useI18n();
  const ts = signature.timestamp;
  return (
    <Card
      style={{ marginBottom: 16 }}
      title={
        <Space wrap>
          <span>
            {t("Signature")} {signature.index}
          </span>
          <StatusTag status={signature.status} />
          {signature.fieldName ? <Tag>{signature.fieldName}</Tag> : null}
        </Space>
      }
    >
      <Row gutter={[16, 12]}>
        <Field label={t("Signer")}>{signature.signerName}</Field>
        <Field label={t("Date")}>{formatDateTime(signature.signingTime, lang) || null}</Field>
        <Field label={t("Reason")}>{signature.reason}</Field>
        <Field label={t("Location")}>{signature.location}</Field>
      </Row>

      <Title level={5} style={{ marginTop: 24 }}>
        {t("Verification checks")}
      </Title>
      <Space direction="vertical" size={6}>
        <Check ok={signature.integrityValid}>
          {signature.integrityValid
            ? t("Document has not been modified since it was signed")
            : t("Document content does not match the signature")}
        </Check>
        <Check ok={signature.signatureValid}>
          {signature.signatureValid
            ? t("Cryptographic signature is valid ({{alg}})", {
                alg: signature.digestAlgorithm || "",
              })
            : t("Cryptographic signature is invalid")}
        </Check>
        <Check ok={signature.chainTrusted} warn>
          {signature.chainTrusted
            ? t("Signer certificate chains to a trusted root CA")
            : t("Signer identity could not be verified (untrusted certificate authority)")}
        </Check>
        <Check ok={signature.certificateValidAtSigningTime}>
          {signature.certificateValidAtSigningTime
            ? t("Certificate was valid at signing time")
            : t("Certificate was not valid at signing time")}
        </Check>
        <Check ok={signature.coversWholeDocument} warn>
          {signature.coversWholeDocument
            ? t("Signature covers the whole document")
            : t("Content was added after this signature")}
        </Check>
        {ts ? (
          <Check ok={ts.signatureValid && ts.imprintMatches} warn={ts.imprintMatches}>
            {t("Trusted timestamp (RFC 3161) from {{tsa}} at {{time}}", {
              tsa: ts.authority || "TSA",
              time: formatDateTime(ts.time, lang),
            })}
          </Check>
        ) : (
          <Check ok={false} warn>
            {t("No trusted timestamp (time taken from the signer's clock)")}
          </Check>
        )}
      </Space>

      {signature.errors.length || signature.warnings.length ? (
        <Space direction="vertical" style={{ width: "100%", marginTop: 16 }}>
          {signature.errors.map((item) => (
            <Alert key={item} type="error" showIcon message={t(item)} />
          ))}
          {signature.warnings.map((item) => (
            <Alert key={item} type="warning" showIcon message={t(item)} />
          ))}
        </Space>
      ) : null}

      <Title level={5} style={{ marginTop: 24 }}>
        {t("Certificate details")}
      </Title>
      <CertificateDetails cert={signature.signer} />

      {signature.chain.length > 1 ? (
        <Collapse
          style={{ marginTop: 16 }}
          items={[
            {
              key: "chain",
              label: t("Certificate chain ({{count}})", { count: signature.chain.length }),
              children: (
                <Space direction="vertical" style={{ width: "100%" }} size={16}>
                  {signature.chain.map((cert, i) => (
                    <Card
                      key={cert.sha256Fingerprint}
                      size="small"
                      type="inner"
                      title={
                        <Space wrap>
                          <SafetyCertificateOutlined />
                          <span>{cert.commonName || cert.subject}</span>
                          <Tag>
                            {i === 0
                              ? t("Signer")
                              : cert.selfSigned
                                ? t("Root CA")
                                : t("Intermediate CA")}
                          </Tag>
                        </Space>
                      }
                    >
                      <CertificateDetails cert={cert} />
                    </Card>
                  ))}
                </Space>
              ),
            },
          ]}
        />
      ) : null}
    </Card>
  );
}

function ReportView({ report }) {
  const { t, lang } = useI18n();
  const firstSigned = report.signatures[0]?.signingTime;
  const overallMessage = {
    VALID: t("All signatures are valid and the signer is verified"),
    VALID_UNTRUSTED: t("The signature is intact, but the signer could not be verified"),
    INVALID: t("At least one signature is invalid"),
    NO_SIGNATURE: t("This PDF does not contain any digital signature"),
  }[report.overallStatus];

  return (
    <>
      <Alert
        style={{ marginBottom: 16 }}
        type={
          report.overallStatus === "VALID"
            ? "success"
            : report.overallStatus === "VALID_UNTRUSTED"
              ? "warning"
              : report.overallStatus === "INVALID"
                ? "error"
                : "info"
        }
        showIcon
        message={
          <Space wrap>
            <Text strong>{overallMessage}</Text>
            <StatusTag status={report.overallStatus} />
          </Space>
        }
        description={report.overallStatus === "VALID"
          ? t("Verified against the library's trusted root certificate: {{root}}", {
              root: report.trustAnchors.map((a) => a.subject.split(",")[0]).join("; "),
            })
          : null}
      />
      <Card style={{ marginBottom: 16 }}>
        <Space align="start" size={16} style={{ width: "100%" }}>
          <FilePdfOutlined style={{ fontSize: 40, color: "#d4380d" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Title level={5} style={{ margin: 0, wordBreak: "break-all" }}>
              {report.fileName || report.title || "document.pdf"}
            </Title>
            <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
              <Field label={t("File size")} span={6}>{formatSize(report.fileSize)}</Field>
              <Field label={t("Pages")} span={6}>{report.pageCount}</Field>
              <Field label={t("Created")} span={6}>{formatDateTime(report.createdAt, lang) || null}</Field>
              <Field label={t("Signature date")} span={6}>
                {formatDateTime(firstSigned, lang) || null}
              </Field>
              <Field label={t("Total signatures")} span={6}>{report.totalSignatures}</Field>
              <Field label="SHA-256" span={18}>
                <Text code copyable style={{ fontSize: 12 }}>
                  {report.sha256}
                </Text>
              </Field>
            </Row>
          </div>
        </Space>
      </Card>
      {report.signatures.length ? (
        report.signatures.map((signature) => (
          <SignatureCard key={signature.index} signature={signature} />
        ))
      ) : (
        <Card>
          <Empty description={t("This PDF does not contain any digital signature")} />
        </Card>
      )}
      <Text type="secondary" style={{ fontSize: 12 }}>
        {t("Verified at {{time}}", { time: formatDateTime(report.verifiedAt, lang) })}
      </Text>
    </>
  );
}

export default function SignatureVerifyPage() {
  const { t } = useI18n();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const verify = async (file) => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const response = await requestSignatureVerification(file);
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to verify the file");
      }
      setReport(payload);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
    return false; // prevent antd's own upload
  };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px 48px" }}>
      <Title level={3} style={{ marginBottom: 4 }}>
        <SafetyCertificateOutlined /> {t("Verify PDF signature")}
      </Title>
      <Paragraph type="secondary">
        {t(
          "Check the digital signature on a deposited thesis PDF. The library's root certificate is trusted automatically, so no certificate upload is needed.",
        )}
      </Paragraph>

      <Upload.Dragger
        accept="application/pdf,.pdf"
        multiple={false}
        showUploadList={false}
        beforeUpload={verify}
        disabled={loading}
        style={{ marginBottom: 16 }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">{t("Click or drop a PDF file here to verify")}</p>
        <p className="ant-upload-hint">
          {t("The file is checked on the server and is not stored.")}
        </p>
      </Upload.Dragger>

      {loading ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <Spin tip={t("Verifying signature...")}>
            <div style={{ height: 48 }} />
          </Spin>
        </div>
      ) : null}
      {error ? <Alert type="error" showIcon message={t(error)} style={{ marginBottom: 16 }} /> : null}
      {report ? <ReportView report={report} /> : null}

      <Card size="small" style={{ marginTop: 24 }}>
        <Space direction="vertical" size={4}>
          <Text strong>{t("Verify in other software")}</Text>
          <Text type="secondary">
            {t(
              "Adobe Reader, Windows or Stirling PDF do not know the library's root CA by default. Install this certificate as a trusted root to see the signature as verified there too.",
            )}
          </Text>
          <Space wrap>
            <Button icon={<DownloadOutlined />} href={TRUST_ANCHOR_CRT_URL}>
              {t("Root CA (.crt, Windows)")}
            </Button>
            <Button icon={<DownloadOutlined />} href={TRUST_ANCHOR_PEM_URL}>
              {t("Root CA (.pem)")}
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
}
