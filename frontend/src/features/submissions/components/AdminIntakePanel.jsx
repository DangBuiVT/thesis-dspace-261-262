import SubmissionFilters from "./SubmissionFilters";
import { Button, Divider, Space, Tag, Typography } from "antd";
import TaskQueue from "../workflow/TaskQueue.jsx";
import { thesisStatusColor } from "../model/presentation.js";
import { statusText, formatDateTime } from "../../../i18n/labels.js";
import { useSubmissions } from "../SubmissionContext.jsx";

const { Paragraph, Title } = Typography;

// Administrators can move a thesis through any pending step without the step's role.
export default function AdminIntakePanel() {
  const {
    t,
    lang,
    staffSearch,
    setStaffSearch,
    staffSemesterFilter,
    setStaffSemesterFilter,
    staffPeriodFilter,
    setStaffPeriodFilter,
    adminIntakeQueue,
    adminIntakeFilteredQueue,
    loadAdminIntakeQueue,
    isLoadingAdminIntakeQueue,
    adminIntakeActionLoadingId,
    submitAdminIntakeAction,
    openAdminRejectModal,
    openQueueSubmissionDetail,
  } = useSubmissions();

  const approveLabel = (record) => {
    if (record.current_step_role === "director") {
      return record.current_step_is_last
        ? t("Archive & sign")
        : t("Approve (director)");
    }
    if (record.current_step_role === "reviewer") return t("Approve (reviewer)");
    if (record.current_step_role === "library_staff")
      return t("Accept (library)");
    return t("Approve");
  };

  const columns = [
    {
      title: t("Title"),
      dataIndex: "title",
      key: "title",
      width: 220,
      ellipsis: true,
    },
    {
      title: t("Submitter"),
      key: "submitter",
      width: 160,
      ellipsis: true,
      render: (_v, record) =>
        record.submitter || record.submitter_username || "—",
    },
    {
      title: t("Status"),
      dataIndex: "submission_status",
      key: "submission_status",
      width: 120,
      render: (status) => (
        <Tag color={thesisStatusColor(status)}>{statusText(status, t)}</Tag>
      ),
    },
    {
      title: t("Submitted At"),
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (createdAt) => formatDateTime(createdAt, lang),
    },
    {
      title: t("Actions"),
      key: "actions",
      width: 340,
      render: (_value, record) => {
        const archiveNow =
          record.current_step_role === "director" && record.current_step_is_last;
        return (
          <Space>
            <Button
              type="link"
              size="small"
              onClick={() => openQueueSubmissionDetail(record)}
            >
              {t("Detail")}
            </Button>
            <Button
              type="primary"
              loading={adminIntakeActionLoadingId === record.id}
              onClick={() =>
                void submitAdminIntakeAction(
                  record.id,
                  archiveNow ? "archive" : "approve",
                )
              }
            >
              {approveLabel(record)}
            </Button>
            <Button
              danger
              loading={adminIntakeActionLoadingId === record.id}
              onClick={() => openAdminRejectModal(record.id)}
            >
              {t("Reject")}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <Paragraph type="secondary">
        {t(
          "Admin intake: approve, archive or reject a thesis at any review step on behalf of the responsible role.",
        )}
      </Paragraph>
      <SubmissionFilters
        search={staffSearch}
        onSearch={setStaffSearch}
        semester={staffSemesterFilter}
        onSemester={setStaffSemesterFilter}
        period={staffPeriodFilter}
        onPeriod={setStaffPeriodFilter}
        items={adminIntakeQueue}
      />
      <Divider style={{ margin: "12px 0" }} />
      <Space
        style={{
          width: "100%",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Title level={5} style={{ margin: 0 }}>
          {t("Pending at any step ({{count}})", {
            count: adminIntakeFilteredQueue.length,
          })}
        </Title>
        <Button
          onClick={() => loadAdminIntakeQueue()}
          loading={isLoadingAdminIntakeQueue}
        >
          {t("Refresh")}
        </Button>
      </Space>
      <TaskQueue
        rowKey="id"
        dataSource={adminIntakeFilteredQueue}
        columns={columns}
        loading={isLoadingAdminIntakeQueue}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1200 }}
      />
    </>
  );
}
