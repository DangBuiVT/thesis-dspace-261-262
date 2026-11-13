import { studentEmailFromUser } from "../model/people.js";
import { validateThesisPdf, thesisFileListFromRecord } from "../model/files.js";
import {
  defaultArchiveMetadata,
  DEFAULT_PUBLISHER,
  OTHER_FACULTY_VALUE,
  WORKFLOW_STEP_FIELDS,
} from "../model/formConfig.js";
import { getStoredSignatureStyle } from "../../../shared/signature.js";
import { isSubmissionSubmitter } from "../model/access.js";
import { message } from "antd";

export function useSubmissionSelection({
  auth,
  studentOptions,
  setEditingSubmissionId,
  setEditingSubmissionStatus,
  submissionForm,
  setArchiveSemesters,
  setArchivePeriods,
  loadStudentSubmissions,
  setStudentSubmissions,
  loadArchiveSemesters,
  showNative,
  structuralRequired,
  configurableFormFields,
  t,
  thesisMaxFileSizeMb,
  setAdminSubmissionModalOpen,
  loadSubmissionFormFields,
  isAdminActor,
  setArchiveFaculties,
  loadArchivePeriods,
  setAdminDashTab,
  setStaffDetailRecord,
}) {
  const resolveStudentEmail = (studentId) => {
    if (!studentId) {
      return "";
    }
    if (auth?.user?.role === "student" && studentId === auth.user.id) {
      return studentEmailFromUser(auth.user);
    }
    const option = studentOptions.find((item) => item.value === studentId);
    if (option?.username) {
      return studentEmailFromUser({ username: option.username });
    }
    return "";
  };

  const handleAdminStudentChange = (studentId) => {
    setEditingSubmissionId(null);
    setEditingSubmissionStatus(null);
    const email = resolveStudentEmail(studentId);
    submissionForm.setFieldsValue({
      studentId,
      email,
      authorIds: undefined,
      archiveFacultyId: undefined,
      archiveSemesterId: undefined,
      submissionPeriodId: undefined,
      thesisFile: [],
    });
    setArchiveSemesters([]);
    setArchivePeriods([]);
    if (studentId) {
      void loadStudentSubmissions(studentId);
    } else {
      setStudentSubmissions([]);
    }
  };

  const applyStudentFaculty = (studentId) => {
    const student = studentOptions.find((item) => item.value === studentId);
    const facultyId = student?.facultyId || "";
    submissionForm.setFieldsValue({
      archiveFacultyId: facultyId || undefined,
      archiveSemesterId: undefined,
      submissionPeriodId: undefined,
    });
    setArchivePeriods([]);
    if (facultyId) {
      void loadArchiveSemesters(facultyId);
    } else {
      setArchiveSemesters([]);
    }
  };

  const handleAdminAuthorsChange = (authorIds) => {
    const selected = Array.isArray(authorIds) ? authorIds.filter(Boolean) : [];
    const currentStudentId = submissionForm.getFieldValue("studentId");
    if (currentStudentId && selected.includes(currentStudentId)) {
      return;
    }
    const nextStudentId = selected[0];
    if (!nextStudentId) {
      submissionForm.setFieldsValue({
        studentId: undefined,
        email: "",
        archiveFacultyId: undefined,
        archiveSemesterId: undefined,
        submissionPeriodId: undefined,
      });
      setArchiveSemesters([]);
      setArchivePeriods([]);
      setStudentSubmissions([]);
      return;
    }
    submissionForm.setFieldsValue({
      studentId: nextStudentId,
      email: resolveStudentEmail(nextStudentId),
    });
    applyStudentFaculty(nextStudentId);
    void loadStudentSubmissions(nextStudentId);
  };

  const buildSubmissionFormData = (
    values,
    { requireThesisFile = false } = {},
  ) => {
    const formData = new FormData();
    const authorsNative = showNative("authorIds");
    const reviewersNative = showNative("reviewerIds");
    const pickedAuthors = Array.isArray(values.authorIds)
      ? values.authorIds.filter(Boolean)
      : [];
    const studentId =
      auth.user.role === "admin"
        ? values.studentId || pickedAuthors[0]
        : auth.user.id;
    const authorIds = authorsNative
      ? pickedAuthors
      : studentId
        ? [studentId]
        : [];
    const reviewerIds =
      reviewersNative && Array.isArray(values.reviewerIds)
        ? values.reviewerIds
        : [];
    if (!studentId) {
      throw new Error("Please select a student author");
    }
    if (
      authorsNative &&
      structuralRequired("authorIds") &&
      authorIds.length === 0
    ) {
      throw new Error("Please search and select at least one student author");
    }
    if (
      authorsNative &&
      authorIds.length > 0 &&
      !authorIds.includes(studentId)
    ) {
      throw new Error(
        "The submitting student must be included in the author list",
      );
    }
    formData.append("studentId", studentId);
    formData.append(
      "email",
      (values.email || resolveStudentEmail(studentId)).trim(),
    );
    if (values.titleVi?.trim()) {
      formData.append("titleVi", values.titleVi.trim());
    }
    if (values.titleEn?.trim()) {
      formData.append("titleEn", values.titleEn.trim());
    }
    if (values.thesisAdvisors?.trim()) {
      formData.append("thesisAdvisors", values.thesisAdvisors.trim());
    }
    if (values.major?.trim()) {
      formData.append("major", values.major.trim());
    }
    if (values.thesisYear) {
      formData.append("thesisYear", String(values.thesisYear).trim());
    }
    const metadata = {};
    for (const field of configurableFormFields) {
      const raw = values[field.fieldKey];
      if (raw == null) {
        continue;
      }
      const text = String(raw).trim();
      if (!text) {
        continue;
      }
      metadata[field.fieldKey] = text;
      if (
        field.fieldKey === "dateIssued" ||
        field.fieldKey === "publisher" ||
        field.fieldKey === "documentType" ||
        field.fieldKey === "language" ||
        field.fieldKey === "description" ||
        field.fieldKey === "abstract"
      ) {
        formData.append(field.fieldKey, text);
      }
    }
    if (!metadata.dateIssued && values.thesisYear) {
      metadata.dateIssued = String(values.thesisYear).trim();
      formData.append("dateIssued", metadata.dateIssued);
    }
    if (
      !authorsNative &&
      values.authorIds != null &&
      !Array.isArray(values.authorIds) &&
      String(values.authorIds).trim()
    ) {
      metadata.authorIds = String(values.authorIds).trim();
    }
    if (
      !reviewersNative &&
      values.reviewerIds != null &&
      !Array.isArray(values.reviewerIds) &&
      String(values.reviewerIds).trim()
    ) {
      metadata.reviewerIds = String(values.reviewerIds).trim();
    }
    if (
      !showNative("thesisFile") &&
      typeof values.thesisFile === "string" &&
      values.thesisFile.trim()
    ) {
      metadata.thesisFile = values.thesisFile.trim();
    }
    formData.append("metadata", JSON.stringify(metadata));
    formData.append("authorIds", JSON.stringify(authorIds));
    formData.append("reviewerIds", JSON.stringify(reviewerIds));
    const adminOtherFaculty =
      auth.user.role === "admin" &&
      values.archiveFacultyId === OTHER_FACULTY_VALUE;
    if (values.submissionPeriodId && !adminOtherFaculty) {
      formData.append("submissionPeriodId", values.submissionPeriodId);
    }
    if (auth.user.role === "admin") {
      // Admin overrides: faculty of this submission and the review steps that stay enabled.
      if (adminOtherFaculty) {
        formData.append(
          "facultyOtherName",
          String(values.facultyOtherName || "").trim(),
        );
      } else if (values.archiveFacultyId) {
        formData.append("facultyId", values.archiveFacultyId);
      }
      formData.append(
        "workflowRoles",
        JSON.stringify(
          WORKFLOW_STEP_FIELDS.filter(
            (step) => values[step.name] !== false,
          ).map((step) => step.role),
        ),
      );
      const signatureStyle = getStoredSignatureStyle(null);
      if (signatureStyle) {
        formData.append("signatureStyle", signatureStyle);
      }
    }
    const thesisFile = values.thesisFile?.[0]?.originFileObj;
    if (thesisFile) {
      if (!validateThesisPdf(thesisFile, t, thesisMaxFileSizeMb)) {
        return null;
      }
      formData.append("thesisFile", thesisFile);
    } else if (
      requireThesisFile &&
      showNative("thesisFile") &&
      structuralRequired("thesisFile", true)
    ) {
      throw new Error("Please upload a thesis PDF file");
    }
    return formData;
  };

  const resetSubmissionForm = () => {
    const studentId =
      auth.user.role === "admin"
        ? submissionForm.getFieldValue("studentId")
        : auth.user.id;
    setEditingSubmissionId(null);
    setEditingSubmissionStatus(null);
    submissionForm.resetFields();
    setArchiveSemesters([]);
    setArchivePeriods([]);
    submissionForm.setFieldsValue({
      studentId,
      authorIds:
        auth.user.role === "admin"
          ? undefined
          : studentId
            ? [studentId]
            : undefined,
      email: resolveStudentEmail(studentId),
      thesisYear: String(new Date().getFullYear()),
      ...defaultArchiveMetadata(),
    });
    if (auth.user.role === "admin") {
      setAdminSubmissionModalOpen(false);
    }
  };

  const openAdminCreateSubmission = () => {
    setEditingSubmissionId(null);
    setEditingSubmissionStatus(null);
    submissionForm.resetFields();
    setArchiveSemesters([]);
    setArchivePeriods([]);
    submissionForm.setFieldsValue({
      authorIds: undefined,
      thesisYear: String(new Date().getFullYear()),
      ...defaultArchiveMetadata(),
    });
    setAdminSubmissionModalOpen(true);
    void loadSubmissionFormFields(auth.token);
  };

  const loadSubmissionIntoForm = async (record) => {
    const recordStudentId = record.submitter_id;
    if (!isAdminActor && !isSubmissionSubmitter(record, auth.user.id)) {
      message.warning(
        t("Only the submitter can edit this thesis. Use Detail to view."),
      );
      return;
    }
    if (isAdminActor && recordStudentId) {
      submissionForm.setFieldsValue({ studentId: recordStudentId });
      await loadStudentSubmissions(recordStudentId);
    }
    setEditingSubmissionId(record.id);
    setEditingSubmissionStatus(record.status);
    const authorIds = Array.isArray(record.author_user_ids)
      ? record.author_user_ids
      : [];
    const reviewerIds = Array.isArray(record.reviewer_user_ids)
      ? record.reviewer_user_ids
      : [];
    const facultyId = record.faculty_id || undefined;
    const semesterId = record.semester_id || undefined;
    const periodId = record.submission_period_id || undefined;
    const semesterLabel = record.semester_name || semesterId;
    const periodLabel = record.period_name || t("Saved submission period");

    const withSavedSemester = (options) => {
      if (!semesterId || options.some((item) => item.value === semesterId)) {
        return options;
      }
      return [...options, { value: semesterId, label: semesterLabel }];
    };
    const withSavedPeriod = (periods) => {
      if (!periodId || periods.some((item) => item.id === periodId)) {
        return periods;
      }
      return [
        ...periods,
        {
          id: periodId,
          name: periodLabel,
          closesAt: record.period_closes_at || null,
        },
      ];
    };

    if (facultyId) {
      setArchiveFaculties((prev) => {
        if (prev.some((item) => item.value === facultyId)) {
          return prev;
        }
        const label = record.faculty_name
          ? `${record.faculty_name}`
          : facultyId;
        return [...prev, { value: facultyId, label }];
      });
      const semesterOptions = await loadArchiveSemesters(facultyId);
      setArchiveSemesters(withSavedSemester(semesterOptions));
      if (semesterId) {
        const periods = await loadArchivePeriods(facultyId, semesterId);
        setArchivePeriods(withSavedPeriod(periods));
      }
    } else {
      setArchiveSemesters((prev) => withSavedSemester(prev));
      setArchivePeriods((prev) => withSavedPeriod(prev));
    }

    submissionForm.setFieldsValue({
      email: record.student_email || resolveStudentEmail(recordStudentId),
      titleVi: record.title_vi || "",
      titleEn: record.title_en || record.title || "",
      thesisAdvisors: record.thesis_advisors || "",
      major: record.major || "",
      thesisYear: record.thesis_year || String(new Date().getFullYear()),
      dateIssued:
        record.date_issued ||
        record.thesis_year ||
        String(new Date().getFullYear()),
      publisher:
        record.publisher || record.university_name || DEFAULT_PUBLISHER,
      documentType: record.document_type || "Thesis",
      language: record.language || "vie",
      description: record.description || "",
      abstract: record.abstract || "",
      ...(record.extra_metadata && typeof record.extra_metadata === "object"
        ? record.extra_metadata
        : {}),
      authorIds:
        authorIds.length > 0
          ? authorIds
          : recordStudentId
            ? [recordStudentId]
            : undefined,
      reviewerIds,
      archiveFacultyId: facultyId,
      archiveSemesterId: semesterId,
      submissionPeriodId: periodId,
      thesisFile: thesisFileListFromRecord(record),
    });
    void loadSubmissionFormFields(auth.token);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAdminEditSubmission = async (record) => {
    setAdminDashTab("submissions");
    setStaffDetailRecord(null);
    setAdminSubmissionModalOpen(true);
    await loadSubmissionIntoForm(record);
  };
  return {
    resolveStudentEmail,
    handleAdminStudentChange,
    applyStudentFaculty,
    handleAdminAuthorsChange,
    buildSubmissionFormData,
    resetSubmissionForm,
    openAdminCreateSubmission,
    loadSubmissionIntoForm,
    handleAdminEditSubmission,
  };
}
