import { Space, Button } from "antd";

import { useSubmissions } from "../SubmissionContext.jsx";

export default function SubmissionFormActions({ canSubmit = true, onNext, onBack, onValidationError } = {}) {
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
    isOtherFaculty,
  } = useSubmissions();
  // A hand-typed faculty (admin) has no submission period to select.
  const periodReady = periodSelected || isOtherFaculty;
  return (
    <Space wrap>
      {onBack && <Button onClick={onBack}>{t("Back")}</Button>}
      {onNext && <Button type="primary" onClick={onNext}>{t("Next")}</Button>}
      {!isFormReadOnly ? (
        <>
          <Button
            onClick={() =>
              void handleSaveDraft(submissionForm.getFieldsValue(true))
            }
            loading={isSavingDraft}
            disabled={
              !canSaveCurrentDraft ||
              isFormReadOnly
            }
          >
            {t("Save draft")}
          </Button>
          {canSubmit && <Button
            type="primary"
            onClick={() =>
              submissionForm
                .validateFields()
                .then(handleSubmitThesis)
                .catch(error => onValidationError?.(error))
            }
            loading={isSubmittingSubmission}
            disabled={
              (structuralRequired("submissionPeriodId") && !periodReady && !editingSubmissionId) ||
              !canSubmitCurrentThesis
            }
          >
            {editingSubmissionStatus === "rejected" ||
            editingSubmissionStatus === "reject" ||
            editingSubmissionStatus === "approved" ||
            editingSubmissionStatus === "reviewing"
              ? t("Submit again")
              : t("Submit thesis")}
          </Button>}
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
