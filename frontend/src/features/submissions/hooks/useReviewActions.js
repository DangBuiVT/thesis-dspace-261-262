import {
  requestReviewDecision,
  requestReviewStageAction,
  requestFinalEditorAction,
  requestAdminIntakeAction,
  requestBatchSignLegacy,
} from "../api.js";
import { authHeaders, parseResponse } from "../../../shared/api/http.js";
import { message, Modal } from "antd";
import { getStoredSignatureStyle } from "../../../shared/signature.js";
import { hasPermission } from "../model/access.js";

// The visible signature style chosen in this browser; absent means the system default.
function signatureStyleBody() {
  const style = getStoredSignatureStyle(null);
  return style ? { signatureStyle: style } : {};
}

export function useReviewActions({
  workflowRequests,
  setReviewActionLoadingId,
  auth,
  t,
  loadReviewerQueue,
  setReviewerDetailRecord,
  tr,
  setLibraryActionLoadingId,
  setDirectorActionLoadingId,
  loadStaffSubmissions,
  loadLibraryQueue,
  loadDirectorQueue,
  setStaffDetailRecord,
  setDirectorReturnTargetId,
  setDirectorReturnReason,
  setDirectorReturnModalOpen,
  directorReturnTargetId,
  directorReturnReason,
  setRejectTargetId,
  setRejectReason,
  setRejectModalOpen,
  rejectTargetId,
  rejectReason,
  setLibraryRejectTargetId,
  setLibraryRejectReason,
  setLibraryRejectModalOpen,
  libraryRejectTargetId,
  libraryRejectReason,
  setAdminIntakeActionLoadingId,
  loadAdminIntakeQueue,
  loadLegacyBatchList,
  setAdminRejectTargetId,
  setAdminRejectReason,
  setAdminRejectModalOpen,
  adminRejectTargetId,
  adminRejectReason,
  selectedLegacyKeys,
  setSelectedLegacyKeys,
  setBatchSigningLoading,
  legacyBatchStyle,
  legacyBatchPages,
  setBatchResult,
}) {
  const submitReviewAction = async (submissionId, action, comment) => {
    if (workflowRequests.current.has(submissionId)) return false;
    workflowRequests.current.add(submissionId);
    setReviewActionLoadingId(submissionId);
    try {
      const response = await requestReviewDecision({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({
          submissionId,
          action,
          comment,
        }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Review action failed");
      }
      message.success(action === "approve" ? t("Approved") : t("Rejected"));
      await loadReviewerQueue();
      setReviewerDetailRecord(null);
      return true;
    } catch (error) {
      message.error(tr(error.message || "Review action failed"));
      return false;
    } finally {
      workflowRequests.current.delete(submissionId);
      setReviewActionLoadingId(null);
    }
  };

  async function submitStageAction(
    endpoint,
    submissionId,
    action,
    comment,
    successApproveMsg,
  ) {
    if (workflowRequests.current.has(submissionId)) return false;
    workflowRequests.current.add(submissionId);
    const setLoading =
      endpoint === "library-action"
        ? setLibraryActionLoadingId
        : setDirectorActionLoadingId;
    setLoading(submissionId);
    try {
      const response = await requestReviewStageAction(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({
          submissionId,
          action,
          comment,
        }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Review action failed");
      }
      message.success(action === "approve" ? successApproveMsg : t("Rejected"));
      await Promise.all([
        loadStaffSubmissions(),
        endpoint === "library-action"
          ? loadLibraryQueue()
          : loadDirectorQueue(),
      ]);
      setStaffDetailRecord(null);
      return true;
    } catch (error) {
      message.error(tr(error.message || "Review action failed"));
      return false;
    } finally {
      workflowRequests.current.delete(submissionId);
      setLoading(null);
    }
  }

  const submitLibraryAction = (submissionId, action, comment) =>
    submitStageAction(
      "library-action",
      submissionId,
      action,
      comment,
      t("Passed library intake"),
    );

  const submitDirectorArchive = async (submissionId) => {
    if (workflowRequests.current.has(submissionId)) return false;
    workflowRequests.current.add(submissionId);
    setDirectorActionLoadingId(submissionId);
    try {
      const response = await requestFinalEditorAction({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({
          submissionId,
          action: "archive",
          ...signatureStyleBody(),
        }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Archive failed");
      }
      if (payload?.dspaceDeferred) {
        message.success(
          tr(payload?.message) ||
            t(
              "Submission archived to period. Push to DSpace later from Archive configuration.",
            ),
        );
      } else if (payload?.dspacePublishError) {
        message.warning(
          tr(payload?.dspacePublishMessage) ||
            t(
              "Archived in Portal, but DSpace publish failed — check DSpace settings, collection sync, and logs",
            ),
        );
      } else if (payload?.dspacePlaceholder) {
        message.warning(
          t(
            "Archived with local placeholder item ({{id}}). Configure DSpace API to publish for real.",
            {
              id: payload.dspaceItemId,
            },
          ),
        );
      } else if (payload?.dspaceItemId) {
        if (payload?.dspacePdfWarning) {
          message.warning(
            t(
              "Archived and created DSpace item ({{id}}), but thesis PDF was not uploaded",
              {
                id: payload.dspaceItemId,
              },
            ),
          );
        } else if (payload?.bitstreamUploaded) {
          message.success(
            t("Archived to DSpace with PDF ({{id}})", {
              id: payload.dspaceItemId,
            }),
          );
        } else {
          message.success(
            t("Archived and published to DSpace ({{id}})", {
              id: payload.dspaceItemId,
            }),
          );
        }
      } else {
        message.success(t("Submission archived"));
      }
      await loadDirectorQueue();
      await loadStaffSubmissions();
      setStaffDetailRecord(null);
      return true;
    } catch (error) {
      message.error(tr(error.message || "Archive failed"));
      return false;
    } finally {
      workflowRequests.current.delete(submissionId);
      setDirectorActionLoadingId(null);
    }
  };

  const submitDirectorReturn = async (submissionId, comment) => {
    if (workflowRequests.current.has(submissionId)) return false;
    workflowRequests.current.add(submissionId);
    setDirectorActionLoadingId(submissionId);
    try {
      const response = await requestFinalEditorAction({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({
          submissionId,
          action: "return_to_editor",
          comment,
        }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to return to Editor");
      }
      message.success(t("Returned to Editor"));
      await loadDirectorQueue();
      await loadStaffSubmissions();
      setStaffDetailRecord(null);
      return true;
    } catch (error) {
      message.error(tr(error.message || "Unable to return to Editor"));
      return false;
    } finally {
      workflowRequests.current.delete(submissionId);
      setDirectorActionLoadingId(null);
    }
  };

  const openDirectorReturnModal = (submissionId) => {
    setDirectorReturnTargetId(submissionId);
    setDirectorReturnReason("");
    setDirectorReturnModalOpen(true);
  };

  const confirmDirectorReturn = async () => {
    if (!directorReturnTargetId) {
      return;
    }
    if (!directorReturnReason.trim()) {
      message.error(t("Return reason is required"));
      return;
    }
    if (
      !(await submitDirectorReturn(
        directorReturnTargetId,
        directorReturnReason.trim(),
      ))
    )
      return;
    setDirectorReturnModalOpen(false);
    setDirectorReturnTargetId(null);
    setDirectorReturnReason("");
  };

  const openRejectModal = (submissionId) => {
    setRejectTargetId(submissionId);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectTargetId) {
      return;
    }
    if (!rejectReason.trim()) {
      message.error(t("Please enter a reject reason"));
      return;
    }
    if (
      !(await submitReviewAction(rejectTargetId, "reject", rejectReason.trim()))
    )
      return;
    setRejectModalOpen(false);
    setRejectTargetId(null);
    setRejectReason("");
  };

  function openLibraryRejectModal(submissionId) {
    setLibraryRejectTargetId(submissionId);
    setLibraryRejectReason("");
    setLibraryRejectModalOpen(true);
  }

  const confirmLibraryReject = async () => {
    if (!libraryRejectTargetId) {
      return;
    }
    if (!libraryRejectReason.trim()) {
      message.error(t("Please enter a reject reason"));
      return;
    }
    if (
      !(await submitLibraryAction(
        libraryRejectTargetId,
        "reject",
        libraryRejectReason.trim(),
      ))
    )
      return;
    setLibraryRejectModalOpen(false);
    setLibraryRejectTargetId(null);
    setLibraryRejectReason("");
  };

  // Admin intake: act on whatever step a submission is waiting at (approve / archive / reject).
  const submitAdminIntakeAction = async (submissionId, action, comment) => {
    if (workflowRequests.current.has(submissionId)) return false;
    workflowRequests.current.add(submissionId);
    setAdminIntakeActionLoadingId(submissionId);
    try {
      const response = await requestAdminIntakeAction({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({
          submissionId,
          action,
          comment,
          ...signatureStyleBody(),
        }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Action failed");
      }
      message.success(
        action === "reject"
          ? t("Rejected")
          : action === "archive"
            ? t("Submission archived")
            : t("Approved"),
      );
      await Promise.all([loadAdminIntakeQueue(), loadStaffSubmissions()]);
      setStaffDetailRecord(null);
      return true;
    } catch (error) {
      message.error(tr(error.message || "Action failed"));
      return false;
    } finally {
      workflowRequests.current.delete(submissionId);
      setAdminIntakeActionLoadingId(null);
    }
  };

  const openAdminRejectModal = (submissionId) => {
    setAdminRejectTargetId(submissionId);
    setAdminRejectReason("");
    setAdminRejectModalOpen(true);
  };

  const confirmAdminReject = async () => {
    if (!adminRejectTargetId) {
      return;
    }
    if (!adminRejectReason.trim()) {
      message.error(t("Please enter a reject reason"));
      return;
    }
    if (
      !(await submitAdminIntakeAction(
        adminRejectTargetId,
        "reject",
        adminRejectReason.trim(),
      ))
    )
      return;
    setAdminRejectModalOpen(false);
    setAdminRejectTargetId(null);
    setAdminRejectReason("");
  };

  // Sign (and archive) a batch of older theses with the chosen style and watermark pages.
  const handleBatchSignLegacy = async () => {
    if (selectedLegacyKeys.length === 0) {
      message.warning(t("Select at least one submission to sign"));
      return;
    }
    setBatchSigningLoading(true);
    try {
      const response = await requestBatchSignLegacy({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({
          submissionIds: selectedLegacyKeys,
          signatureStyle: legacyBatchStyle,
          watermarkPages: legacyBatchPages.trim() || "10",
        }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Batch signing failed");
      }
      setBatchResult(payload);
      message.success(
        t("Signed {{count}} of {{total}} submissions", {
          count: payload?.successCount ?? 0,
          total: payload?.total ?? selectedLegacyKeys.length,
        }),
      );
      setSelectedLegacyKeys([]);
      void loadLegacyBatchList();
      void loadAdminIntakeQueue();
      if (hasPermission(auth.user, "view_all_submissions")) {
        void loadStaffSubmissions();
      }
    } catch (error) {
      message.error(tr(error.message || "Batch signing failed"));
    } finally {
      setBatchSigningLoading(false);
    }
  };

  const requestDirectorArchive = (submissionId) =>
    Modal.confirm({
      title: t("Commit to Archive"),
      content: t(
        "Archive this submission in the portal? DSpace publication is a separate step.",
      ),
      okText: t("Commit to Archive"),
      cancelText: t("Cancel"),
      onOk: async () => {
        if (!(await submitDirectorArchive(submissionId)))
          throw new Error("Archive failed");
      },
    });
  return {
    submitReviewAction,
    submitStageAction,
    submitLibraryAction,
    submitDirectorArchive,
    submitDirectorReturn,
    openDirectorReturnModal,
    confirmDirectorReturn,
    openRejectModal,
    confirmReject,
    openLibraryRejectModal,
    confirmLibraryReject,
    requestDirectorArchive,
    submitAdminIntakeAction,
    openAdminRejectModal,
    confirmAdminReject,
    handleBatchSignLegacy,
  };
}
