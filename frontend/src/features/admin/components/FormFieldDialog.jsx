import { Modal, Form, Input, Select, Switch } from "antd";
import { useAdmin } from "../AdminContext";
export default function FormFieldDialog() {
  const {
    editingFormField,
    t,
    formFieldModalOpen,
    setFormFieldModalOpen,
    formFieldForm,
    savingFormField,
    saveFormField,
  } = useAdmin();
  return (
    <Modal
      title={
        editingFormField
          ? t("Edit field: {{key}}", { key: editingFormField.fieldKey })
          : t("Add submission field")
      }
      open={formFieldModalOpen}
      onCancel={() => setFormFieldModalOpen(false)}
      onOk={() => formFieldForm.submit()}
      confirmLoading={savingFormField}
      destroyOnClose
      width={560}
    >
      <Form form={formFieldForm} layout="vertical" onFinish={saveFormField}>
        <Form.Item
          name="fieldKey"
          label={t("Field key")}
          rules={[{ required: true, min: 2, message: t("Key is required") }]}
          extra={
            editingFormField?.systemLocked
              ? t("System field key cannot change")
              : t("e.g. keywords, degree")
          }
        >
          <Input
            disabled={Boolean(editingFormField?.systemLocked)}
            placeholder="myCustomField"
          />
        </Form.Item>
        <Form.Item
          name="label"
          label={t("Label")}
          rules={[{ required: true, message: t("Label is required") }]}
        >
          <Input placeholder={t("Keywords")} />
        </Form.Item>
        <Form.Item
          name="dspacePath"
          label={t("DSpace metadata path")}
          extra={t("e.g. dc.subject — leave empty to skip DSpace")}
        >
          <Input placeholder="dc.subject" />
        </Form.Item>
        <Form.Item
          name="inputType"
          label={t("Input type")}
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { value: "text", label: t("Text") },
              { value: "textarea", label: t("Textarea") },
              { value: "select", label: t("Select") },
              { value: "year", label: t("Year") },
              { value: "file", label: t("File") },
            ]}
          />
        </Form.Item>
        <Form.Item name="defaultValue" label={t("Default value")}>
          <Input />
        </Form.Item>
        <Form.Item
          name="optionsText"
          label={t("Select options")}
          extra={t("One per line: value|Label (only for select type)")}
        >
          <Input.TextArea
            rows={4}
            placeholder={"vie|Vietnamese\neng|English"}
          />
        </Form.Item>
        {editingFormField ? (
          <Form.Item name="sortOrder" label={t("Sort order")}>
            <Input type="number" />
          </Form.Item>
        ) : null}
        <Form.Item
          name="required"
          label={t("Required")}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item
          name="enabled"
          label={t("Enabled on form")}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
