import ThesisEntryWorkspace from "./ThesisEntryWorkspace";
import SubmissionFilters from "./SubmissionFilters";
import { Tabs, Typography, Space, Button, Modal } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import TaskQueue from "../workflow/TaskQueue.jsx";
const { Paragraph, Title } = Typography;
import { useSubmissions } from "../SubmissionContext.jsx";

export default function AdminSubmissionDashboard({
  administration,
  formFieldsPanel,
  archivePanel,
} = {}) {
  const {
    adminDashTab,
    setAdminDashTab,
    t,
    openAdminCreateSubmission,
    exportAllSubmissions,
    loadStaffSubmissions,
    isLoadingSubmissions,
    staffSearch,
    setStaffSearch,
    staffSemesterFilter,
    setStaffSemesterFilter,
    staffPeriodFilter,
    setStaffPeriodFilter,
    staffSubmissions,
    staffFilteredSubmissions,
    adminSubmissionColumns,
    setStaffDetailRecord,
    editingSubmissionId,
    adminSubmissionModalOpen,
    resetSubmissionForm,
  } = useSubmissions();
  return (
    <Tabs
      activeKey={adminDashTab}
      onChange={setAdminDashTab}
      items={[
        {
          key: "admin",
          label: t("Administration"),
          children: administration,
        },
        {
          key: "submissions",
          label: t("Submissions"),
          children: (
            <Tabs
              items={[
                {
                  key: "list",
                  label: t("All submissions"),
                  children: (
                    <>
                      <Paragraph type="secondary">
                        {t(
                          "Click a row to view details. Edit and delete are in the detail view, including archived items linked to DSpace.",
                        )}
                      </Paragraph>
                      <Space
                        style={{
                          width: "100%",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <Title level={5} style={{ margin: 0 }}>
                          {t("All submissions")}
                        </Title>
                        <Space>
                          <Button
                            type="primary"
                            onClick={openAdminCreateSubmission}
                          >
                            {t("Create submission")}
                          </Button>
                          <Button
                            icon={<DownloadOutlined />}
                            onClick={exportAllSubmissions}
                          >
                            {t("Export submissions")}
                          </Button>
                          <Button
                            onClick={() => void loadStaffSubmissions()}
                            loading={isLoadingSubmissions}
                          >
                            {t("Refresh")}
                          </Button>
                        </Space>
                      </Space>
                      {
                        <SubmissionFilters
                          {...{
                            search: staffSearch,
                            onSearch: setStaffSearch,
                            semester: staffSemesterFilter,
                            onSemester: setStaffSemesterFilter,
                            period: staffPeriodFilter,
                            onPeriod: setStaffPeriodFilter,
                            items: staffSubmissions,
                          }}
                        />
                      }
                      <TaskQueue
                        rowKey="id"
                        dataSource={staffFilteredSubmissions}
                        columns={adminSubmissionColumns}
                        loading={isLoadingSubmissions}
                        pagination={{ pageSize: 8 }}
                        scroll={{ x: 1400 }}
                        onRow={(record) => ({
                          onClick: () => setStaffDetailRecord(record),
                          style: { cursor: "pointer" },
                        })}
                      />
                      <Modal
                        title={
                          editingSubmissionId
                            ? t("Edit submission")
                            : t("Create submission")
                        }
                        open={adminSubmissionModalOpen}
                        onCancel={resetSubmissionForm}
                        footer={null}
                        width={880}
                        destroyOnClose
                      >
                        {<ThesisEntryWorkspace />}
                      </Modal>
                    </>
                  ),
                },
                {
                  key: "form-fields",
                  label: t("Submission fields"),
                  children: formFieldsPanel,
                },
              ]}
            />
          ),
        },
        {
          key: "archive",
          label: t("Archive configuration"),
          children: archivePanel,
        },
      ]}
    />
  );
}
