import { Input } from "antd";
export function renderDspaceSettingControl(item, t) {
  if (item.key === "dspace_api_password") {
    return (
      <Input.Password
        placeholder={
          item.sensitive ? t("Unchanged if left blank / masked") : ""
        }
      />
    );
  }
  return <Input />;
}
