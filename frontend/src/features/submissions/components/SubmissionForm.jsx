import { useEffect, useState } from "react";
import { Alert, Button, Form, Input, Select, Spin, Typography } from "antd";
import { useSubmissions } from "../SubmissionContext.jsx";
import ConfiguredSubmissionField from "./ConfiguredSubmissionField.jsx";
import SubmissionFormActions from "./SubmissionFormActions.jsx";
import AdminSubmissionOptions from "./AdminSubmissionOptions.jsx";

export default function SubmissionForm() {
  const model = useSubmissions();
  const { t, auth, submissionForm, submissionFormFields, formSections, formSchemaError, formFieldsLoaded,
    isAdminActor, isFormReadOnly, editingSubmissionId, loadSubmissionFormFields } = model;
  const [step, setStep] = useState(0);
  useEffect(() => setStep(0), [editingSubmissionId]);
  const fields = submissionFormFields.filter(field => field.enabled && !["author", "title"].includes(field.fieldKey));
  const sections = formSections.filter(section => fields.some(field => field.sectionKey === section.key));
  const active = Math.min(step, Math.max(0, sections.length - 1));
  const next = async () => {
    try {
      await submissionForm.validateFields(fields.filter(field => field.sectionKey === sections[active]?.key).map(field => field.fieldKey));
      setStep(active + 1);
    } catch { /* Ant Form displays the question errors. */ }
  };
  return <Form layout="vertical" form={submissionForm} autoComplete="off">
    {formSchemaError && <Alert type="error" showIcon message={t(formSchemaError)} action={<Button onClick={() => void loadSubmissionFormFields(auth.token)}>{t("Retry")}</Button>} />}
    {!formFieldsLoaded && !formSchemaError ? <Spin /> : null}
    {formFieldsLoaded && <>
      {isAdminActor ? <Form.Item label={t("Submitting student")} name="studentId" rules={[{ required: true }]}>
        <Select showSearch allowClear optionFilterProp="label" options={model.studentOptions} loading={model.isLoadingStudents} onChange={model.handleAdminStudentChange} />
      </Form.Item> : <Form.Item name="studentId" hidden><Input /></Form.Item>}
      <fieldset disabled={isFormReadOnly} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        {sections.map((section, index) => <div key={section.key} style={{ display: active === index ? undefined : "none" }}>
          <Typography.Title level={5}>{t("Step {{current}} of {{total}}", { current: index + 1, total: sections.length })}: {t(section.title)}</Typography.Title>
          {section.description && <Typography.Paragraph style={{ whiteSpace: "pre-line" }}>{t(section.description)}</Typography.Paragraph>}
          {section.key === "checklist" && <Typography.Paragraph><a href="https://drive.google.com/file/d/1kmhnVDYJP6NsTTPyesOiadX5ku0NoeG7/view?usp=sharing" target="_blank" rel="noopener noreferrer">{t("Thesis checklist (Form 10)")}</a></Typography.Paragraph>}
          {section.key === "metadata" && <AdminSubmissionOptions />}
          {fields.filter(field => field.sectionKey === section.key).map(field => <ConfiguredSubmissionField key={field.id} field={field} />)}
        </div>)}
        <SubmissionFormActions canSubmit={(sections.length === 0 || active === sections.length - 1) && !formSchemaError}
          onNext={active < sections.length - 1 ? next : undefined}
          onBack={active > 0 ? () => setStep(active - 1) : undefined}
          onValidationError={error => {
            const firstKey = error?.errorFields?.[0]?.name?.[0];
            const sectionKey = fields.find(field => field.fieldKey === firstKey)?.sectionKey;
            const index = sections.findIndex(section => section.key === sectionKey);
            if (index >= 0) setStep(index);
          }} />
      </fieldset>
    </>}
  </Form>;
}
