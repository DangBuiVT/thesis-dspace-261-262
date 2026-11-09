import {
  requestUserExport,
  requestUserImportTemplate,
  requestUserImportPreview,
  requestUserImport,
} from "../api.js";
import {
  authHeaders,
  parseTextResponse as parseResponse,
} from "../../../shared/api/http.js";
import { message } from "antd";
export function useUserImport({
  setImportPreview,
  setImportResult,
  setImportModalOpen,
  setExportingUsers,
  auth,
  tr,
  setDownloadingTemplate,
  setPreviewingImport,
  setImportFacultyId,
  t,
  importPreview,
  importFacultyId,
  setImportingUsers,
  loadUsers,
}) {
  const openImportUsers = () => {
    setImportPreview(null);
    setImportResult(null);
    setImportModalOpen(true);
  };

  const downloadUsersExport = async () => {
    setExportingUsers(true);
    try {
      const response = await requestUserExport({
        headers: authHeaders(auth.token),
      });
      if (!response.ok) {
        const payload = await parseResponse(response);
        throw new Error(payload?.message || "Unable to export users");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "users.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      message.error(tr(error.message || "Unable to export users"));
    } finally {
      setExportingUsers(false);
    }
  };

  const downloadUserTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const response = await requestUserImportTemplate({
        headers: authHeaders(auth.token),
      });
      if (!response.ok) {
        const payload = await parseResponse(response);
        throw new Error(payload?.message || "Unable to download template");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "users-import-template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      message.error(tr(error.message || "Unable to download template"));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const previewUsersFile = async (file) => {
    setPreviewingImport(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await requestUserImportPreview({
        method: "POST",
        headers: authHeaders(auth.token),
        body: formData,
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to read the file");
      }
      setImportFacultyId(null);
      setImportPreview({ ...payload, fileName: file.name });
      if (!payload.toImportCount && payload.errorCount) {
        message.warning(t("No valid users to import. Check the skipped rows."));
      } else if (!payload.toImportCount) {
        message.info(t("The file had no data rows."));
      }
    } catch (error) {
      message.error(tr(error.message || "Unable to read the file"));
      setImportPreview(null);
    } finally {
      setPreviewingImport(false);
    }
    return false;
  };

  const confirmImportUsers = async () => {
    const rows = importPreview?.toImport || [];
    if (!rows.length) {
      message.warning(t("Upload a file and review the list first."));
      return;
    }
    if (importPreview?.requiresFaculty && !importFacultyId) {
      message.warning(
        t(
          "Choose a faculty for students and reviewers that have none in the file.",
        ),
      );
      return;
    }
    setImportingUsers(true);
    try {
      const response = await requestUserImport({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({
          users: rows.map((row) => {
            const needsFaculty =
              row.role === "student" || row.role === "reviewer";
            const user = {
              username: row.username,
              displayName: row.displayName,
              role: row.role,
              facultyId:
                row.facultyId || (needsFaculty ? importFacultyId : null),
              status: row.status || "active",
            };
            if (row.password) user.password = row.password;
            return user;
          }),
        }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to import users");
      }
      setImportResult(payload);
      setImportPreview(null);
      if (payload.createdCount > 0) {
        message.success(
          t("Imported {{count}} user(s)", { count: payload.createdCount }),
        );
        await loadUsers();
      } else {
        message.warning(t("No users imported. Check the error list."));
      }
    } catch (error) {
      message.error(tr(error.message || "Unable to import users"));
    } finally {
      setImportingUsers(false);
    }
  };
  return {
    openImportUsers,
    downloadUsersExport,
    downloadUserTemplate,
    previewUsersFile,
    confirmImportUsers,
  };
}
