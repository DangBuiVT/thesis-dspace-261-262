import { useEffect } from "react";
import { studentEmailFromUser } from "../model/people.js";
import { defaultArchiveMetadata } from "../model/formConfig.js";

export function useSubmissionLifecycle({
  auth,
  loadStudentSubmissions,
  loadStaffSubmissions,
  loadLibraryQueue,
  loadDirectorQueue,
  loadReviewerQueue,
  loadStudents,
  loadArchiveFaculties,
  loadReviewers,
  actingStudentId,
  submissionForm,
  loadArchiveSemesters,
  loadSubmissionFormFields,
  applyFormFieldDefaults,
}) {
  useEffect(() => {
    if (auth?.user?.role === "student" && auth?.user?.id) {
      void loadStudentSubmissions(auth.user.id);
    }
    const role = auth?.user?.role;
    if (role === "library_staff" || role === "director" || role === "admin") {
      void loadStaffSubmissions();
    }
    if (role === "library_staff") {
      void loadLibraryQueue();
    }
    if (role === "director") {
      void loadDirectorQueue();
    }
  }, [auth]);

  useEffect(() => {
    if (auth?.user?.role === "reviewer") {
      void loadReviewerQueue();
    }
  }, [auth]);

  useEffect(() => {
    if (!auth?.user) {
      return;
    }
    if (auth.user.role === "student" || auth.user.role === "admin") {
      void loadStudents();
      void loadArchiveFaculties();
    }
  }, [auth]);

  useEffect(() => {
    if (!auth?.user) {
      return;
    }
    if (auth.user.role === "student" || auth.user.role === "admin") {
      void loadReviewers();
    }
  }, [auth, actingStudentId]);

  useEffect(() => {
    if (auth?.user?.role === "student") {
      submissionForm.setFieldsValue({
        studentId: auth.user.id,
        authorIds: [auth.user.id],
        email: studentEmailFromUser(auth.user),
        archiveFacultyId: auth.user.facultyId || undefined,
        thesisYear: String(new Date().getFullYear()),
        ...defaultArchiveMetadata(),
      });
      if (auth.user.facultyId) {
        void loadArchiveSemesters(auth.user.facultyId);
      }
      void loadSubmissionFormFields(auth.token).then((fields) =>
        applyFormFieldDefaults(fields),
      );
    }
    if (auth?.user?.role === "admin") {
      submissionForm.setFieldsValue({
        studentId: undefined,
        authorIds: undefined,
        email: "",
        thesisYear: String(new Date().getFullYear()),
        ...defaultArchiveMetadata(),
      });
      void loadSubmissionFormFields(auth.token).then((fields) =>
        applyFormFieldDefaults(fields),
      );
    }
  }, [auth, submissionForm]);
  return {};
}
