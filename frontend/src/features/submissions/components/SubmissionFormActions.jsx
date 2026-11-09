import { Space, Button } from "antd";

import { useSubmissions } from "../SubmissionContext.jsx";

export default function SubmissionFormActions() {
  const {
    editingSubmissionId,
    t,
    isDeletingSubmission,
    promptDeleteSubmission,
    submissionForm,
    showNative,
    structuralRequired,
    isFormReadOnly,
    handleSaveDraft,
    isSavingDraft,
    periodSelected,
    canSaveCurrentDraft,
    handleSubmitThesis,
    isSubmittingSubmission,
    canSubmitCurrentThesis,
    editingSubmissionStatus,
    editingSubmissionCapabilities,
    editingSubmissionRecord,
    resetSubmissionForm,
  } = useSubmissions();
  return (
    <Space wrap>
      {!isFormReadOnly ? (
        <>
          <Button
            onClick={() =>
              void handleSaveDraft(submissionForm.getFieldsValue())
            }
            loading={isSavingDraft}
            disabled={
              (showNative("submissionPeriodId") &&
                structuralRequired("submissionPeriodId") &&
                !periodSelected &&
                !editingSubmissionId) ||
              !canSaveCurrentDraft ||
              isFormReadOnly
            }
          >
            {t("Save draft")}
          </Button>
          <Button
            type="primary"
            onClick={() =>
              submissionForm
                .validateFields()
                .then(handleSubmitThesis)
                .catch(() => {})
            }
            loading={isSubmittingSubmission}
            disabled={
              (!periodSelected && !editingSubmissionId) ||
              !canSubmitCurrentThesis
            }
          >
            {editingSubmissionStatus === "rejected" ||
            editingSubmissionStatus === "reject" ||
            editingSubmissionStatus === "approved" ||
            editingSubmissionStatus === "reviewing"
              ? t("Submit again")
              : t("Submit thesis")}
          </Button>
          {editingSubmissionId && editingSubmissionCapabilities.canDelete ? (
            <Button
              danger
              loading={isDeletingSubmission}
              onClick={() =>
                editingSubmissionRecord &&
                promptDeleteSubmission(editingSubmissionRecord)
              }
            >
              {t("Delete")}
            </Button>
          ) : null}
        </>
      ) : null}
      {editingSubmissionId ? (
        <Button onClick={resetSubmissionForm}>
          {isFormReadOnly ? t("Close") : t("Cancel edit")}
        </Button>
      ) : null}
    </Space>
  );
}
