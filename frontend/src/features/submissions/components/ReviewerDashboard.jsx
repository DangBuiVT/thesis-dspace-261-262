import SubmissionFilters from "./SubmissionFilters";
import { Typography, Divider, Space, Button } from "antd";
import TaskQueue from "../workflow/TaskQueue.jsx";
const { Paragraph, Title } = Typography;
import { useSubmissions } from "../SubmissionContext.jsx";

export default function ReviewerDashboard() {
  const {
    t,
    loadReviewerQueue,
    isLoadingReviewerQueue,
    reviewerSearch,
    setReviewerSearch,
    reviewerSemesterFilter,
    setReviewerSemesterFilter,
    reviewerPeriodFilter,
    setReviewerPeriodFilter,
    reviewerQueue,
    reviewerNeedMyDecision,
    reviewerQueueColumns,
    reviewerApproved,
    reviewerRejected,
  } = useSubmissions();
  return (
    <>
      <Paragraph type="secondary">
        {t(
          "Review all theses where you are assigned as advisor/reviewer. Use search and grouped queues.",
        )}
      </Paragraph>
      <Divider style={{ margin: "8px 0" }} />
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={5} style={{ margin: 0 }}>
          {t("Reviewer Workspace")}
        </Title>
        <Button
          onClick={() => loadReviewerQueue()}
          loading={isLoadingReviewerQueue}
        >
          {t("Refresh")}
        </Button>
      </Space>
      {
        <SubmissionFilters
          {...{
            search: reviewerSearch,
            onSearch: setReviewerSearch,
            semester: reviewerSemesterFilter,
            onSemester: setReviewerSemesterFilter,
            period: reviewerPeriodFilter,
            onPeriod: setReviewerPeriodFilter,
            items: reviewerQueue,
          }}
        />
      }
      <Title level={5} style={{ margin: "8px 0 0" }}>
        {t("Need My Review ({{count}})", {
          count: reviewerNeedMyDecision.length,
        })}
      </Title>
      <TaskQueue
        rowKey="id"
        dataSource={reviewerNeedMyDecision}
        columns={reviewerQueueColumns}
        loading={isLoadingReviewerQueue}
        pagination={{ pageSize: 5 }}
        scroll={{ x: 1320 }}
      />
      <Title level={5} style={{ margin: "8px 0 0" }}>
        {t("I Approved ({{count}})", { count: reviewerApproved.length })}
      </Title>
      <TaskQueue
        rowKey="id"
        dataSource={reviewerApproved}
        columns={reviewerQueueColumns}
        loading={isLoadingReviewerQueue}
        pagination={{ pageSize: 5 }}
        scroll={{ x: 1320 }}
      />
      <Title level={5} style={{ margin: "8px 0 0" }}>
        {t("I Rejected ({{count}})", { count: reviewerRejected.length })}
      </Title>
      <TaskQueue
        rowKey="id"
        dataSource={reviewerRejected}
        columns={reviewerQueueColumns}
        loading={isLoadingReviewerQueue}
        pagination={{ pageSize: 5 }}
        scroll={{ x: 1320 }}
      />
    </>
  );
}
