import SubmissionFilters from "./SubmissionFilters";
import { Tabs, Typography, Divider, Space, Button } from "antd";
import TaskQueue from "../workflow/TaskQueue.jsx";
import { DownloadOutlined } from "@ant-design/icons";
const { Paragraph, Title } = Typography;
import { useSubmissions } from "../SubmissionContext.jsx";

export default function StaffDashboard({ archivePanel }) {
  const {
    auth,
    t,
    staffSearch,
    setStaffSearch,
    staffSemesterFilter,
    setStaffSemesterFilter,
    staffPeriodFilter,
    setStaffPeriodFilter,
    staffFilterSource,
    loadLibraryQueue,
    isLoadingLibraryQueue,
    libraryFilteredQueue,
    buildStageQueueColumns,
    libraryActionLoadingId,
    submitLibraryAction,
    openLibraryRejectModal,
    loadDirectorQueue,
    isLoadingDirectorQueue,
    directorFilteredQueue,
    buildDirectorArchiveColumns,
    directorActionLoadingId,
    requestDirectorArchive,
    submitStageAction,
    openDirectorReturnModal,
    exportAllSubmissions,
    loadStaffSubmissions,
    isLoadingSubmissions,
    staffFilteredSubmissions,
    adminSubmissionColumns,
    setStaffDetailRecord,
  } = useSubmissions();
  return (
    <Tabs
      defaultActiveKey="workflow"
      items={[
        {
          key: "workflow",
          label:
            auth.user.role === "director"
              ? t("Approval workflow")
              : t("Intake & submissions"),
          children: (
            <>
              <Paragraph type="secondary">
                {t("Workflow:")} {t("Academic review")} → {t("Library editing")}{" "}
                → {t("Final approval")} → {t("Archived in portal")}.
              </Paragraph>
              {
                <SubmissionFilters
                  {...{
                    search: staffSearch,
                    onSearch: setStaffSearch,
                    semester: staffSemesterFilter,
                    onSemester: setStaffSemesterFilter,
                    period: staffPeriodFilter,
                    onPeriod: setStaffPeriodFilter,
                    items: staffFilterSource,
                  }}
                />
              }
              {auth.user.role === "library_staff" && (
                <>
                  <Divider style={{ margin: "8px 0" }} />
                  <Space
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Title level={5} style={{ margin: 0 }}>
                      {t("Library intake queue")}
                    </Title>
                    <Button
                      onClick={() => loadLibraryQueue()}
                      loading={isLoadingLibraryQueue}
                    >
                      {t("Refresh")}
                    </Button>
                  </Space>
                  <TaskQueue
                    rowKey="id"
                    dataSource={libraryFilteredQueue}
                    columns={buildStageQueueColumns(
                      libraryActionLoadingId,
                      (id) => submitLibraryAction(id, "approve"),
                      openLibraryRejectModal,
                      t("Approve"),
                    )}
                    loading={isLoadingLibraryQueue}
                    pagination={{ pageSize: 5 }}
                    scroll={{ x: 1250 }}
                  />
                </>
              )}
              {auth.user.role === "director" && (
                <>
                  <Divider style={{ margin: "8px 0" }} />
                  <Space
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <div>
                      <Title level={5} style={{ margin: 0 }}>
                        {t("Archive approved submissions")}
                      </Title>
                      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        {t(
                          "Archive this submission in the portal? DSpace publication is a separate step.",
                        )}
                      </Paragraph>
                    </div>
                    <Button
                      onClick={() => loadDirectorQueue()}
                      loading={isLoadingDirectorQueue}
                    >
                      {t("Refresh")}
                    </Button>
                  </Space>
                  <TaskQueue
                    rowKey="id"
                    dataSource={directorFilteredQueue}
                    columns={buildDirectorArchiveColumns(
                      directorActionLoadingId,
                      (id) => requestDirectorArchive(id),
                      (id) =>
                        submitStageAction(
                          "director-action",
                          id,
                          "approve",
                          undefined,
                          t("Approved"),
                        ),
                      (id) => openDirectorReturnModal(id),
                    )}
                    loading={isLoadingDirectorQueue}
                    pagination={{ pageSize: 5 }}
                    scroll={{ x: 1250 }}
                  />
                </>
              )}
              <Divider style={{ margin: "8px 0" }} />
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Title level={5} style={{ margin: 0 }}>
                  {t("All submissions")}
                </Title>
                <Space>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={exportAllSubmissions}
                  >
                    {t("Export submissions")}
                  </Button>
                  <Button
                    onClick={() => {
                      void loadStaffSubmissions();
                      if (auth.user.role === "library_staff") {
                        void loadLibraryQueue();
                      }
                      if (auth.user.role === "director") {
                        void loadDirectorQueue();
                      }
                    }}
                    loading={
                      isLoadingSubmissions ||
                      isLoadingLibraryQueue ||
                      isLoadingDirectorQueue
                    }
                  >
                    {t("Refresh")}
                  </Button>
                </Space>
              </Space>
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
            </>
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
