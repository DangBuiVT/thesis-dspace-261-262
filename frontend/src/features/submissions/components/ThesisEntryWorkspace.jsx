import SubmissionForm from "./SubmissionForm";
import { getStudentSubmissionCapabilities } from "../model/access.js";
import { Space, Typography, Button } from "antd";

const { Title, Paragraph } = Typography;
import { useSubmissions } from "../SubmissionContext.jsx";

import SubmissionDetail from "./SubmissionDetail";

export default function ThesisEntryWorkspace() {
  const {
    studentPrimarySubmitted,
    studentOwnDraft,
    isAdminActor,
    editingSubmissionId,
    actingStudentId,
    studentSubmissions,
    t,
    loadSubmissionIntoForm,
    isDeletingSubmission,
    promptDeleteSubmission,
  } = useSubmissions();

  const studentFocusRecord = studentPrimarySubmitted || studentOwnDraft;
  const showStudentRecordDetail =
    !isAdminActor && Boolean(studentFocusRecord) && !editingSubmissionId;
  const focusCaps = studentFocusRecord
    ? getStudentSubmissionCapabilities(
        studentFocusRecord,
        actingStudentId,
        studentSubmissions,
      )
    : null;

  return (
    <>
      {showStudentRecordDetail ? (
        <>
          <Space
            wrap
            style={{
              width: "100%",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Title level={5} style={{ margin: 0 }}>
              {studentFocusRecord.status === "draft"
                ? t("Draft details")
                : t("Submission details")}
            </Title>
            <Space>
              {focusCaps?.canEdit ? (
                <Button
                  type="primary"
                  onClick={() =>
                    void loadSubmissionIntoForm(studentFocusRecord)
                  }
                >
                  {t("Edit")}
                </Button>
              ) : null}
              {focusCaps?.canDelete ? (
                <Button
                  danger
                  loading={isDeletingSubmission}
                  onClick={() => promptDeleteSubmission(studentFocusRecord)}
                >
                  {t("Delete")}
                </Button>
              ) : null}
            </Space>
          </Space>
          {<SubmissionDetail record={studentFocusRecord} />}
        </>
      ) : (
        <>
          {isAdminActor ? (
            <Paragraph type="secondary">
              {t(
                "Create a draft or submit a thesis on behalf of a student. The selected student remains the submitter.",
              )}
            </Paragraph>
          ) : null}
          <SubmissionForm />
        </>
      )}
    </>
  );
}
