import { Select, Input } from "antd";
export function renderSettingControl(item, t) {
  if (item.key === "login_method") {
    return (
      <Select
        options={[
          { value: "username", label: t("username (password)") },
          { value: "google", label: t("google (@hcmut.edu.vn)") },
        ]}
      />
    );
  }
  if (
    item.key === "maintenance_mode" ||
    item.key === "email_enabled" ||
    item.key === "smtp_secure"
  ) {
    return (
      <Select
        options={[
          { value: "false", label: "false" },
          { value: "true", label: "true" },
        ]}
      />
    );
  }
  if (
    item.key === "dspace_api_password" ||
    item.key === "dspace_api_token" ||
    item.key === "smtp_password"
  ) {
    return (
      <Input.Password
        placeholder={
          item.sensitive ? t("Unchanged if left blank / masked") : ""
        }
      />
    );
  }
  if (item.key.startsWith("email_body_")) {
    return <Input.TextArea rows={8} />;
  }
  return <Input />;
}
