import { useI18n } from "../../i18n/I18nProvider";
import { Card, Space, Alert, Button, Form, Input } from "antd";
import { useSession } from "./SessionContext";
import RegisterDialog from "./RegisterDialog";

// Local demo accounts seeded by db/init/001_schema.sql (password login only).
const DEMO_ACCOUNTS = [
  { label: "Student", username: "student1", password: "student123" },
  { label: "Reviewer", username: "reviewer1", password: "review123" },
  { label: "Library staff", username: "library1", password: "library123" },
  { label: "Director", username: "director1", password: "director123" },
  { label: "Admin", username: "admin1", password: "admin123" },
];

export default function LoginPanel() {
  const { loginMethod, isLoggingIn, loginForm, handleLogin, openRegister } =
    useSession();
  const { t } = useI18n();
  return (
    <Card
      title={t("Login")}
      style={{
        maxWidth: 560,
        borderColor: "#d6eaff",
        boxShadow: "0 6px 18px rgba(3, 3, 145, 0.08)",
      }}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {loginMethod === "google" ? (
          <>
            <Alert
              type="info"
              showIcon
              message={t("HCMUT Google sign-in")}
              description={t(
                "Sign in with your verified @hcmut.edu.vn Google account.",
              )}
            />
            <Button
              type="primary"
              size="large"
              block
              loading={isLoggingIn}
              onClick={() => {
                window.location.href = "/api/auth/google";
              }}
            >
              {t("Login with Google")}
            </Button>
          </>
        ) : (
          <>
            <Alert
              type="info"
              showIcon
              message={t("Demo credentials")}
              description={
                <Space wrap size={[6, 6]} style={{ marginTop: 6 }}>
                  {DEMO_ACCOUNTS.map((account) => (
                    <Button
                      key={account.username}
                      size="small"
                      onClick={() =>
                        loginForm.setFieldsValue({
                          username: account.username,
                          password: account.password,
                        })
                      }
                    >
                      {t(account.label)} ({account.username})
                    </Button>
                  ))}
                </Space>
              }
            />
            <Form
              form={loginForm}
              layout="vertical"
              onFinish={handleLogin}
              autoComplete="off"
            >
              <Form.Item
                label={t("Username")}
                name="username"
                rules={[
                  { required: true, message: t("Please enter your username") },
                ]}
              >
                <Input placeholder="student1" />
              </Form.Item>
              <Form.Item
                label={t("Password")}
                name="password"
                rules={[
                  { required: true, message: t("Please enter your password") },
                  {
                    min: 6,
                    message: t("Password must be at least 6 characters"),
                  },
                ]}
              >
                <Input.Password placeholder="******" />
              </Form.Item>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Button type="primary" htmlType="submit" loading={isLoggingIn}>
                  {t("Login")}
                </Button>
                <Button onClick={() => void openRegister()}>
                  {t("Create student account")}
                </Button>
              </Space>
            </Form>
            <RegisterDialog />
          </>
        )}
      </Space>
    </Card>
  );
}
