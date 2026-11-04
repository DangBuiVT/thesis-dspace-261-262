import { useMemo } from "react";
import {
  isSubmittedStatus,
  isSubmissionSubmitter,
  isSubmissionCoAuthor,
  getStudentSubmissionCapabilities,
  canStudentSubmitThesis,
  canStudentSaveDraft,
  studentBlocksNewDraftOrSubmit,
} from "../model/access.js";

export function useSubmissionPermissions({
  submissionPeriodId,
  studentSubmissions,
  actingStudentId,
  editingSubmissionId,
  staffSubmissions,
  isAdminActor,
  auth,
  editingSubmissionStatus,
}) {
  const periodSelected = Boolean(submissionPeriodId);

  const studentActiveSubmission = useMemo(
    () =>
      studentSubmissions.find(
        (item) =>
          isSubmittedStatus(item.status) &&
          isSubmissionSubmitter(item, actingStudentId),
      ),
    [studentSubmissions, actingStudentId],
  );

  const studentOwnDraft = useMemo(
    () =>
      studentSubmissions.find(
        (item) =>
          item.status === "draft" &&
          isSubmissionSubmitter(item, actingStudentId),
      ) ?? null,
    [studentSubmissions, actingStudentId],
  );

  const studentPrimarySubmitted = useMemo(() => {
    if (studentActiveSubmission) {
      return studentActiveSubmission;
    }
    return (
      (studentSubmissions || []).find(
        (item) =>
          isSubmittedStatus(item.status) &&
          isSubmissionCoAuthor(item, actingStudentId),
      ) ?? null
    );
  }, [studentActiveSubmission, studentSubmissions, actingStudentId]);

  const editingSubmissionRecord = useMemo(
    () =>
      studentSubmissions.find((item) => item.id === editingSubmissionId) ??
      staffSubmissions.find((item) => item.id === editingSubmissionId) ??
      null,
    [studentSubmissions, staffSubmissions, editingSubmissionId],
  );

  const isFormReadOnly = useMemo(() => {
    if (isAdminActor) {
      return false;
    }
    if (!editingSubmissionRecord || !auth?.user?.id) {
      return false;
    }
    return !isSubmissionSubmitter(editingSubmissionRecord, auth.user.id);
  }, [isAdminActor, editingSubmissionRecord, auth?.user?.id]);

  const canChangeSubmissionPeriod = useMemo(() => {
    if (isFormReadOnly) {
      return false;
    }
    // Draft: allow changing period. Submitted theses keep period locked.
    if (!editingSubmissionId) {
      return true;
    }
    return editingSubmissionStatus === "draft";
  }, [isFormReadOnly, editingSubmissionId, editingSubmissionStatus]);

  const editingSubmissionCapabilities = useMemo(
    () =>
      editingSubmissionRecord
        ? getStudentSubmissionCapabilities(
            editingSubmissionRecord,
            actingStudentId,
            studentSubmissions,
          )
        : {
            canEdit: Boolean(actingStudentId),
            canDelete: false,
            canRevertToDraft: false,
            canSubmit:
              Boolean(actingStudentId) &&
              canStudentSubmitThesis(
                studentSubmissions,
                actingStudentId,
                null,
                null,
              ),
          },
    [editingSubmissionRecord, studentSubmissions, actingStudentId],
  );

  const canSubmitCurrentThesis = useMemo(
    () =>
      Boolean(actingStudentId) &&
      canStudentSubmitThesis(
        studentSubmissions,
        actingStudentId,
        editingSubmissionId,
        editingSubmissionRecord,
      ),
    [
      studentSubmissions,
      actingStudentId,
      editingSubmissionId,
      editingSubmissionRecord,
    ],
  );

  const canSaveCurrentDraft = useMemo(
    () =>
      Boolean(actingStudentId) &&
      canStudentSaveDraft(
        studentSubmissions,
        actingStudentId,
        editingSubmissionRecord,
      ),
    [studentSubmissions, actingStudentId, editingSubmissionRecord],
  );

  const submitBlockMessage = useMemo(() => {
    if (!actingStudentId) {
      return isAdminActor
        ? "Select a student to create or submit a thesis on their behalf."
        : null;
    }
    const excludeId =
      editingSubmissionRecord &&
      isSubmissionSubmitter(editingSubmissionRecord, actingStudentId)
        ? editingSubmissionId
        : undefined;
    return studentBlocksNewDraftOrSubmit(
      studentSubmissions,
      actingStudentId,
      excludeId,
    );
  }, [
    isAdminActor,
    studentSubmissions,
    actingStudentId,
    editingSubmissionId,
    editingSubmissionRecord,
  ]);
  return {
    periodSelected,
    studentActiveSubmission,
    studentOwnDraft,
    studentPrimarySubmitted,
    editingSubmissionRecord,
    isFormReadOnly,
    canChangeSubmissionPeriod,
    editingSubmissionCapabilities,
    canSubmitCurrentThesis,
    canSaveCurrentDraft,
    submitBlockMessage,
  };
}
