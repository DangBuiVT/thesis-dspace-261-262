import { Space, Typography, Form, Button } from "antd";
import { renderDspaceSettingControl } from "./DspaceSettingControl.jsx";
const { Paragraph } = Typography;
import { useArchive } from "../ArchiveContext";
export default function DspaceSettingsPanel() {
  const {
    t,
    dspaceSettingsForm,
    saveDspaceSettings,
    dspaceSettings,
    savingDspaceSettings,
    loadingDspaceSettings,
  } = useArchive();
  return (
    <Space
      direction="vertical"
      size="middle"
      style={{ width: "100%", maxWidth: 640 }}
    >
      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
        {t(
          "Set dspace_api_base_url, dspace_api_user, and dspace_api_password so the portal can sign in to DSpace.",
        )}
      </Paragraph>
      <Form
        form={dspaceSettingsForm}
        layout="vertical"
        onFinish={saveDspaceSettings}
      >
        {dspaceSettings.map((item) => (
          <Form.Item
            key={item.key}
            name={item.key}
            label={item.key}
            extra={item.description ? t(item.description) : undefined}
          >
            {renderDspaceSettingControl(item, t)}
          </Form.Item>
        ))}
        <Button
          type="primary"
          htmlType="submit"
          loading={savingDspaceSettings}
          disabled={loadingDspaceSettings}
        >
          {t("Save DSpace settings")}
        </Button>
      </Form>
    </Space>
  );
}
