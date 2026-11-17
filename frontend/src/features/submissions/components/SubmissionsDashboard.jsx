import { Alert, Button, Card, Space, Typography } from "antd";
import { useSubmissions } from "../SubmissionContext";
import ThesisEntryWorkspace from "./ThesisEntryWorkspace";
import ReviewerDashboard from "./ReviewerDashboard";
import AdminSubmissionDashboard from "./AdminSubmissionDashboard";
import StaffDashboard from "./StaffDashboard";
const { Text } = Typography;
export default function SubmissionsDashboard(slots) {
  const {
    auth,
    t,
    queueError,
    loadReviewerQueue,
    loadStaffSubmissions,
    loadLibraryQueue,
    loadDirectorQueue,
  } = useSubmissions();
  return (
    <Card
      title={t(auth.user.role === "student" ? "My submissions" : "My tasks")}
      style={{
        width: "100%",
        borderColor: "#d6eaff",
        boxShadow: "0 6px 18px rgba(3, 3, 145, 0.08)",
      }}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Text>
          {t("Welcome back, {{name}}.", { name: auth.user.username })}
        </Text>
        {queueError && (
          <Alert
            type="error"
            showIcon
            message={t(queueError)}
            action={
              <Button
                onClick={() => {
                  if (auth.user.role === "reviewer") void loadReviewerQueue();
                  else {
                    void loadStaffSubmissions();
                    if (auth.user.role === "library_staff")
                      void loadLibraryQueue();
                    if (auth.user.role === "director") void loadDirectorQueue();
                  }
                }}
              >
                {t("Retry")}
              </Button>
            }
          />
        )}
        {auth.user.role === "student" ? (
          <ThesisEntryWorkspace />
        ) : auth.user.role === "reviewer" ? (
          <ReviewerDashboard />
        ) : auth.user.role === "admin" ? (
          <AdminSubmissionDashboard {...slots} />
        ) : ["library_staff", "director"].includes(auth.user.role) ? (
          <StaffDashboard {...slots} />
        ) : (
          <Typography.Paragraph type="secondary">
            {t("Unknown role.")}
          </Typography.Paragraph>
        )}
      </Space>
    </Card>
  );
}
