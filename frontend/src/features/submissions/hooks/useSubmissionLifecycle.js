import { useEffect } from "react";
import { studentEmailFromUser } from "../model/people.js";
import { defaultArchiveMetadata } from "../model/formConfig.js";
import { hasPermission } from "../model/access.js";

export function useSubmissionLifecycle({
  auth,
  loadStudentSubmissions,
  loadStaffSubmissions,
  loadLibraryQueue,
  loadDirectorQueue,
  loadReviewerQueue,
  loadAdminIntakeQueue,
  loadLegacyBatchList,
  loadStudents,
  loadArchiveFaculties,
  loadReviewers,
  actingStudentId,
  submissionForm,
  loadArchiveSemesters,
  loadSubmissionFormFields,
  applyFormFieldDefaults,
}) {
  // Queues follow permissions (from /auth/me), so a role with several grants sees every queue it may act on.
  useEffect(() => {
    const user = auth?.user;
    if (!user) {
      return;
    }
    if (user.role === "student" && user.id) {
      void loadStudentSubmissions(user.id);
    }
    if (hasPermission(user, "view_all_submissions")) {
      void loadStaffSubmissions();
    }
    if (user.role === "admin") {
      // Administrators act through the intake queue, not the per-role queues.
      void loadAdminIntakeQueue();
      void loadLegacyBatchList();
      return;
    }
    if (hasPermission(user, "library_intake")) {
      void loadLibraryQueue();
    }
    if (hasPermission(user, "director_approval")) {
      void loadDirectorQueue();
    }
    if (hasPermission(user, "review_academic")) {
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
