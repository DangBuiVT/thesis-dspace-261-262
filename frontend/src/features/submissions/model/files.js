import { THESIS_MAX_FILE_SIZE_MB } from "./formConfig.js";
import { message } from "antd";

export function validateThesisPdf(file, t, maxMb = THESIS_MAX_FILE_SIZE_MB) {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  const mimeOk =
    !type || type === "application/pdf" || type === "application/x-pdf";
  if (!name.endsWith(".pdf") || !mimeOk) {
    message.error(t("Thesis file must be PDF"));
    return false;
  }
  const limitMb = Number(maxMb) > 0 ? Number(maxMb) : THESIS_MAX_FILE_SIZE_MB;
  if (file.size > limitMb * 1024 * 1024) {
    message.error(t("Thesis PDF must be at most {{n}} MB", { n: limitMb }));
    return false;
  }
  return true;
}

export function thesisFileListFromRecord(record) {
  const files = Array.isArray(record?.files) ? record.files : [];
  const thesis =
    files.find((f) => f.fileType === "thesis" || f.file_type === "thesis") ||
    files[0];
  if (!thesis) {
    return [];
  }
  return [
    {
      uid: String(thesis.id || "existing-thesis"),
      name: thesis.fileName || thesis.file_name || "thesis.pdf",
      status: "done",
      // Marker so save/submit keep the server file unless the user replaces it
      existingFileId: thesis.id,
    },
  ];
}
