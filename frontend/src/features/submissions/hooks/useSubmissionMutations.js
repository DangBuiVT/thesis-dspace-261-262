import {
  requestSubmission,
  requestSubmissionSubmit,
  requestSubmissionsResource,
  requestRevertToDraft,
  requestSubmissions,
} from "../api.js";
import { authHeaders, parseResponse } from "../../../shared/api/http.js";
import { message, Modal } from "antd";
import {
  canStaffDeleteSubmission,
  isSubmissionSubmitter,
  getStudentSubmissionCapabilities,
  canStudentSubmitThesis,
} from "../model/access.js";
import { fieldDisplayLabel } from "../../../i18n/labels.js";
import {
  DEFAULT_PUBLISHER,
  OTHER_FACULTY_VALUE,
} from "../model/formConfig.js";

export function useSubmissionMutations({
  auth,
  loadStudentSubmissions,
  loadStaffSubmissions,
  submissionForm,
  setIsDeletingSubmission,
  t,
  editingSubmissionId,
  resetSubmissionForm,
  setStudentDetailRecord,
  setStaffDetailRecord,
  loadDirectorQueue,
  loadLibraryQueue,
  tr,
  isAdminActor,
  studentSubmissions,
  setIsSubmittingSubmission,
  studentActiveSubmission,
  configurableFormFields,
  buildSubmissionFormData,
  resolveStudentEmail,
  editingSubmissionCapabilities,
  setIsSavingDraft,
  setEditingSubmissionStatus,
  setEditingSubmissionId,
  actingStudentId,
  editingSubmissionRecord,
  structuralRequired,
  showNative,
  editingSubmissionStatus,
}) {
  const refreshAfterSubmissionWrite = async () => {
    if (auth?.user?.role === "student") {
      await loadStudentSubmissions(auth.user.id);
      return;
    }
    if (auth?.user?.role === "admin") {
      await loadStaffSubmissions();
      const studentId = submissionForm.getFieldValue("studentId");
      if (studentId) {
        await loadStudentSubmissions(studentId);
      }
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    setIsDeletingSubmission(true);
    try {
      const response = await requestSubmission(submissionId, {
        method: "DELETE",
        headers: { ...authHeaders(auth.token) },
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to delete");
      }
      if (payload?.dspaceDeleteWarning) {
        message.warning(
          t(
            "Deleted from Portal, but DSpace item may still exist — check logs",
          ),
        );
      } else if (payload?.dspaceDeleted) {
        message.success(t("Deleted from Portal and DSpace"));
      } else {
        message.success(t("Deleted"));
      }
      if (editingSubmissionId === submissionId) {
        resetSubmissionForm();
      }
      setStudentDetailRecord((current) =>
        current?.id === submissionId ? null : current,
      );
      setStaffDetailRecord((current) =>
        current?.id === submissionId ? null : current,
      );
      if (auth.user.role === "student") {
        await loadStudentSubmissions(auth.user.id);
      }
      if (auth.user.role === "admin") {
        await refreshAfterSubmissionWrite();
      }
      if (canStaffDeleteSubmission(auth.user.role)) {
        await loadStaffSubmissions();
        if (auth.user.role === "director") {
          await loadDirectorQueue();
        }
        if (auth.user.role === "library_staff") {
          await loadLibraryQueue();
        }
      }
    } catch (error) {
      message.error(tr(error.message || "Failed to delete"));
    } finally {
      setIsDeletingSubmission(false);
    }
  };

  const promptDeleteSubmission = (record) => {
    const title = record.title_en || record.title || t("this thesis");
    Modal.confirm({
      title: t("Delete thesis?"),
      content: t('Delete "{{title}}"? This cannot be undone.', { title }),
      okText: t("Delete"),
      okType: "danger",
      cancelText: t("Cancel"),
      onOk: () => handleDeleteSubmission(record.id),
    });
  };

  const promptStaffDeleteSubmission = (record) => {
    const title = record.title_en || record.title || t("this thesis");
    const archived = record.status === "archived";
    const hasDspace = Boolean(
      record.dspace_item_id &&
        !String(record.dspace_item_id).startsWith("dev-item-"),
    );
    Modal.confirm({
      title: t("Delete submission?"),
      content: archived
        ? hasDspace
          ? t(
              'Delete "{{title}}" from Portal and remove the linked DSpace item ({{id}})? This cannot be undone.',
              {
                title,
                id: record.dspace_item_id,
              },
            )
          : t(
              'Delete archived submission "{{title}}"? This cannot be undone.',
              { title },
            )
        : t('Delete "{{title}}"? This cannot be undone.', { title }),
      okText: t("Delete"),
      okType: "danger",
      cancelText: t("Cancel"),
      onOk: () => handleDeleteSubmission(record.id),
    });
  };

  const handleSubmitDraftFromDetail = async (record) => {
    const ownerId = record.submitter_id || auth.user.id;
    if (!isAdminActor && !isSubmissionSubmitter(record, auth.user.id)) {
      message.warning(t("Only the submitter can submit this thesis."));
      return;
    }
    const caps = getStudentSubmissionCapabilities(
      record,
      ownerId,
      studentSubmissions,
    );
    if (!caps.canSubmit || record.status !== "draft") {
      message.warning(
        t("This thesis cannot be submitted from Detail right now."),
      );
      return;
    }
    setIsSubmittingSubmission(true);
    try {
      if (
        !canStudentSubmitThesis(studentSubmissions, ownerId, record.id, record)
      ) {
        throw new Error(
          studentActiveSubmission
            ? "This student already has a submitted thesis. Edit that thesis to update and resubmit it."
            : "Unable to submit thesis",
        );
      }
      if (!Array.isArray(record.files) || record.files.length === 0) {
        throw new Error(
          "Please edit the draft and upload a thesis PDF before submitting",
        );
      }
      const authorIds = Array.isArray(record.author_user_ids)
        ? record.author_user_ids
        : [];
      const reviewerIds = Array.isArray(record.reviewer_user_ids)
        ? record.reviewer_user_ids
        : [];
      if (!record.title_vi?.trim()) {
        throw new Error(
          "Vietnamese thesis title is required — edit the draft first",
        );
      }
      if (!(record.title_en || record.title)?.trim()) {
        throw new Error(
          "English thesis title is required — edit the draft first",
        );
      }
      if (!record.thesis_advisors?.trim()) {
        throw new Error("Advisor(s) is required — edit the draft first");
      }
      if (!record.major?.trim()) {
        throw new Error("Major is required — edit the draft first");
      }
      if (!record.thesis_year) {
        throw new Error("Year is required — edit the draft first");
      }
      for (const field of configurableFormFields) {
        if (!field.required) {
          continue;
        }
        const fromColumn =
          field.fieldKey === "abstract"
            ? record.abstract
            : field.fieldKey === "dateIssued"
              ? record.date_issued || record.thesis_year
              : field.fieldKey === "publisher"
                ? record.publisher || record.university_name
                : field.fieldKey === "documentType"
                  ? record.document_type
                  : field.fieldKey === "language"
                    ? record.language
                    : field.fieldKey === "description"
                      ? record.description
                      : record.extra_metadata?.[field.fieldKey];
        if (!String(fromColumn ?? "").trim()) {
          throw new Error(
            t("{{label}} is required — edit the draft first", {
              label: fieldDisplayLabel(field, t),
            }),
          );
        }
      }
      if (!record.submission_period_id) {
        throw new Error(
          t("Submission period is required — edit the draft first"),
        );
      }
      if (reviewerIds.length === 0) {
        throw new Error(
          "Please select at least one reviewer — edit the draft first",
        );
      }
      const formData = buildSubmissionFormData(
        {
          studentId: ownerId,
          email: record.student_email || resolveStudentEmail(ownerId),
          titleVi: record.title_vi,
          titleEn: record.title_en || record.title,
          thesisAdvisors: record.thesis_advisors,
          major: record.major,
          thesisYear: record.thesis_year,
          dateIssued: record.date_issued || record.thesis_year,
          publisher:
            record.publisher || record.university_name || DEFAULT_PUBLISHER,
          documentType: record.document_type || "Thesis",
          language: record.language || "vie",
          description: record.description,
          abstract: record.abstract,
          authorIds: authorIds.length > 0 ? authorIds : [ownerId],
          reviewerIds,
          submissionPeriodId: record.submission_period_id,
          thesisFile: [],
        },
        { requireThesisFile: false },
      );
      if (!formData) {
        return;
      }
      const response = await requestSubmissionSubmit(record.id, {
        method: "POST",
        headers: { ...authHeaders(auth.token) },
        body: formData,
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to submit thesis");
      }
      message.success(t("Thesis submitted successfully"));
      setStudentDetailRecord(null);
      if (editingSubmissionId === record.id) {
        resetSubmissionForm();
      }
      await refreshAfterSubmissionWrite();
    } catch (error) {
      message.error(tr(error.message || "Failed to submit thesis"));
    } finally {
      setIsSubmittingSubmission(false);
    }
  };

  const handleSaveDraft = async (values) => {
    const shouldRevert =
      auth.user.role === "student" &&
      Boolean(editingSubmissionId) &&
      editingSubmissionCapabilities.canRevertToDraft;
    setIsSavingDraft(true);
    try {
      const formData = buildSubmissionFormData(values, {
        requireThesisFile: false,
      });
      if (!formData) {
        return;
      }
      const url = editingSubmissionId
        ? `/api/submissions/${editingSubmissionId}`
        : "/api/submissions/drafts";
      const method = editingSubmissionId ? "PATCH" : "POST";
      const response = await requestSubmissionsResource(url, {
        method,
        headers: { ...authHeaders(auth.token) },
        body: formData,
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to save draft");
      }
      let reverted = false;
      if (shouldRevert && editingSubmissionId) {
        const revertResponse = await requestRevertToDraft(editingSubmissionId, {
          method: "POST",
          headers: { ...authHeaders(auth.token) },
        });
        const revertPayload = await parseResponse(revertResponse);
        if (!revertResponse.ok) {
          throw new Error(
            revertPayload?.message || "Failed to revert to draft",
          );
        }
        reverted = true;
        setEditingSubmissionStatus("draft");
      }
      if (payload?.id) {
        setEditingSubmissionId(payload.id);
        if (!reverted) {
          setEditingSubmissionStatus(payload.status || "draft");
        }
      }
      message.success(reverted ? t("Reverted to draft") : t("Draft saved"));
      await refreshAfterSubmissionWrite();
      if (auth.user.role === "admin") {
        resetSubmissionForm();
      }
    } catch (error) {
      message.error(tr(error.message || "Failed to save draft"));
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmitThesis = async (values) => {
    setIsSubmittingSubmission(true);
    try {
      if (
        !canStudentSubmitThesis(
          studentSubmissions,
          actingStudentId,
          editingSubmissionId,
          editingSubmissionRecord,
        )
      ) {
        throw new Error(
          editingSubmissionRecord?.status === "reviewing"
            ? "This thesis is already under review. Revert it to draft first if all reviewers are still pending."
            : studentActiveSubmission
              ? "This student already has a submitted thesis. Edit that thesis to update and resubmit it."
              : "Unable to submit thesis",
        );
      }
      const formData = buildSubmissionFormData(values, {
        requireThesisFile: !editingSubmissionId,
      });
      if (!formData) {
        return;
      }
      if (structuralRequired("titleVi") && !values.titleVi?.trim()) {
        throw new Error("Vietnamese thesis title is required");
      }
      if (structuralRequired("titleEn") && !values.titleEn?.trim()) {
        throw new Error("English thesis title is required");
      }
      if (
        structuralRequired("thesisAdvisors") &&
        !values.thesisAdvisors?.trim()
      ) {
        throw new Error("Advisor(s) is required");
      }
      if (structuralRequired("major") && !values.major?.trim()) {
        throw new Error("Major is required");
      }
      if (structuralRequired("thesisYear") && !values.thesisYear) {
        throw new Error("Year is required");
      }
      for (const field of configurableFormFields) {
        if (!field.required) {
          continue;
        }
        if (!String(values[field.fieldKey] ?? "").trim()) {
          throw new Error(
            t("{{label}} is required", { label: fieldDisplayLabel(field, t) }),
          );
        }
      }
      // Admin overrides: a hand-typed faculty has no period; a disabled reviewer step needs no reviewer.
      const adminOtherFaculty =
        isAdminActor && values.archiveFacultyId === OTHER_FACULTY_VALUE;
      const adminReviewerOff = isAdminActor && values.workflowReviewer === false;
      if (
        structuralRequired("submissionPeriodId") &&
        !values.submissionPeriodId &&
        !adminOtherFaculty
      ) {
        throw new Error("Please select a submission period");
      }
      const reviewerIds = Array.isArray(values.reviewerIds)
        ? values.reviewerIds
        : [];
      if (
        showNative("reviewerIds") &&
        structuralRequired("reviewerIds") &&
        !adminReviewerOff &&
        reviewerIds.length === 0
      ) {
        throw new Error("Please select at least one reviewer");
      }
      if (
        !showNative("reviewerIds") &&
        structuralRequired("reviewerIds") &&
        !adminReviewerOff &&
        !String(values.reviewerIds ?? "").trim()
      ) {
        throw new Error("Please select at least one reviewer");
      }

      let response;
      if (editingSubmissionId) {
        response = await requestSubmissionSubmit(editingSubmissionId, {
          method: "POST",
          headers: { ...authHeaders(auth.token) },
          body: formData,
        });
      } else {
        if (
          showNative("thesisFile") &&
          structuralRequired("thesisFile") &&
          !values.thesisFile?.[0]?.originFileObj
        ) {
          throw new Error("Please upload a thesis PDF file");
        }
        response = await requestSubmissions({
          method: "POST",
          headers: { ...authHeaders(auth.token) },
          body: formData,
        });
      }
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to submit thesis");
      }

      message.success(
        editingSubmissionStatus === "rejected" ||
          editingSubmissionStatus === "reject"
          ? t("Thesis updated and submitted for review")
          : t("Thesis submitted successfully"),
      );
      resetSubmissionForm();
      await refreshAfterSubmissionWrite();
    } catch (error) {
      message.error(tr(error.message || "Failed to submit thesis"));
    } finally {
      setIsSubmittingSubmission(false);
    }
  };
  return {
    refreshAfterSubmissionWrite,
    handleDeleteSubmission,
    promptDeleteSubmission,
    promptStaffDeleteSubmission,
    handleSubmitDraftFromDetail,
    handleSaveDraft,
    handleSubmitThesis,
  };
}
