import { Checkbox, Form, Input, Select, Space } from "antd";
import { useSubmissions } from "../SubmissionContext.jsx";
import { configuredFieldRules, THESIS_YEAR_OPTIONS } from "../model/formConfig.js";
import { personOptionFilter } from "../model/people.js";
import { formatDate, optionDisplayLabel } from "../../../i18n/labels.js";
import ThesisFileField from "./ThesisFileField.jsx";

export default function ConfiguredSubmissionField({ field }) {
  const model = useSubmissions();
  const { t, isFormReadOnly, isAdminActor } = model;
  if (!field.enabled) return null;
  if (model.isOtherFaculty && ["archiveSemesterId", "submissionPeriodId"].includes(field.fieldKey)) return null;
  if (field.fieldKey === "thesisFile" && field.inputType === "file") return <ThesisFileField field={field} />;
  const label = t(field.label);
  let control = <Input placeholder={field.defaultValue || label} />;
  if (field.inputType === "textarea") control = <Input.TextArea rows={3} />;
  if (field.inputType === "checkboxes") {
    control = <Checkbox.Group><Space direction="vertical">
      {(field.options || []).map(option => <Checkbox key={option.value} value={option.value}>{optionDisplayLabel(option, t)}</Checkbox>)}
    </Space></Checkbox.Group>;
  }
  if (field.inputType === "select" || field.inputType === "year") {
    let props = {
      allowClear: true,
      showSearch: true,
      optionFilterProp: "label",
      placeholder: label,
      options: field.inputType === "year" ? THESIS_YEAR_OPTIONS : (field.options || []).map(option => ({ value: option.value, label: optionDisplayLabel(option, t) })),
    };
    switch (field.fieldKey) {
      case "authorIds":
        props = { ...props, mode: "multiple", options: model.studentOptions, loading: model.isLoadingStudents,
          filterOption: personOptionFilter, maxTagCount: "responsive", onChange: isAdminActor ? model.handleAdminAuthorsChange : undefined };
        break;
      case "reviewerIds":
        props = { ...props, mode: "multiple", options: model.reviewerOptions, loading: model.isLoadingReviewers,
          filterOption: personOptionFilter, maxTagCount: "responsive", disabled: model.reviewerStepOff };
        break;
      case "archiveFacultyId":
        props = { ...props, options: model.facultySelectOptions.filter(option => option.value === model.auth.user.facultyId || isAdminActor),
          loading: model.isLoadingArchiveFaculties, disabled: !model.canChangeSubmissionPeriod,
          onChange: isAdminActor ? model.handleAdminFacultyChange : undefined };
        break;
      case "archiveSemesterId":
        props = { ...props, options: model.archiveSemesters, loading: model.isLoadingArchiveSemesters,
          disabled: !model.archiveFacultyId || !model.canChangeSubmissionPeriod, onChange: model.handleArchiveSemesterChange };
        break;
      case "submissionPeriodId":
        props = { ...props, options: model.archivePeriods.map(period => {
          const label = period.closesAt ? t("{{name}} (closes {{date}})", { name: period.name, date: formatDate(period.closesAt, model.lang) }) : period.name;
          return { value: period.id, label: isAdminActor && period.isOpen === false ? `${label} — ${t("closed / hidden")}` : label };
        }),
          loading: model.isLoadingArchivePeriods, disabled: !model.archiveSemesterId || !model.canChangeSubmissionPeriod,
          onChange: model.handleSubmissionPeriodChange };
        break;
    }
    control = <Select {...props} disabled={isFormReadOnly || props.disabled} />;
  }
  const effectiveField = field.fieldKey === "reviewerIds" && model.reviewerStepOff ? { ...field, required: false } : field;
  return <><Form.Item name={field.fieldKey} label={label} extra={field.helpText ? t(field.helpText) : undefined}
    rules={configuredFieldRules(effectiveField, t)} preserve>
    {control}
  </Form.Item>
    {field.fieldKey === "archiveFacultyId" && model.isOtherFaculty && <Form.Item
      name="facultyOtherName" label={t("Faculty name")}
      extra={t("Not linked to a DSpace collection: choose the collection manually when pushing to DSpace.")}
      rules={[{ required: true, whitespace: true, message: t("Please enter the faculty name") }]}>
      <Input placeholder={t("Enter the faculty name")} />
    </Form.Item>}
  </>;
}
