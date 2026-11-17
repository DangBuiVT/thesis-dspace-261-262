import { ALLOW_MULTIPLE_STUDENT_SUBMISSIONS } from "./formConfig.js";

export function isSubmittedStatus(status) {
  return status && status !== "draft";
}

export function getReviewDecisions(record) {
  return (Array.isArray(record?.reviews) ? record.reviews : []).map(
    (review) => review.decision,
  );
}

export function isSubmissionSubmitter(record, userId) {
  if (!record || !userId) {
    return false;
  }
  return String(record.submitter_id) === String(userId);
}

export function isSubmissionCoAuthor(record, userId) {
  if (!record || !userId) {
    return false;
  }
  const authorIds = Array.isArray(record.author_user_ids)
    ? record.author_user_ids.map(String)
    : [];
  return authorIds.includes(String(userId));
}

const ROLE_PERMISSION_FALLBACK = {
  review_academic: ["reviewer"],
  library_intake: ["library_staff"],
  director_approval: ["director"],
  submit_thesis: ["student", "admin"],
  view_all_submissions: ["admin", "library_staff", "director"],
  configure_system: ["admin"],
};

// Permissions come from /auth/me; fall back to the role until they are loaded.
export function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (Array.isArray(user.permissions)) {
    return user.permissions.includes(permission);
  }
  return (ROLE_PERMISSION_FALLBACK[permission] || []).includes(user.role);
}

export function studentBlocksNewDraftOrSubmit(
  submissions,
  userId,
  excludeSubmissionId,
) {
  if (!userId || ALLOW_MULTIPLE_STUDENT_SUBMISSIONS) {
    return null;
  }
  const blocking = (submissions || []).find((item) => {
    if (!isSubmittedStatus(item.status)) {
      return false;
    }
    if (excludeSubmissionId && item.id === excludeSubmissionId) {
      return false;
    }
    return (
      isSubmissionSubmitter(item, userId) || isSubmissionCoAuthor(item, userId)
    );
  });
  if (!blocking) {
    return null;
  }
  if (isSubmissionSubmitter(blocking, userId)) {
    return "You already have a submitted thesis. Only the submitter can edit that thesis; you cannot create another draft or submit a second thesis.";
  }
  return "You are listed as a co-author on a submitted thesis. You cannot create a draft, submit another thesis, or edit that submission — only the submitter can.";
}

export function getStudentSubmissionCapabilities(
  record,
  currentUserId,
  allSubmissions = [],
) {
  const status =
    record?.status === "reject" ? "rejected" : record?.status || "";
  const hasReviewerDecision = getReviewDecisions(record).some(
    (decision) => decision && decision !== "pending",
  );
  const readOnlyCaps = {
    canEdit: false,
    canDelete: false,
    canRevertToDraft: false,
    canSubmit: false,
  };

  // Only the submitting student may change the thesis; co-authors use Detail only.
  if (currentUserId && !isSubmissionSubmitter(record, currentUserId)) {
    return readOnlyCaps;
  }

  const submitBlocked = Boolean(
    studentBlocksNewDraftOrSubmit(allSubmissions, currentUserId, record?.id),
  );

  if (status === "draft") {
    return {
      canEdit: !submitBlocked,
      canDelete: !submitBlocked,
      canRevertToDraft: false,
      canSubmit: !submitBlocked,
    };
  }
  if (status === "archived") {
    return readOnlyCaps;
  }
  if (status === "rejected") {
    return {
      canEdit: true,
      canDelete: true,
      canRevertToDraft: false,
      canSubmit: !submitBlocked,
    };
  }
  if (status === "approved") {
    return {
      canEdit: true,
      canDelete: false,
      canRevertToDraft: false,
      canSubmit: !submitBlocked,
    };
  }
  if (status === "reviewing") {
    if (hasReviewerDecision) {
      return readOnlyCaps;
    }
    return {
      canEdit: true,
      canDelete: true,
      canRevertToDraft: true,
      canSubmit: !submitBlocked,
    };
  }
  return readOnlyCaps;
}

export function canStudentSubmitThesis(
  allSubmissions,
  userId,
  editingSubmissionId,
  editingRecord,
) {
  if (editingSubmissionId && editingRecord) {
    return getStudentSubmissionCapabilities(
      editingRecord,
      userId,
      allSubmissions,
    ).canSubmit;
  }
  return !studentBlocksNewDraftOrSubmit(allSubmissions, userId, undefined);
}

export function canStudentSaveDraft(allSubmissions, userId, editingRecord) {
  if (
    editingRecord &&
    isSubmissionSubmitter(editingRecord, userId) &&
    editingRecord.status !== "draft"
  ) {
    // Editing a submitted thesis uses PATCH, not draft-create rules.
    return getStudentSubmissionCapabilities(
      editingRecord,
      userId,
      allSubmissions,
    ).canEdit;
  }
  if (
    editingRecord?.status === "draft" &&
    isSubmissionSubmitter(editingRecord, userId)
  ) {
    return !studentBlocksNewDraftOrSubmit(
      allSubmissions,
      userId,
      editingRecord.id,
    );
  }
  return !studentBlocksNewDraftOrSubmit(allSubmissions, userId, undefined);
}

export function canStaffDeleteSubmission(role) {
  return role === "admin" || role === "library_staff" || role === "director";
}
