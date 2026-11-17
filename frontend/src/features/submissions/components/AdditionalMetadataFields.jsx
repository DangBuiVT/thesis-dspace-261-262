import { Form, Input, Select } from "antd";
import { fieldDisplayLabel, optionDisplayLabel } from "../../../i18n/labels.js";

import { THESIS_YEAR_OPTIONS } from "../model/formConfig.js";

import { useSubmissions } from "../SubmissionContext.jsx";

const { TextArea } = Input;
export default function AdditionalMetadataFields() {
  const { t, configurableFormFields } = useSubmissions();
  return configurableFormFields.map((field) => {
    const label = fieldDisplayLabel(field, t);
    const rules = field.required
      ? [
          {
            required: true,
            message: t("{{label}} is required", { label }),
          },
        ]
      : [];
    let control;
    if (field.inputType === "textarea") {
      control = <TextArea rows={field.fieldKey === "abstract" ? 5 : 3} />;
    } else if (field.inputType === "select" || field.inputType === "year") {
      control = (
        <Select
          options={
            field.inputType === "year"
              ? THESIS_YEAR_OPTIONS
              : (field.options || []).map((o) => ({
                  value: o.value,
                  label: optionDisplayLabel(o, t),
                }))
          }
          placeholder={label}
        />
      );
    } else {
      control = <Input placeholder={field.defaultValue || label} />;
    }
    return (
      <Form.Item
        key={field.id || field.fieldKey}
        label={label}
        name={field.fieldKey}
        rules={rules}
      >
        {control}
      </Form.Item>
    );
  });
}
