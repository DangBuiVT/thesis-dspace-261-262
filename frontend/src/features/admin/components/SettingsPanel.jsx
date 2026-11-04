import { Typography, Form, Button } from "antd";
import { renderSettingControl } from "./SettingControl.jsx";
const { Paragraph } = Typography;
import { useAdmin } from "../AdminContext";
export default function SettingsPanel() {
  const {
    t,
    settingsForm,
    saveSettings,
    systemSettings,
    savingSettings,
    loadingSettings,
  } = useAdmin();
  return (
    <>
      <Paragraph type="secondary">
        {t("Update system configuration parameters (4.4.5.3).")}
      </Paragraph>
      <Form form={settingsForm} layout="vertical" onFinish={saveSettings}>
        {systemSettings.map((item) => (
          <Form.Item
            key={item.key}
            name={item.key}
            label={item.key}
            extra={item.description ? t(item.description) : undefined}
            rules={[{ required: true, message: t("Required") }]}
          >
            {renderSettingControl(item, t)}
          </Form.Item>
        ))}
        <Button
          type="primary"
          htmlType="submit"
          loading={savingSettings || loadingSettings}
        >
          {t("Save configuration")}
        </Button>
      </Form>
    </>
  );
}
