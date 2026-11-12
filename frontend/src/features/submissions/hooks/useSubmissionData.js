import {
  requestSubmissions,
  requestStudentSubmissions,
  requestReviewers,
  requestDepositFaculties,
  requestDepositSemesters,
  requestDepositPeriods,
  requestStudents,
} from "../api.js";
import { authHeaders, parseResponse } from "../../../shared/api/http.js";
import { message } from "antd";
import { isSubmissionSubmitter } from "../model/access.js";
import { studentEmailFromUser, personOptionLabel } from "../model/people.js";
import { defaultArchiveMetadata } from "../model/formConfig.js";
import { foldSearchText } from "../../../shared/search.js";

export function useSubmissionData({
  setIsLoadingSubmissions,
  setQueueError,
  auth,
  setStaffSubmissions,
  tr,
  setStudentSubmissions,
  setEditingSubmissionId,
  setEditingSubmissionStatus,
  submissionForm,
  setArchiveSemesters,
  setArchivePeriods,
  studentOptions,
  setIsLoadingReviewers,
  actingStudentId,
  setReviewerOptions,
  setIsLoadingArchiveFaculties,
  setArchiveFaculties,
  setIsLoadingArchiveSemesters,
  setIsLoadingArchivePeriods,
  setIsLoadingStudents,
  setStudentOptions,
}) {
  const loadStaffSubmissions = async () => {
    setIsLoadingSubmissions(true);
    setQueueError("");
    try {
      const response = await requestSubmissions({
        headers: {
          ...authHeaders(auth?.token),
        },
      });
      const payload = await parseResponse(response);
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error("Unable to load all submissions");
      }
      setStaffSubmissions(payload);
    } catch (error) {
      setQueueError("Unable to load all submissions");
      message.error(tr(error.message || "Unable to load all submissions"));
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const loadStudentSubmissions = async (studentId) => {
    setIsLoadingSubmissions(true);
    try {
      const response = await requestStudentSubmissions(studentId, {
        headers: {
          ...authHeaders(auth?.token),
        },
      });
      const payload = await parseResponse(response);
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error("Unable to load submission list");
      }
      setStudentSubmissions(payload);
      setEditingSubmissionId((currentId) => {
        if (!currentId) {
          return null;
        }
        const current = payload.find((item) => item.id === currentId);
        // Only the submitter may keep a thesis loaded in the entry form (no co-author autofill).
        if (current && isSubmissionSubmitter(current, studentId)) {
          setEditingSubmissionStatus(
            current.status === "reject" ? "rejected" : current.status,
          );
          return currentId;
        }
        setEditingSubmissionStatus(null);
        submissionForm.resetFields();
        setArchiveSemesters([]);
        setArchivePeriods([]);
        const option = studentOptions.find((item) => item.value === studentId);
        const isAdmin = auth?.user?.role === "admin";
        submissionForm.setFieldsValue({
          studentId,
          authorIds: isAdmin ? undefined : [studentId],
          email: option?.username
            ? studentEmailFromUser({ username: option.username })
            : isAdmin
              ? ""
              : studentEmailFromUser(auth?.user),
          thesisYear: String(new Date().getFullYear()),
          ...defaultArchiveMetadata(),
        });
        return null;
      });
    } catch (error) {
      message.error(tr(error.message || "Unable to load submission list"));
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const loadReviewers = async () => {
    setIsLoadingReviewers(true);
    try {
      const forStudent = actingStudentId
        ? `&forStudent=${encodeURIComponent(actingStudentId)}`
        : "";
      const response = await requestReviewers(forStudent, {
        headers: { ...authHeaders(auth?.token) },
      });
      const payload = await parseResponse(response);
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error("Unable to load reviewer list");
      }
      setReviewerOptions(
        payload.map((item) => ({
          value: item.id,
          label: personOptionLabel(item.displayName, item.username),
          searchText: foldSearchText(
            `${item.displayName || ""} ${item.username || ""}`,
          ),
        })),
      );
    } catch (error) {
      message.error(tr(error.message || "Unable to load reviewer list"));
    } finally {
      setIsLoadingReviewers(false);
    }
  };

  const loadArchiveFaculties = async () => {
    setIsLoadingArchiveFaculties(true);
    try {
      const response = await requestDepositFaculties({
        headers: { ...authHeaders(auth?.token) },
      });
      const payload = await parseResponse(response);
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error("Unable to load faculties");
      }
      setArchiveFaculties(
        payload.map((item) => ({
          value: item.id,
          label: item.name,
        })),
      );
    } catch (error) {
      message.error(tr(error.message || "Unable to load faculties"));
    } finally {
      setIsLoadingArchiveFaculties(false);
    }
  };

  const loadArchiveSemesters = async (facultyId) => {
    if (!facultyId) {
      setArchiveSemesters([]);
      return [];
    }
    setIsLoadingArchiveSemesters(true);
    try {
      const response = await requestDepositSemesters(facultyId, {
        headers: { ...authHeaders(auth?.token) },
      });
      const payload = await parseResponse(response);
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error("Unable to load semesters");
      }
      const options = payload.map((item) => ({
        value: item.id,
        label: item.name,
      }));
      setArchiveSemesters(options);
      return options;
    } catch (error) {
      message.error(tr(error.message || "Unable to load semesters"));
      setArchiveSemesters([]);
      return [];
    } finally {
      setIsLoadingArchiveSemesters(false);
    }
  };

  const loadArchivePeriods = async (facultyId, semesterId) => {
    if (!facultyId || !semesterId) {
      setArchivePeriods([]);
      return [];
    }
    setIsLoadingArchivePeriods(true);
    try {
      const response = await requestDepositPeriods(
        encodeURIComponent(facultyId),
        encodeURIComponent(semesterId),
        { headers: { ...authHeaders(auth?.token) } },
      );
      const payload = await parseResponse(response);
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error("Unable to load submission periods");
      }
      setArchivePeriods(payload);
      return payload;
    } catch (error) {
      message.error(tr(error.message || "Unable to load submission periods"));
      setArchivePeriods([]);
      return [];
    } finally {
      setIsLoadingArchivePeriods(false);
    }
  };

  const handleArchiveSemesterChange = async (semesterId) => {
    const facultyId = submissionForm.getFieldValue("archiveFacultyId");
    submissionForm.setFieldsValue({
      submissionPeriodId: undefined,
    });
    setArchivePeriods([]);
    await loadArchivePeriods(facultyId, semesterId);
  };

  const handleSubmissionPeriodChange = (periodId) => {
    submissionForm.setFieldValue("submissionPeriodId", periodId);
  };

  const loadStudents = async () => {
    setIsLoadingStudents(true);
    try {
      const response = await requestStudents({
        headers: { ...authHeaders(auth?.token) },
      });
      const payload = await parseResponse(response);
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error("Unable to load student list");
      }
      setStudentOptions(
        payload.map((item) => ({
          value: item.id,
          label: personOptionLabel(item.displayName, item.username),
          searchText: foldSearchText(
            `${item.displayName || ""} ${item.username || ""}`,
          ),
          username: item.username,
          facultyId: item.facultyId || "",
          facultyName: item.facultyName || "",
        })),
      );
    } catch (error) {
      message.error(tr(error.message || "Unable to load student list"));
    } finally {
      setIsLoadingStudents(false);
    }
  };
  return {
    loadStaffSubmissions,
    loadStudentSubmissions,
    loadReviewers,
    loadArchiveFaculties,
    loadArchiveSemesters,
    loadArchivePeriods,
    handleArchiveSemesterChange,
    handleSubmissionPeriodChange,
    loadStudents,
  };
}
