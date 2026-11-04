import { useI18n } from "../../i18n/I18nProvider";
import { Modal, Form, Typography, Input, Space, Button } from "antd";
const { Paragraph } = Typography;
import { useSession } from "./SessionContext";
export default function PasswordDialog() {
  const {
    passwordModalOpen,
    setPasswordModalOpen,
    passwordForm,
    handleChangePassword,
    auth,
    changingPassword,
  } = useSession();
  const { t } = useI18n();
  return (
    <Modal
      title={t("Change password")}
      open={passwordModalOpen}
      onCancel={() => {
        setPasswordModalOpen(false);
        passwordForm.resetFields();
      }}
      footer={null}
      destroyOnClose
    >
      <Form
        form={passwordForm}
        layout="vertical"
        onFinish={handleChangePassword}
      >
        {auth?.user?.hasPassword === false ? (
          <Paragraph type="secondary">
            {t(
              "This account has no password yet. Set one to sign in with your username.",
            )}
          </Paragraph>
        ) : (
          <Form.Item
            label={t("Current password")}
            name="currentPassword"
            rules={[
              { required: true, message: t("Enter your current password") },
            ]}
          >
            <Input.Password />
          </Form.Item>
        )}
        <Form.Item
          label={t("New password")}
          name="newPassword"
          rules={[
            { required: true, message: t("Enter a new password") },
            { min: 6, message: t("Password must be at least 6 characters") },
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          label={t("Confirm new password")}
          name="confirmPassword"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: t("Confirm your new password") },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t("Passwords do not match")));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Space>
          <Button
            onClick={() => {
              setPasswordModalOpen(false);
              passwordForm.resetFields();
            }}
          >
            {t("Cancel")}
          </Button>
          <Button type="primary" htmlType="submit" loading={changingPassword}>
            {t("Update password")}
          </Button>
        </Space>
      </Form>
    </Modal>
  );
}
