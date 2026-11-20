import { Form, Upload } from "antd";

import { validateThesisPdf } from "../model/files.js";
import { InboxOutlined } from "@ant-design/icons";
import { useSubmissions } from "../SubmissionContext.jsx";
import PdfPreview from "../workflow/PdfPreview.jsx";

export default function ThesisFileField({ field } = {}) {
  const {
    editingSubmissionId,
    t,
    showNative,
    structuralRequired,
    renderAlternateField,
    thesisMaxFileSizeMb,
    openProtectedSubmissionFile,
    submissionForm,
    editingSubmissionRecord,
    auth,
  } = useSubmissions();
  const selectedFiles = Form.useWatch("thesisFile", submissionForm);
  const localFile = selectedFiles?.[0]?.originFileObj;
  return showNative("thesisFile") ? (
    <>
    <Form.Item
      label={t(field?.label || "Thesis PDF")}
      required={structuralRequired("thesisFile")}
      name="thesisFile"
      valuePropName="fileList"
      getValueFromEvent={(event) => event?.fileList || []}
      rules={[
        {
          required: structuralRequired("thesisFile") && !editingSubmissionRecord?.files?.some(file => file.fileType === "thesis"),
          message: t("Please upload thesis PDF"),
        },
      ]}
      extra={<>
        {field?.helpText && <div>{t(field.helpText)}</div>}
        {
        editingSubmissionId
          ? t(
              "Current PDF is shown below. Upload a new file only if you want to replace it.",
            )
          : undefined
      }</>}
    >
      <Upload.Dragger
        accept=".pdf,application/pdf"
        beforeUpload={(file) =>
          validateThesisPdf(file, t, thesisMaxFileSizeMb)
            ? false
            : Upload.LIST_IGNORE
        }
        maxCount={1}
        onPreview={(file) => {
          if (file?.existingFileId && editingSubmissionId) {
            void openProtectedSubmissionFile(
              editingSubmissionId,
              file.existingFileId,
            );
          }
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          {t("Click or drag PDF thesis file here (max {{size}} MB)", {
            size: thesisMaxFileSizeMb,
          })}
        </p>
      </Upload.Dragger>
    </Form.Item>
    {(localFile || editingSubmissionRecord?.files?.length > 0) && <PdfPreview
      submissionId={editingSubmissionId} files={editingSubmissionRecord?.files} token={auth.token} localFile={localFile} />}
    </>
  ) : (
    renderAlternateField("thesisFile")
  );
}
