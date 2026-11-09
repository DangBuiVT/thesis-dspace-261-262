import { Typography, Space, Input, Select, Button, message, Table } from "antd";
import { roleText } from "../../../i18n/labels";
const { Paragraph, Text } = Typography;
import { useAdmin } from "../AdminContext";
export default function GroupsPanel() {
  const {
    t,
    groupName,
    setGroupName,
    groupKind,
    setGroupKind,
    loadGroups,
    tr,
    loadingGroups,
    groups,
    setSelectedGroupId,
    selectedGroup,
    groupMemberOptions,
    saveGroupMembers,
    studentGroupOptions,
    saveGroupGrants,
    createGroup,
    deleteGroup,
  } = useAdmin();
  return (
    <>
      <Paragraph type="secondary">
        {t(
          "Create student and reviewer groups, assign users, then choose which student groups a reviewer group may review. Until a grant exists, reviewer selection and queues stay unchanged.",
        )}
      </Paragraph>
      <Space style={{ marginBottom: 12 }} wrap>
        <Input
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
          placeholder={t("Group name")}
        />
        <Select
          value={groupKind}
          onChange={setGroupKind}
          style={{ minWidth: 160 }}
          options={[
            { value: "student", label: roleText("student", t) },
            { value: "reviewer", label: roleText("reviewer", t) },
          ]}
        />
        <Button type="primary" onClick={() => void createGroup()}>
          {t("Create group")}
        </Button>
        <Button onClick={() => void loadGroups()} loading={loadingGroups}>
          {t("Refresh")}
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loadingGroups}
        dataSource={groups}
        pagination={false}
        onRow={(record) => ({ onClick: () => setSelectedGroupId(record.id) })}
        columns={[
          { title: t("Name"), dataIndex: "name" },
          {
            title: t("Kind"),
            dataIndex: "kind",
            render: (kind) => roleText(kind, t),
          },
          {
            title: t("Members"),
            render: (_v, row) => (row.members || []).length,
          },
          {
            title: t("Actions"),
            render: (_v, row) => (
              <Button
                size="small"
                danger
                onClick={(event) => {
                  event.stopPropagation();
                  void deleteGroup(row.id);
                }}
              >
                {t("Delete")}
              </Button>
            ),
          },
        ]}
      />
      {selectedGroup ? (
        <Space direction="vertical" style={{ width: "100%", marginTop: 16 }}>
          <Text strong>{selectedGroup.name}</Text>
          <Select
            mode="multiple"
            style={{ width: "100%" }}
            value={selectedGroup.members || []}
            options={groupMemberOptions}
            onChange={(userIds) => {
              void saveGroupMembers(userIds).catch((error) =>
                message.error(tr(error.message)),
              );
            }}
            placeholder={t("Assign users")}
          />
          {selectedGroup.kind === "reviewer" ? (
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              value={selectedGroup.grants || []}
              options={studentGroupOptions}
              onChange={(studentGroupIds) => {
                void saveGroupGrants(studentGroupIds).catch((error) =>
                  message.error(tr(error.message)),
                );
              }}
              placeholder={t("Student groups this reviewer group may review")}
            />
          ) : null}
        </Space>
      ) : null}
    </>
  );
}
