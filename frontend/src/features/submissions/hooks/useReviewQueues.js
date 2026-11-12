import {
  requestEditorQueue,
  requestFinalEditorQueue,
  requestReviewerQueue,
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
}) {
  const loadLibraryQueue = async () => {
    setIsLoadingLibraryQueue(true);
    setQueueError("");
    try {
      const response = await requestEditorQueue({
        headers: {
          ...authHeaders(auth?.token),
        },
      });
      const payload = await parseResponse(response);
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error("Unable to load library intake queue");
      }
      setLibraryQueue(payload);
    } catch (error) {
      setQueueError("Unable to load library intake queue");
      message.error(tr(error.message || "Unable to load library intake queue"));
    } finally {
      setIsLoadingLibraryQueue(false);
    }
  };

  const loadDirectorQueue = async () => {
    setIsLoadingDirectorQueue(true);
    setQueueError("");
    try {
      const response = await requestFinalEditorQueue({
        headers: {
          ...authHeaders(auth?.token),
        },
      });
      const payload = await parseResponse(response);
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error("Unable to load director archive queue");
      }
      setDirectorQueue(payload);
    } catch (error) {
      setQueueError("Unable to load director archive queue");
      message.error(
        tr(error.message || "Unable to load director archive queue"),
      );
    } finally {
      setIsLoadingDirectorQueue(false);
    }
  };

  const loadReviewerQueue = async () => {
    setIsLoadingReviewerQueue(true);
    setQueueError("");
    try {
      const response = await requestReviewerQueue({
        headers: {
          ...authHeaders(auth?.token),
        },
      });
      const payload = await parseResponse(response);
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error("Unable to load reviewer queue");
      }
      setReviewerQueue(payload);
    } catch (error) {
      setQueueError("Unable to load reviewer queue");
      message.error(tr(error.message || "Unable to load reviewer queue"));
    } finally {
      setIsLoadingReviewerQueue(false);
    }
  };
  return { loadLibraryQueue, loadDirectorQueue, loadReviewerQueue };
}
