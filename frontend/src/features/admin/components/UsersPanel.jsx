import { Typography, Space, Button, Input, Select, Table } from "antd";
import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import { ROLES } from "../model/constants.js";
import { roleText } from "../../../i18n/labels";
const { Paragraph, Text } = Typography;
import { useAdmin } from "../AdminContext";
export default function UsersPanel() {
  const {
    t,
    openCreateUser,
    exportingUsers,
    downloadUsersExport,
    openImportUsers,
    loadUsers,
    loadingUsers,
    userSearch,
    setUserSearch,
    userRoleFilter,
    setUserRoleFilter,
    userStatusFilter,
    setUserStatusFilter,
    clearUserFilters,
    filteredUsers,
    users,
    userColumns,
  } = useAdmin();
  return (
    <>
      <Paragraph type="secondary">
        {t("Create, edit, or disable user accounts (4.4.5.1).")}
      </Paragraph>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button type="primary" onClick={openCreateUser}>
          {t("Create user")}
        </Button>
        <Button
          icon={<DownloadOutlined />}
          loading={exportingUsers}
          onClick={downloadUsersExport}
        >
          {t("Export users")}
        </Button>
        <Button onClick={openImportUsers}>{t("Import users")}</Button>
        <Button onClick={() => loadUsers()} loading={loadingUsers}>
          {t("Refresh")}
        </Button>
      </Space>
      <Space style={{ marginBottom: 12, width: "100%" }} wrap align="start">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t("Search username or display name")}
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          style={{ minWidth: 260, flex: 1 }}
        />
        <Select
          value={userRoleFilter}
          onChange={setUserRoleFilter}
          style={{ minWidth: 180 }}
          options={[
            { value: "all", label: t("All roles") },
            ...ROLES.map((r) => ({ value: r, label: roleText(r, t) })),
          ]}
        />
        <Select
          value={userStatusFilter}
          onChange={setUserStatusFilter}
          style={{ minWidth: 140 }}
          options={[
            { value: "all", label: t("All statuses") },
            { value: "active", label: t("Active") },
            { value: "disabled", label: t("Disabled") },
          ]}
        />
        {(userSearch ||
          userRoleFilter !== "all" ||
          userStatusFilter !== "all") && (
          <Button onClick={clearUserFilters}>{t("Clear filters")}</Button>
        )}
      </Space>
      <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
        {t("Showing {{shown}} of {{total}} users", {
          shown: filteredUsers.length,
          total: users.length,
        })}
      </Text>
      <Table
        rowKey="id"
        dataSource={filteredUsers}
        columns={userColumns}
        loading={loadingUsers}
        pagination={{
          pageSize: 8,
          showSizeChanger: true,
          pageSizeOptions: [8, 16, 32],
        }}
        scroll={{ x: 900 }}
      />
    </>
  );
}
