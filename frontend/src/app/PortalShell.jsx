import { Layout, Typography, Space, Button } from "antd";
import { useSession } from "../features/auth";
import { LanguageSwitch, useI18n } from "../i18n/I18nProvider";
const { Header, Content } = Layout;
const { Title, Text } = Typography;
const BRAND_SECONDARY = "#132d65";
const LOGO_PATH = "/images/01_logobachkhoatoi.png";
export default function PortalShell({ children }) {
  const { auth, passwordForm, setPasswordModalOpen, handleLogout } =
    useSession();
  const { t } = useI18n();
  return (
    <Layout className="portal-shell">
      <Header
        style={{
          background: BRAND_SECONDARY,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <a href="/home" aria-label={t("Home")} className="portal-brand">
          <Space align="center" size={12}>
            <img
              src={LOGO_PATH}
              alt="BK TP.HCM logo"
              style={{
                width: 56,
                height: 56,
                objectFit: "contain",
                display: "block",
              }}
            />
            <Title
              level={4}
              style={{ color: "#fff", margin: 0, lineHeight: "1.3" }}
            >
              {t("Thesis Deposit Portal")}
            </Title>
          </Space>
        </a>
        <Space size={12} align="center" wrap>
          <LanguageSwitch />
          {auth?.user ? (
            <Space size={12} align="center" wrap>
              <div style={{ textAlign: "right", lineHeight: 1.25 }}>
                <Text
                  style={{
                    color: "#ffffff",
                    display: "block",
                    fontWeight: 600,
                  }}
                >
                  {auth.user.displayName || auth.user.username}
                </Text>
                <Text
                  style={{ color: "#d7e8ff", display: "block", fontSize: 12 }}
                >
                  @{auth.user.username}
                </Text>
              </div>
              <Button
                onClick={() => {
                  passwordForm.resetFields();
                  setPasswordModalOpen(true);
                }}
              >
                {t("Change password")}
              </Button>
              <Button danger onClick={handleLogout}>
                {t("Log out")}
              </Button>
            </Space>
          ) : null}
        </Space>
      </Header>
      <Content>{children}</Content>
    </Layout>
  );
}
