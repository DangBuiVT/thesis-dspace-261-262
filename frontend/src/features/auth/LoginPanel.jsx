import { useI18n } from "../../i18n/I18nProvider";
import { Card, Space, Alert, Button, Form, Input } from "antd";
import { useSession } from "./SessionContext";
export default function LoginPanel() {
  const { loginMethod, isLoggingIn, loginForm, handleLogin } = useSession();
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
              description={t(
                "student1/student123, reviewer1/review123, library1/library123, director1/director123, admin1/admin123",
              )}
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
              <Button type="primary" htmlType="submit" loading={isLoggingIn}>
                {t("Login")}
              </Button>
            </Form>
          </>
        )}
      </Space>
    </Card>
  );
}
