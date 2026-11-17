import {
  Modal,
  Button,
  Typography,
  Space,
  Upload,
  Form,
  Select,
  Table,
} from "antd";
import { UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import { ROLES } from "../model/constants.js";
const { Paragraph, Text } = Typography;
import { useAdmin } from "../AdminContext";
export default function UserImportDialog() {
  const {
    t,
    importModalOpen,
    setImportModalOpen,
    importingUsers,
    importPreview,
    importFacultyId,
    confirmImportUsers,
    downloadingTemplate,
    downloadUserTemplate,
    previewUsersFile,
    previewingImport,
    setImportFacultyId,
    faculties,
    tr,
    importResult,
  } = useAdmin();
  return (
    <Modal
      title={t("Import users")}
      open={importModalOpen}
      onCancel={() => setImportModalOpen(false)}
      width={920}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={() => setImportModalOpen(false)}>
          {t("Cancel")}
        </Button>,
        <Button
          key="import"
          type="primary"
          icon={<UploadOutlined />}
          loading={importingUsers}
          disabled={
            !importPreview?.toImport?.length ||
            (importPreview?.requiresFaculty && !importFacultyId)
          }
          onClick={confirmImportUsers}
        >
          {t("Import")}
        </Button>,
      ]}
    >
      <Paragraph type="secondary">
        {t("1. Download the template, or use a CSV export. 2. Upload")}{" "}
        <Text code>.xlsx</Text> {t("or")} <Text code>.csv</Text>{" "}
        {t("to preview. 3. Check the list, then click Import.")}
      </Paragraph>
      <Paragraph type="secondary">
        {t("Portal columns:")} <Text code>username</Text>,{" "}
        <Text code>display name</Text>, <Text code>role</Text>,{" "}
        <Text code>faculty</Text> ({ROLES.join(", ")}). {t("CSV columns:")}{" "}
        <Text code>email</Text>, <Text code>netid</Text>,{" "}
        <Text code>last_name</Text>, <Text code>first_name</Text>,{" "}
        <Text code>phone</Text>, <Text code>language</Text>,{" "}
        <Text code>can_log_in</Text>, <Text code>password</Text>.{" "}
        <Text code>netid</Text>{" "}
        {t(
          "becomes the username, and the display name is last name then first name. A missing role defaults to student. Faculty is required for student and reviewer — choose one below when the file has none. A password is used for username login; rows without a password sign in with Google as",
        )}{" "}
        <Text code>username@hcmut.edu.vn</Text>. <Text code>can_log_in</Text>{" "}
        {t(
          "false creates a disabled account. Phone and language are accepted and not stored.",
        )}
      </Paragraph>
      <Space wrap style={{ marginBottom: 16 }}>
        <Button
          icon={<DownloadOutlined />}
          loading={downloadingTemplate}
          onClick={downloadUserTemplate}
        >
          {t("Download template")}
        </Button>
        <Upload
          accept=".xlsx,.csv,text/csv"
          showUploadList={false}
          beforeUpload={previewUsersFile}
        >
          <Button icon={<UploadOutlined />} loading={previewingImport}>
            {t("Upload file")}
          </Button>
        </Upload>
      </Space>
      {importPreview?.requiresFaculty ? (
        <Form layout="vertical" style={{ marginBottom: 16, maxWidth: 480 }}>
          <Form.Item
            label={t("Faculty for rows without one")}
            required
            style={{ marginBottom: 0 }}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={t("Select faculty")}
              value={importFacultyId || undefined}
              onChange={setImportFacultyId}
              options={faculties.map((faculty) => ({
                value: faculty.id,
                label: faculty.name,
              }))}
            />
          </Form.Item>
        </Form>
      ) : null}
      {importPreview ? (
        <>
          <Paragraph>
            {t("File:")} <Text strong>{importPreview.fileName}</Text> ·{" "}
            {t("Will import: {{count}}", {
              count: importPreview.toImportCount,
            })}{" "}
            · {t("Skipped: {{count}}", { count: importPreview.errorCount })}
          </Paragraph>
          {importPreview.toImport?.length ? (
            <Table
              size="small"
              rowKey={(row) => `${row.row}-${row.username}`}
              pagination={{ pageSize: 8, hideOnSinglePage: true }}
              dataSource={importPreview.toImport}
              style={{ marginBottom: 16 }}
              columns={[
                { title: t("Row"), dataIndex: "row", width: 70 },
                { title: t("Username"), dataIndex: "username" },
                { title: t("Display name"), dataIndex: "displayName" },
                { title: t("Email"), dataIndex: "email" },
                { title: t("Role"), dataIndex: "role", width: 120 },
                { title: t("Status"), dataIndex: "status", width: 90 },
                {
                  title: t("Faculty"),
                  dataIndex: "facultyName",
                  render: (value, row) => {
                    if (value) return value;
                    const needsFaculty =
                      row.role === "student" || row.role === "reviewer";
                    if (!needsFaculty || !importFacultyId) return "";
                    return (
                      faculties.find(
                        (faculty) => faculty.id === importFacultyId,
                      )?.name || ""
                    );
                  },
                },
              ]}
            />
          ) : (
            <Paragraph type="secondary">
              {t("No users will be imported from this file.")}
            </Paragraph>
          )}
          {importPreview.errors?.length ? (
            <Table
              size="small"
              title={() => t("Skipped rows")}
              rowKey={(row) =>
                `${row.row}-${row.username || ""}-${row.message}`
              }
              pagination={false}
              dataSource={importPreview.errors}
              columns={[
                { title: t("Row"), dataIndex: "row", width: 70 },
                { title: t("Username"), dataIndex: "username" },
                {
                  title: t("Reason"),
                  dataIndex: "message",
                  render: (value) => tr(value),
                },
              ]}
            />
          ) : null}
        </>
      ) : null}
      {importResult ? (
        <Paragraph style={{ marginTop: 12 }}>
          {t("Imported: {{created}} · Errors: {{errors}}", {
            created: importResult.createdCount,
            errors: importResult.errorCount,
          })}
          {importResult.errors?.length ? (
            <Table
              size="small"
              style={{ marginTop: 8 }}
              rowKey={(row) => `${row.username || ""}-${row.message}`}
              pagination={false}
              dataSource={importResult.errors}
              columns={[
                { title: t("Username"), dataIndex: "username" },
                {
                  title: t("Error"),
                  dataIndex: "message",
                  render: (value) => tr(value),
                },
              ]}
            />
          ) : null}
        </Paragraph>
      ) : null}
    </Modal>
  );
}
