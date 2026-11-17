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

  const loadLibraryQueue = () =>
    loadQueue({
      request: requestEditorQueue,
      setLoading: setIsLoadingLibraryQueue,
      setItems: setLibraryQueue,
      errorText: "Unable to load library intake queue",
    });

  const loadDirectorQueue = () =>
    loadQueue({
      request: requestFinalEditorQueue,
      setLoading: setIsLoadingDirectorQueue,
      setItems: setDirectorQueue,
      errorText: "Unable to load director archive queue",
    });

  const loadReviewerQueue = () =>
    loadQueue({
      request: requestReviewerQueue,
      setLoading: setIsLoadingReviewerQueue,
      setItems: setReviewerQueue,
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
