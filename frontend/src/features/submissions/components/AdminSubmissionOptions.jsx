import { Alert, Card, Form, Space, Switch, Typography } from "antd";
import { useSubmissions } from "../SubmissionContext.jsx";

export default function AdminSubmissionOptions() {
  const { t, isAdminActor, workflowStepFields, noReviewStepsSelected } = useSubmissions();
  if (!isAdminActor) return null;
  return (
    <Card size="small" title={t("Review steps for this submission")} style={{ marginBottom: 16 }}>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
        {t("Turn off a step to skip it. With every step off, the thesis is archived and digitally signed immediately.")}
      </Typography.Paragraph>
      <Space wrap size="large">
        {workflowStepFields.map(step => (
          <Form.Item key={step.name} name={step.name} valuePropName="checked" initialValue noStyle>
            <Switch checkedChildren={t(step.label)} unCheckedChildren={t(step.label)} />
          </Form.Item>
        ))}
      </Space>
      {noReviewStepsSelected && <Alert style={{ marginTop: 12 }} type="warning" showIcon
        message={t("No review: the thesis will be archived and signed as soon as it is submitted.")} />}
    </Card>
  );
}
