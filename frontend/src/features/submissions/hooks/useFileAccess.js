import { message } from "antd";

export function useFileAccess({ setFileOpenLoadingKey, auth, tr }) {
  const openProtectedSubmissionFile = async (submissionId, fileId, preferredFileName) => {
    if (!auth?.token) {
      message.error(tr ? tr("Authentication required") : "Authentication required");
      return;
    }
    const fileName = preferredFileName || "thesis.pdf";
    const viewUrl = `/api/submissions/${submissionId}/files/${fileId}/${encodeURIComponent(fileName)}?token=${encodeURIComponent(auth.token)}`;
    window.open(viewUrl, "_blank", "noopener,noreferrer");
  };

  const downloadSubmissionFile = (submissionId, fileId, preferredFileName) => {
    if (!auth?.token) {
      message.error(tr ? tr("Authentication required") : "Authentication required");
      return;
    }
    const fileName = preferredFileName || "thesis.pdf";
    const downloadUrl = `/api/submissions/${submissionId}/files/${fileId}/${encodeURIComponent(fileName)}?token=${encodeURIComponent(auth.token)}&download=1`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return { openProtectedSubmissionFile, downloadSubmissionFile };
}
