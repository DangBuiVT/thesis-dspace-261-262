import { request } from "../../shared/api/http.js";

// Requests stay in this feature; hooks own loading, validation and error messages.
export const requestSubmissionFile = (submissionId, fileId, options) =>
  request(`/api/submissions/${submissionId}/files/${fileId}/download`, options);
export const requestReviewDecision = (options) =>
  request("/api/reviews/action", options);
export const requestReviewStageAction = (endpoint, options) =>
  request(`/api/reviews/${endpoint}`, options);
export const requestFinalEditorAction = (options) =>
  request("/api/reviews/director-action", options);
export const requestEditorQueue = (options) =>
  request("/api/reviews/library-queue", options);
export const requestFinalEditorQueue = (options) =>
  request("/api/reviews/director-queue", options);
export const requestReviewerQueue = (options) =>
  request("/api/reviews/my-queue", options);
export const requestSubmissions = (options) =>
  request("/api/submissions", options);
export const requestStudentSubmissions = (studentId, options) =>
  request(`/api/submissions/student/${studentId}`, options);
export const requestReviewers = (studentQuery, options) =>
  request(`/api/users?role=reviewer${studentQuery}`, options);
export const requestDepositFaculties = (options) =>
  request("/api/archive/faculties", options);
export const requestDepositSemesters = (facultyId, options) =>
  request(`/api/archive/faculties/${facultyId}/semesters`, options);
// Query values arrive URL-encoded from the filter controller.
export const requestDepositPeriods = (facultyId, semesterId, options) =>
  request(
    `/api/archive/submission-periods?facultyId=${facultyId}&semesterId=${semesterId}`,
    options,
  );
export const requestStudents = (options) =>
  request("/api/users?role=student", options);
export const requestSubmission = (submissionId, options) =>
  request(`/api/submissions/${submissionId}`, options);
export const requestSubmissionSubmit = (submissionId, options) =>
  request(`/api/submissions/${submissionId}/submit`, options);
export const requestSubmissionsResource = (resourcePath, options) =>
  request(resourcePath, options);
export const requestRevertToDraft = (submissionId, options) =>
  request(`/api/submissions/${submissionId}/revert-to-draft`, options);
export const requestUploadLimit = (options) =>
  request("/api/submissions/upload-limit", options);
export const requestSubmissionFields = (options) =>
  request("/api/submissions/form-fields", options);
export const requestSubmissionHistory = (submissionId, options) =>
  request(`/api/submissions/${submissionId}/history`, options);
export const requestSubmissionMetadata = (submissionId, options) =>
  request(`/api/submissions/${submissionId}/metadata`, options);
