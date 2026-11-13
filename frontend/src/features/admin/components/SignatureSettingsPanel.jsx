import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Radio,
  Space,
  Typography,
} from "antd";
import { useAdmin } from "../AdminContext";
import {
  DEFAULT_SIGNATURE_STYLE,
  DEFAULT_WATERMARK_PAGES,
  SIGNATURE_STYLES,
  normalizeSignatureStyle,
  signatureStyleLabel,
} from "../../../shared/signature.js";

const { Paragraph, Text } = Typography;

const STYLE_HELP = {
  margin_strips:
    "A grey strip with the university name runs along both margins of every page without covering the text.",
  diagonal:
    "A translucent ribbon crosses the centre of every page at 45 degrees.",
  invisible:
    "Only the cryptographic PAdES signature is embedded; pages stay visually unchanged.",
};

// System defaults for archiving: visible style and the pages that get the logo watermark.
export default function SignatureSettingsPanel() {
  const { t, settings, loadingSettings, savingSettings, saveSignatureSettings } =
    useAdmin();
  const [style, setStyle] = useState(DEFAULT_SIGNATURE_STYLE);
  const [pages, setPages] = useState(DEFAULT_WATERMARK_PAGES);

  useEffect(() => {
    const byKey = Object.fromEntries(settings.map((item) => [item.key, item.value]));
    setStyle(normalizeSignatureStyle(byKey.signature_style));
    setPages(byKey.signature_watermark_pages || DEFAULT_WATERMARK_PAGES);
  }, [settings]);

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
          onChange={(event) => setStyle(event.target.value)}
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
      <Card size="small" title={t("Logo watermark")}>
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          {t(
            "The HCMUT logo is placed at low opacity on the listed pages (for example 10, or 10,15, or 10-12). Pages the PDF does not have are skipped with a warning.",
          )}
        </Paragraph>
        <Space wrap>
          <Text strong>{t("Watermark pages")}</Text>
          <Input
            style={{ width: 240 }}
            value={pages}
            onChange={(event) => setPages(event.target.value)}
            placeholder="10"
          />
        </Space>
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
        onClick={() => void saveSignatureSettings({ style, pages })}
      >
        {t("Save configuration")}
      </Button>
    </Space>
  );
}
