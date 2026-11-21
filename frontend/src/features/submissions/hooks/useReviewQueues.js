import {
  requestEditorQueue,
  requestFinalEditorQueue,
  requestReviewerQueue,
  requestAdminIntakeQueue,
  requestLegacyBatchQueue,
} from "../api.js";
import { authHeaders, parseResponse } from "../../../shared/api/http.js";
import { message } from "antd";

export function useReviewQueues({
  setIsLoadingLibraryQueue,
  setQueueError,
  auth,
  setLibraryQueue,
  tr,
  setIsLoadingDirectorQueue,
  setDirectorQueue,
  setIsLoadingReviewerQueue,
  setReviewerQueue,
  setIsLoadingAdminIntakeQueue,
  setAdminIntakeQueue,
  setIsLoadingLegacyBatch,
  setLegacyBatchList,
}) {
  const loadQueue = async ({
    request,
    setLoading,
    setItems,
    errorText,
    trackQueueError = true,
  }) => {
    setLoading(true);
    if (trackQueueError) setQueueError("");
    try {
      const response = await request({
        headers: {
          ...authHeaders(auth?.token),
        },
      });
      const payload = await parseResponse(response);
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error(errorText);
      }
      setItems(payload);
    } catch (error) {
      if (trackQueueError) setQueueError(errorText);
      message.error(tr(error.message || errorText));
    } finally {
      setLoading(false);
    }
  };

  // The per-role queue endpoints only serve their own role (and admins). A user can still hold the
  // permission of another queue (e.g. the director has library_intake and review_academic), which
  // would answer 403, so those roles simply have no queue of that kind.
  const loadRoleQueue = (roles, setItems, options) => {
    const role = auth?.user?.role;
    if (!roles.includes(role)) {
      setItems([]);
      return Promise.resolve();
    }
    return loadQueue({ ...options, setItems });
  };

  const loadLibraryQueue = () =>
    loadRoleQueue(["library_staff", "admin"], setLibraryQueue, {
      request: requestEditorQueue,
      setLoading: setIsLoadingLibraryQueue,
      errorText: "Unable to load library intake queue",
    });

  const loadDirectorQueue = () =>
    loadRoleQueue(["director", "admin"], setDirectorQueue, {
      request: requestFinalEditorQueue,
      setLoading: setIsLoadingDirectorQueue,
      errorText: "Unable to load director archive queue",
    });

  const loadReviewerQueue = () =>
    loadRoleQueue(["reviewer", "admin"], setReviewerQueue, {
      request: requestReviewerQueue,
      setLoading: setIsLoadingReviewerQueue,
      errorText: "Unable to load reviewer queue",
    });

  const loadAdminIntakeQueue = () =>
    loadQueue({
      request: requestAdminIntakeQueue,
      setLoading: setIsLoadingAdminIntakeQueue,
      setItems: setAdminIntakeQueue,
      errorText: "Unable to load admin intake queue",
      trackQueueError: false,
    });

  const loadLegacyBatchList = () =>
    loadQueue({
      request: requestLegacyBatchQueue,
      setLoading: setIsLoadingLegacyBatch,
      setItems: setLegacyBatchList,
      errorText: "Unable to load legacy submissions",
      trackQueueError: false,
    });

  return {
    loadLibraryQueue,
    loadDirectorQueue,
    loadReviewerQueue,
    loadAdminIntakeQueue,
    loadLegacyBatchList,
  };
}
