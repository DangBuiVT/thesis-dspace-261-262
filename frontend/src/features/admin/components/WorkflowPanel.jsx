import { Typography, Space, Select, Input, Button, Table } from "antd";
import { roleText } from "../../../i18n/labels";
const { Paragraph } = Typography;
import { useAdmin } from "../AdminContext";
export default function WorkflowPanel() {
  const {
    t,
    newStepRole,
    setNewStepRole,
    newStepLabel,
    setNewStepLabel,
    setWorkflowSteps,
    savingWorkflow,
    saveWorkflow,
    workflowSteps,
    loadWorkflow,
    loadingWorkflow,
    moveWorkflowStep,
  } = useAdmin();
  return (
    <>
      <Paragraph type="secondary">
        {t(
          "Add, remove, and reorder approval steps. Each step uses an existing role. A role can be left out or used more than once. Theses already submitted keep the steps they had when they were submitted.",
        )}
      </Paragraph>
      <Space style={{ marginBottom: 12 }} wrap>
        <Select
          value={newStepRole}
          onChange={setNewStepRole}
          style={{ minWidth: 180 }}
          options={[
            { value: "reviewer", label: roleText("reviewer", t) },
            { value: "library_staff", label: roleText("library_staff", t) },
            { value: "director", label: roleText("director", t) },
          ]}
        />
        <Input
          value={newStepLabel}
          onChange={(event) => setNewStepLabel(event.target.value)}
          placeholder={t("Step label")}
          style={{ minWidth: 220 }}
        />
        <Button
          onClick={() => {
            setWorkflowSteps((current) => [
              ...current,
              { role: newStepRole, label: newStepLabel.trim() },
            ]);
            setNewStepLabel("");
          }}
        >
          {t("Add step")}
        </Button>
        <Button
          type="primary"
          loading={savingWorkflow}
          onClick={() => void saveWorkflow(workflowSteps)}
        >
          {t("Save workflow")}
        </Button>
        <Button onClick={() => void loadWorkflow()} loading={loadingWorkflow}>
          {t("Refresh")}
        </Button>
      </Space>
      <Table
        rowKey={(row, index) => `${row.role}-${index}`}
        loading={loadingWorkflow}
        dataSource={workflowSteps}
        pagination={false}
        columns={[
          {
            title: t("Order"),
            width: 80,
            render: (_v, _row, index) => index + 1,
          },
          {
            title: t("Role"),
            dataIndex: "role",
            render: (role) => roleText(role, t),
          },
          {
            title: t("Label"),
            dataIndex: "label",
            render: (label) => label || "—",
          },
          {
            title: t("Actions"),
            width: 220,
            render: (_v, _row, index) => (
              <Space>
                <Button
                  size="small"
                  disabled={index === 0}
                  onClick={() => moveWorkflowStep(index, -1)}
                >
                  {t("Up")}
                </Button>
                <Button
                  size="small"
                  disabled={index === workflowSteps.length - 1}
                  onClick={() => moveWorkflowStep(index, 1)}
                >
                  {t("Down")}
                </Button>
                <Button
                  size="small"
                  danger
                  disabled={workflowSteps.length <= 1}
                  onClick={() =>
                    setWorkflowSteps((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  {t("Delete")}
                </Button>
              </Space>
            ),
          },
        ]}
      />
    </>
  );
}
