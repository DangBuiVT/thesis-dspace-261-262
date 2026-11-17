import {
  Modal,
  Space,
  Button,
  Typography,
  Statistic,
  Descriptions,
  Tag,
} from "antd";
import { statusText, formatDateTime } from "../../../i18n/labels";
import { periodStatusColor } from "../model/dates.js";
const { Text } = Typography;
import { useArchive } from "../ArchiveContext";
export default function ArchiveDetailDialog() {
  const {
    detailKind,
    t,
    closeDetail,
    detailRecord,
    canManageFaculties,
    allowEdit,
    openEditFromDetail,
    actionId,
    confirmDeleteFromDetail,
    detailLoading,
    lang,
  } = useArchive();
  return (
    <Modal
      title={
        detailKind === "faculty"
          ? t("Faculty detail")
          : detailKind === "semester"
            ? t("Semester detail")
            : detailKind === "period"
              ? t("Submission period detail")
              : t("Detail")
      }
      open={Boolean(detailKind)}
      onCancel={closeDetail}
      width={720}
      destroyOnClose
      footer={
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Button onClick={closeDetail}>{t("Close")}</Button>
          {detailRecord &&
          ((detailKind === "faculty" && canManageFaculties) ||
            (detailKind === "semester" && canManageFaculties) ||
            (detailKind === "period" && allowEdit)) ? (
            <Space>
              <Button onClick={openEditFromDetail}>{t("Edit")}</Button>
              <Button
                danger
                loading={actionId === `delete-${detailRecord.id}`}
                onClick={confirmDeleteFromDetail}
              >
                {t("Delete")}
              </Button>
            </Space>
          ) : null}
        </Space>
      }
    >
      {detailLoading || !detailRecord ? (
        <Text type="secondary">{t("Loading…")}</Text>
      ) : (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {detailKind === "faculty" && (
            <>
              <Space size="large" wrap>
                <Statistic
                  title={t("Semesters")}
                  value={detailRecord.semesterCount ?? 0}
                />
                <Statistic
                  title={t("Submission periods")}
                  value={detailRecord.periodCount ?? 0}
                />
                <Statistic
                  title={t("Submissions")}
                  value={detailRecord.submissionCount ?? 0}
                />
              </Space>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label={t("Name")}>
                  {detailRecord.name}
                </Descriptions.Item>
                <Descriptions.Item label={t("Status")}>
                  <Tag
                    color={
                      detailRecord.status === "active" ? "green" : "default"
                    }
                  >
                    {statusText(detailRecord.status, t)}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </>
          )}
          {detailKind === "semester" && (
            <>
              <Space size="large" wrap>
                <Statistic
                  title={t("Submission periods")}
                  value={detailRecord.periodCount ?? 0}
                />
                <Statistic
                  title={t("Submissions")}
                  value={detailRecord.submissionCount ?? 0}
                />
              </Space>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label={t("Name")}>
                  {detailRecord.name}
                </Descriptions.Item>
                <Descriptions.Item label={t("Status")}>
                  <Tag
                    color={
                      detailRecord.status === "active" ? "green" : "default"
                    }
                  >
                    {detailRecord.status
                      ? statusText(detailRecord.status, t)
                      : "—"}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </>
          )}
          {detailKind === "period" && (
            <>
              <Space size="large" wrap>
                <Statistic
                  title={t("Submissions")}
                  value={detailRecord.submissionCount ?? 0}
                />
              </Space>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label={t("Name")}>
                  {detailRecord.name}
                </Descriptions.Item>
                <Descriptions.Item label={t("Semester")}>
                  {detailRecord.semesterName || "—"}
                </Descriptions.Item>
                <Descriptions.Item label={t("Status")}>
                  <Tag color={periodStatusColor(detailRecord.status)}>
                    {statusText(detailRecord.status, t)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label={t("Opens")}>
                  {formatDateTime(detailRecord.opensAt, lang)}
                </Descriptions.Item>
                <Descriptions.Item label={t("Closes")}>
                  {formatDateTime(detailRecord.closesAt, lang)}
                </Descriptions.Item>
                <Descriptions.Item label={t("Allow resubmit")}>
                  {detailRecord.allowResubmit ? t("Yes") : t("No")}
                </Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Space>
      )}
    </Modal>
  );
}
