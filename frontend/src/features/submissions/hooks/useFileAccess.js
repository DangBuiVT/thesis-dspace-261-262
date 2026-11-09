import { requestSubmissionFile } from "../api.js";
import { authHeaders, parseResponse } from "../../../shared/api/http.js";
import { message } from "antd";

export function useFileAccess({ setFileOpenLoadingKey, auth, tr }) {
  const openProtectedSubmissionFile = async (submissionId, fileId) => {
    const key = `${submissionId}:${fileId}`;
    setFileOpenLoadingKey(key);
    try {
      const response = await requestSubmissionFile(submissionId, fileId, {
        headers: {
          ...authHeaders(auth?.token),
        },
      });
      if (!response.ok) {
        const payload = await parseResponse(response);
        throw new Error(
          payload?.message || `Unable to open file (${response.status})`,
        );
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120000);
    } catch (error) {
      message.error(tr(error.message || "Unable to open file"));
    } finally {
      setFileOpenLoadingKey(null);
    }
  };
  return { openProtectedSubmissionFile };
}
