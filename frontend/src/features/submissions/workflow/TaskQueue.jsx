import { Empty, Table, Tag } from "antd";
import { useI18n } from "../../../i18n/I18nProvider";

export function stageLabel(role) {
  return (
    {
      reviewer: "Academic review",
      library_staff: "Library editing",
      director: "Final approval",
    }[role] || "Current stage"
  );
}
export default function TaskQueue({ columns, dataSource, ...props }) {
  const { t } = useI18n();
  const showStage = dataSource?.some((record) => record.current_step_role);
  const queueColumns = showStage
    ? [
        ...columns.filter((column) => column.key !== "actions"),
        {
          title: t("Current stage"),
          key: "current-stage",
          width: 150,
          render: (_, record) => (
            <Tag color="blue">{t(stageLabel(record.current_step_role))}</Tag>
          ),
        },
        ...columns.filter((column) => column.key === "actions"),
      ]
    : columns;
  return (
    <Table
      {...props}
      className="task-queue"
      columns={queueColumns}
      dataSource={dataSource}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("No submissions match this queue")}
          />
        ),
      }}
    />
  );
}
