import { Modal, Form, Input, Select, Space, Button } from "antd";
import { ROLES } from "../model/constants.js";
import { roleText } from "../../../i18n/labels";
import { useAdmin } from "../AdminContext";
export default function UserEditorDialog() {
  const {
    editingUser,
    t,
    userModalOpen,
    setUserModalOpen,
    userForm,
    saveUser,
    facultyRequired,
    faculties,
    savingUser,
  } = useAdmin();
  return (
    <Modal
      title={
        editingUser
          ? t("Edit user: {{name}}", { name: editingUser.username })
          : t("Create user")
      }
      open={userModalOpen}
      onCancel={() => setUserModalOpen(false)}
      footer={null}
      destroyOnClose
    >
      <Form form={userForm} layout="vertical" onFinish={saveUser}>
        {!editingUser ? (
          <Form.Item
            label={t("Username")}
            name="username"
            rules={[{ required: true, message: t("Username is required") }]}
          >
            <Input />
          </Form.Item>
        ) : (
          <Form.Item label={t("Username")}>
            <Input value={editingUser.username} disabled />
          </Form.Item>
        )}
        <Form.Item
          label={t("Display name")}
          name="displayName"
          rules={[{ required: true, message: t("Display name is required") }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label={t("Role")} name="role" rules={[{ required: true }]}>
          <Select
            options={ROLES.map((r) => ({ value: r, label: roleText(r, t) }))}
          />
        </Form.Item>
        <Form.Item
          label={t("Faculty")}
          name="facultyId"
          rules={
            facultyRequired
              ? [
                  {
                    required: true,
                    message: t(
                      "Faculty is required for students and reviewers",
                    ),
                  },
                ]
              : []
          }
        >
          <Select
            allowClear={!facultyRequired}
            showSearch
            optionFilterProp="label"
            placeholder={facultyRequired ? t("Select faculty") : t("Optional")}
            options={faculties.map((faculty) => ({
              value: faculty.id,
              label: faculty.name,
            }))}
          />
        </Form.Item>
        {editingUser ? (
          <Form.Item
            label={t("Status")}
            name="status"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "active", label: t("active") },
                { value: "disabled", label: t("disabled") },
              ]}
            />
          </Form.Item>
        ) : null}
        <Form.Item
          label={editingUser ? t("New password (optional)") : t("Password")}
          name="password"
          rules={
            editingUser
              ? [{ min: 6, message: t("At least 6 characters") }]
              : [
                  { required: true, message: t("Password is required") },
                  { min: 6, message: t("At least 6 characters") },
                ]
          }
        >
          <Input.Password />
        </Form.Item>
        <Space>
          <Button onClick={() => setUserModalOpen(false)}>{t("Cancel")}</Button>
          <Button type="primary" htmlType="submit" loading={savingUser}>
            {editingUser ? t("Save changes") : t("Create")}
          </Button>
        </Space>
      </Form>
    </Modal>
  );
}
