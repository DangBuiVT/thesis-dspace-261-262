import { Form } from "antd";
import { useState } from "react";
import { THESIS_MAX_FILE_SIZE_MB } from "../model/formConfig.js";

export function useSubmissionState() {
  const [submissionForm] = Form.useForm();

  const [isSubmittingSubmission, setIsSubmittingSubmission] = useState(false);

  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);

  const [thesisMaxFileSizeMb, setThesisMaxFileSizeMb] = useState(
    THESIS_MAX_FILE_SIZE_MB,
  );

  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

  const [studentSubmissions, setStudentSubmissions] = useState([]);

  const [staffSubmissions, setStaffSubmissions] = useState([]);

  const [reviewerOptions, setReviewerOptions] = useState([]);

  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false);

  const [studentOptions, setStudentOptions] = useState([]);

  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  const [adminDashTab, setAdminDashTab] = useState("admin");

  const [adminSubmissionModalOpen, setAdminSubmissionModalOpen] =
    useState(false);

  const [archiveFaculties, setArchiveFaculties] = useState([]);

  const [archiveSemesters, setArchiveSemesters] = useState([]);

  const [archivePeriods, setArchivePeriods] = useState([]);

  const [isLoadingArchiveFaculties, setIsLoadingArchiveFaculties] =
    useState(false);

  const [isLoadingArchiveSemesters, setIsLoadingArchiveSemesters] =
    useState(false);

  const [isLoadingArchivePeriods, setIsLoadingArchivePeriods] = useState(false);

  const [staffDetailRecord, setStaffDetailRecord] = useState(null);

  const [studentDetailRecord, setStudentDetailRecord] = useState(null);

  const [fileOpenLoadingKey, setFileOpenLoadingKey] = useState(null);

  const [editingSubmissionId, setEditingSubmissionId] = useState(null);

  const [editingSubmissionStatus, setEditingSubmissionStatus] = useState(null);

  const [submissionFormFields, setSubmissionFormFields] = useState([]);

  const [formFieldsLoaded, setFormFieldsLoaded] = useState(false);

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  return {
    submissionForm,
    isSubmittingSubmission,
    setIsSubmittingSubmission,
    isDeletingSubmission,
    setIsDeletingSubmission,
    thesisMaxFileSizeMb,
    setThesisMaxFileSizeMb,
    isLoadingSubmissions,
    setIsLoadingSubmissions,
    studentSubmissions,
    setStudentSubmissions,
    staffSubmissions,
    setStaffSubmissions,
    reviewerOptions,
    setReviewerOptions,
    isLoadingReviewers,
    setIsLoadingReviewers,
    studentOptions,
    setStudentOptions,
    isLoadingStudents,
    setIsLoadingStudents,
    adminDashTab,
    setAdminDashTab,
    adminSubmissionModalOpen,
    setAdminSubmissionModalOpen,
    archiveFaculties,
    setArchiveFaculties,
    archiveSemesters,
    setArchiveSemesters,
    archivePeriods,
    setArchivePeriods,
    isLoadingArchiveFaculties,
    setIsLoadingArchiveFaculties,
    isLoadingArchiveSemesters,
    setIsLoadingArchiveSemesters,
    isLoadingArchivePeriods,
    setIsLoadingArchivePeriods,
    staffDetailRecord,
    setStaffDetailRecord,
    studentDetailRecord,
    setStudentDetailRecord,
    fileOpenLoadingKey,
    setFileOpenLoadingKey,
    editingSubmissionId,
    setEditingSubmissionId,
    editingSubmissionStatus,
    setEditingSubmissionStatus,
    submissionFormFields,
    setSubmissionFormFields,
    formFieldsLoaded,
    setFormFieldsLoaded,
    isSavingDraft,
    setIsSavingDraft,
  };
}
