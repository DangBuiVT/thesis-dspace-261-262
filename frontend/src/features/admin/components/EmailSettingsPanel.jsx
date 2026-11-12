import { Typography, Form, Divider, Button } from "antd";
import { SMTP_FIELD_LABELS } from "../model/settings.js";
import { renderSettingControl } from "./SettingControl.jsx";
const { Paragraph, Text, Title } = Typography;
import { useAdmin } from "../AdminContext";
export default function EmailSettingsPanel() {
  const {
    t,
    emailForm,
    saveEmailSettings,
    emailTechnicalSettings,
    emailTemplateSettings,
    savingSettings,
    loadingSettings,
  } = useAdmin();
  return (
    <>
      <Paragraph type="secondary">
        {t(
          "Turn on EMAIL_ENABLED to send mail. SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM are required. Port 587 (STARTTLS) is used automatically. Staff addresses are",
        )}{" "}
        <Text code>username@hcmut.edu.vn</Text>.
      </Paragraph>
      <Form form={emailForm} layout="vertical" onFinish={saveEmailSettings}>
        <Title level={5} style={{ marginTop: 0 }}>
          SMTP
        </Title>
        {emailTechnicalSettings.map((item) => (
          <Form.Item
            key={item.key}
            name={item.key}
            label={SMTP_FIELD_LABELS[item.key] || item.key}
            extra={
              item.key === "smtp_password"
                ? t("Leave blank to keep the current password")
                : item.key === "email_enabled"
                  ? t("true = send workflow mail; false = do not send")
                  : item.description
                    ? t(item.description)
                    : undefined
            }
            rules={
              item.key === "smtp_password"
                ? undefined
                : [{ required: true, message: t("Required") }]
            }
          >
            {renderSettingControl(item, t)}
          </Form.Item>
        ))}
        <Divider />
        <Title level={5}>{t("Notification templates")}</Title>
        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
          {t("Template placeholders:")} <Text code>{"{{title}}"}</Text>,{" "}
          <Text code>{"{{studentName}}"}</Text>,{" "}
          <Text code>{"{{reason}}"}</Text>, <Text code>{"{{portalUrl}}"}</Text>,{" "}
          <Text code>{"{{author}}"}</Text>, <Text code>{"{{advisor}}"}</Text>,{" "}
          <Text code>{"{{facultyName}}"}</Text>,{" "}
          <Text code>{"{{semesterName}}"}</Text>.
        </Paragraph>
        {emailTemplateSettings.map((item) => (
          <Form.Item
            key={item.key}
            name={item.key}
            label={item.key}
            extra={item.description ? t(item.description) : undefined}
          >
            {renderSettingControl(item, t)}
          </Form.Item>
        ))}
        <Button
          type="primary"
          htmlType="submit"
          loading={savingSettings || loadingSettings}
        >
          {t("Save email configuration")}
        </Button>
      </Form>
    </>
  );
}
