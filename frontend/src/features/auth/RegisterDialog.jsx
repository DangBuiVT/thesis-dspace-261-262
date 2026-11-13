import { Button, Form, Input, Modal, Select, Space } from "antd";
import { useI18n } from "../../i18n/I18nProvider";
import { useSession } from "./SessionContext";

export default function RegisterDialog() {
  const {
    registerForm,
    registerOpen,
    registering,
    registerFaculties,
    loadingRegisterFaculties,
    closeRegister,
    handleRegister,
  } = useSession();
  const { t } = useI18n();
  return (
    <Modal
      title={t("Create student account")}
      open={registerOpen}
      onCancel={closeRegister}
      footer={null}
      destroyOnClose
    >
      <Form
        form={registerForm}
        layout="vertical"
        onFinish={handleRegister}
        autoComplete="off"
      >
        <Form.Item
          label={t("Username (student ID)")}
          name="username"
          rules={[
            { required: true, message: t("Please enter your username") },
            { min: 2, message: t("At least 2 characters") },
          ]}
        >
          <Input placeholder="2110001" />
        </Form.Item>
        <Form.Item
          label={t("Full name")}
          name="displayName"
          rules={[
            { required: true, message: t("Please enter your full name") },
            { min: 2, message: t("At least 2 characters") },
          ]}
        >
          <Input placeholder={t("Nguyen Van A")} />
        </Form.Item>
        <Form.Item
          label={t("Password")}
          name="password"
          rules={[
            { required: true, message: t("Please enter your password") },
            { min: 6, message: t("Password must be at least 6 characters") },
          ]}
        >
          <Input.Password placeholder="******" />
        </Form.Item>
        <Form.Item label={t("Faculty (optional)")} name="facultyId">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={t("Select faculty")}
            loading={loadingRegisterFaculties}
            options={registerFaculties}
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={closeRegister}>{t("Cancel")}</Button>
            <Button type="primary" htmlType="submit" loading={registering}>
              {t("Create account")}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
