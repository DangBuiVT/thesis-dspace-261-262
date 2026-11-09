import { Form, Upload } from "antd";

import { validateThesisPdf } from "../model/files.js";
import { InboxOutlined } from "@ant-design/icons";
import { useSubmissions } from "../SubmissionContext.jsx";

export default function ThesisFileField() {
  const {
    editingSubmissionId,
    t,
    showNative,
    structuralRequired,
    renderAlternateField,
    thesisMaxFileSizeMb,
    openProtectedSubmissionFile,
  } = useSubmissions();
  return showNative("thesisFile") ? (
    <Form.Item
      label={t("Thesis PDF")}
      name="thesisFile"
      valuePropName="fileList"
      getValueFromEvent={(event) => event?.fileList || []}
      rules={[
        {
          required: !editingSubmissionId && structuralRequired("thesisFile"),
          message: t("Please upload thesis PDF"),
        },
      ]}
      extra={
        editingSubmissionId
          ? t(
              "Current PDF is shown below. Upload a new file only if you want to replace it.",
            )
          : undefined
      }
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
  ) : (
    renderAlternateField("thesisFile")
  );
}
