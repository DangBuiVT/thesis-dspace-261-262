import { Tag, Typography, Space, Button } from "antd";
import {
  thesisStatusColor,
  reviewDecisionColor,
} from "../model/presentation.js";
import {
  statusText,
  decisionText,
  formatDateTime,
} from "../../../i18n/labels.js";
import { getStudentSubmissionCapabilities } from "../model/access.js";
const { Text } = Typography;

export function useSubmissionColumns({
  t,
  lang,
  actingStudentId,
  studentSubmissions,
  isAdminActor,
  loadSubmissionIntoForm,
  promptDeleteSubmission,
  setStudentDetailRecord,
  fileOpenLoadingKey,
  openProtectedSubmissionFile,
  setReviewerDetailRecord,
  reviewActionLoadingId,
  submitReviewAction,
  openRejectModal,
  staffSubmissions,
  setStaffDetailRecord,
}) {
  const submissionColumns = [
    {
      title: t("Title (EN)"),
      dataIndex: "title_en",
      key: "title_en",
      ellipsis: true,
      render: (_v, record) => record.title_en || record.title || "—",
    },
    {
      title: t("Faculty"),
      dataIndex: "faculty_name",
      key: "faculty_name",
      ellipsis: true,
      render: (value, record) => value || record.faculty_name || "—",
    },
    {
      title: t("Authors"),
      dataIndex: "author",
      key: "author",
      ellipsis: true,
    },
    {
      title: t("Reviewers"),
      dataIndex: "reviewer",
      key: "reviewer",
    },
    {
      title: t("Status"),
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={thesisStatusColor(status)}>{statusText(status, t)}</Tag>
      ),
    },
    {
      title: t("Reviewer Decisions"),
      key: "reviews",
      width: 340,
      render: (_value, record) => {
        const reviews = Array.isArray(record.reviews) ? record.reviews : [];
        if (reviews.length === 0) {
          return <Text type="secondary">{t("No reviewer decision yet")}</Text>;
        }
        return (
          <Space direction="vertical" size={2} style={{ width: "100%" }}>
            {reviews.map((review, idx) => (
              <div
                key={`${review.reviewerId || review.username || idx}-${idx}`}
              >
                <Text strong>
                  {review.reviewer || review.username || t("Reviewer")}
                </Text>{" "}
                <Tag color={reviewDecisionColor(review.decision)}>
                  {decisionText(review.decision, t)}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {review.decidedAt
                    ? t("at {{time}}", {
                        time: formatDateTime(review.decidedAt, lang),
                      })
                    : t("waiting")}
                </Text>
              </div>
            ))}
          </Space>
        );
      },
    },
    {
      title: t("Submitted At"),
      dataIndex: "created_at",
      key: "created_at",
      render: (createdAt) => formatDateTime(createdAt, lang),
    },
    {
      title: t("Actions"),
      key: "actions",
      width: 180,
      render: (_value, record) => {
        const caps = getStudentSubmissionCapabilities(
          record,
          actingStudentId,
          studentSubmissions,
        );
        return (
          <Space size={0}>
            {isAdminActor || caps.canEdit ? (
              <Button
                type="link"
                size="small"
                onClick={() => void loadSubmissionIntoForm(record)}
              >
                {t("Edit")}
              </Button>
            ) : null}
            {caps.canDelete ? (
              <Button
                type="link"
                size="small"
                danger
                onClick={() => promptDeleteSubmission(record)}
              >
                {t("Delete")}
              </Button>
            ) : null}
            <Button
              type="link"
              size="small"
              onClick={() => setStudentDetailRecord(record)}
            >
              {t("Detail")}
            </Button>
          </Space>
        );
      },
    },
  ];

  const adminSubmissionColumns = [
    {
      title: t("Title"),
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      width: 180,
    },
    {
      title: t("Submitter"),
      key: "submitter",
      ellipsis: true,
      width: 140,
      render: (_v, record) => (
        <span>
          {record.submitter || "—"}
          {record.submitter_username ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {" "}
              ({record.submitter_username})
            </Text>
          ) : null}
        </span>
      ),
    },
    {
      title: t("Authors"),
      dataIndex: "author",
      key: "author",
      ellipsis: true,
      width: 160,
    },
    {
      title: t("Reviewers"),
      dataIndex: "reviewer",
      key: "reviewer",
      ellipsis: true,
      width: 160,
    },
    {
      title: t("Abstract"),
      dataIndex: "abstract",
      key: "abstract",
      ellipsis: true,
      width: 200,
    },
    {
      title: t("DSpace"),
      dataIndex: "dspace_item_id",
      key: "dspace_item_id",
      width: 100,
      ellipsis: true,
      render: (v) => (v ? <Text code>{v}</Text> : "—"),
    },
    {
      title: t("Status"),
      dataIndex: "status",
      key: "status",
      width: 100,
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
  ];

  const reviewerQueueColumns = [
    {
      title: t("Title"),
      dataIndex: "title",
      key: "title",
      width: 200,
      ellipsis: true,
    },
    {
      title: t("Authors"),
      dataIndex: "author",
      key: "author",
      width: 200,
      ellipsis: true,
    },
    {
      title: t("Reviewers (assigned)"),
      dataIndex: "reviewer",
      key: "reviewer",
      width: 200,
      ellipsis: true,
    },
    {
      title: t("Abstract"),
      dataIndex: "abstract",
      key: "abstract",
      ellipsis: true,
    },
    {
      title: t("Files"),
      key: "files",
      width: 220,
      render: (_v, record) => {
        const files = Array.isArray(record.files) ? record.files : [];
        if (files.length === 0) {
          return <Text type="secondary">—</Text>;
        }
        return (
          <Space direction="vertical" size={2} style={{ width: "100%" }}>
            {files.map((f) => (
              <Button
                key={f.id}
                type="link"
                size="small"
                style={{
                  padding: 0,
                  height: "auto",
                  textAlign: "left",
                  display: "block",
                  width: "100%",
                  whiteSpace: "normal",
                  lineHeight: 1.25,
                }}
                loading={fileOpenLoadingKey === `${record.id}:${f.id}`}
                onClick={() =>
                  void openProtectedSubmissionFile(record.id, f.id)
                }
              >
                <Tag style={{ marginInlineEnd: 4 }}>{f.fileType}</Tag>
                <span
                  style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                >
                  {f.fileName}
                </span>
              </Button>
            ))}
          </Space>
        );
      },
    },
    {
      title: t("Submitted At"),
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (createdAt) => formatDateTime(createdAt, lang),
    },
    {
      title: t("Actions"),
      key: "actions",
      width: 280,
      render: (_value, record) => {
        const isPendingForMe = record.my_decision === "pending";
        return (
          <Space>
            <Button
              type="link"
              size="small"
              onClick={() => setReviewerDetailRecord(record)}
            >
              {t("Detail")}
            </Button>
            {isPendingForMe ? (
              <>
                <Button
                  type="primary"
                  loading={reviewActionLoadingId === record.id}
                  onClick={() => submitReviewAction(record.id, "approve")}
                >
                  {t("Approve")}
                </Button>
                <Button
                  danger
                  loading={reviewActionLoadingId === record.id}
                  onClick={() => openRejectModal(record.id)}
                >
                  {t("Reject")}
                </Button>
              </>
            ) : (
              <Tag color={reviewDecisionColor(record.my_decision)}>
                {decisionText(record.my_decision, t)}
              </Tag>
            )}
          </Space>
        );
      },
    },
  ];

  const openQueueSubmissionDetail = (record) => {
    const full = staffSubmissions.find((item) => item.id === record.id);
    setStaffDetailRecord(
      full || {
        ...record,
        status: record.status || record.submission_status,
      },
    );
  };

  const buildStageQueueColumns = (
    loadingId,
    onApprove,
    onReject,
    approveLabel,
  ) => [
    {
      title: t("Title"),
      dataIndex: "title",
      key: "title",
      width: 220,
      ellipsis: true,
    },
    {
      title: t("Authors"),
      dataIndex: "author",
      key: "author",
      width: 220,
      ellipsis: true,
    },
    {
      title: t("Reviewers"),
      dataIndex: "reviewer",
      key: "reviewer",
      width: 220,
      ellipsis: true,
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
      width: 180,
      render: (createdAt) => formatDateTime(createdAt, lang),
    },
    {
      title: t("Actions"),
      key: "actions",
      width: 320,
      render: (_value, record) => (
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
            loading={loadingId === record.id}
            onClick={() => onApprove(record.id)}
          >
            {approveLabel}
          </Button>
          <Button
            danger
            loading={loadingId === record.id}
            onClick={() => onReject(record.id)}
          >
            {t("Reject")}
          </Button>
        </Space>
      ),
    },
  ];

  const buildDirectorArchiveColumns = (
    loadingId,
    onArchive,
    onApprove,
    onReject,
  ) => [
    {
      title: t("Title"),
      dataIndex: "title",
      key: "title",
      width: 220,
      ellipsis: true,
    },
    {
      title: t("Authors"),
      dataIndex: "author",
      key: "author",
      width: 200,
      ellipsis: true,
    },
    {
      title: t("Status"),
      dataIndex: "submission_status",
      key: "submission_status",
      width: 110,
      render: (status) => (
        <Tag color={thesisStatusColor(status)}>{statusText(status, t)}</Tag>
      ),
    },
    {
      title: t("Collection / period"),
      key: "period",
      width: 180,
      ellipsis: true,
      render: (_v, record) =>
        record.semester_name || record.faculty_name
          ? `${record.faculty_name || ""} / ${record.semester_name || ""}`.trim()
          : "—",
    },
    {
      title: t("Submitted At"),
      dataIndex: "created_at",
      key: "created_at",
      width: 170,
      render: (createdAt) => formatDateTime(createdAt, lang),
    },
    {
      title: t("Actions"),
      key: "actions",
      width: 300,
      render: (_value, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => openQueueSubmissionDetail(record)}
          >
            {t("Detail")}
          </Button>
          {record.current_step_is_last === false ? (
            <Button
              type="primary"
              loading={loadingId === record.id}
              onClick={() => onApprove(record.id)}
            >
              {t("Approve")}
            </Button>
          ) : (
            <Button
              type="primary"
              loading={loadingId === record.id}
              onClick={() => onArchive(record.id)}
            >
              {t("Commit to Archive")}
            </Button>
          )}
          <Button
            loading={loadingId === record.id}
            onClick={() => onReject(record.id)}
          >
            {t("Return to Editor")}
          </Button>
        </Space>
      ),
    },
  ];
  return {
    submissionColumns,
    adminSubmissionColumns,
    reviewerQueueColumns,
    openQueueSubmissionDetail,
    buildStageQueueColumns,
    buildDirectorArchiveColumns,
  };
}
