import { Typography, Space, Select, Button, Switch } from "antd";
import { ROLES, PERMISSION_LABELS } from "../model/constants.js";
import { roleText } from "../../../i18n/labels";
const { Paragraph, Text } = Typography;
import { useAdmin } from "../AdminContext";
export default function RolesPanel() {
  const {
    t,
    selectedRole,
    setSelectedRole,
    saveRolePermissions,
    savingRoles,
    loadRoles,
    loadingRoles,
    rolePermissions,
    setRolePermissions,
  } = useAdmin();
  return (
    <>
      <Paragraph type="secondary">
        {t(
          "Configure permissions for each role (4.4.5.2). Changes are stored for access control policy.",
        )}
      </Paragraph>
      <Space style={{ marginBottom: 16 }} wrap>
        <Text strong>{t("Role:")}</Text>
        <Select
          style={{ minWidth: 200 }}
          value={selectedRole}
          onChange={setSelectedRole}
          options={ROLES.map((r) => ({ value: r, label: roleText(r, t) }))}
        />
        <Button
          type="primary"
          onClick={saveRolePermissions}
          loading={savingRoles}
        >
          {t("Save permissions")}
        </Button>
        <Button onClick={() => loadRoles()} loading={loadingRoles}>
          {t("Refresh")}
        </Button>
      </Space>
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {Object.keys(PERMISSION_LABELS).map((key) => (
          <Space
            key={key}
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <Text>{t(PERMISSION_LABELS[key])}</Text>
            <Switch
              checked={Boolean(rolePermissions[key])}
              onChange={(checked) =>
                setRolePermissions((prev) => ({ ...prev, [key]: checked }))
              }
            />
          </Space>
        ))}
      </Space>
    </>
  );
}
