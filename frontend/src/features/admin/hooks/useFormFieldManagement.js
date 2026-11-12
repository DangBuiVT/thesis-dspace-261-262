import { requestFormField, requestFormFields } from "../api.js";
import {
  authHeaders,
  parseTextResponse as parseResponse,
} from "../../../shared/api/http.js";
import { message, Modal } from "antd";
export function useFormFieldManagement({
  setEditingFormField,
  formFieldForm,
  setFormFieldModalOpen,
  setSavingFormField,
  editingFormField,
  auth,
  t,
  loadFormFields,
  tr,
}) {
  const openCreateFormField = () => {
    setEditingFormField(null);
    formFieldForm.resetFields();
    formFieldForm.setFieldsValue({
      inputType: "text",
      required: false,
      enabled: true,
      storage: "extra",
      dspacePath: "",
      defaultValue: "",
      optionsText: "",
    });
    setFormFieldModalOpen(true);
  };

  const openEditFormField = (record) => {
    setEditingFormField(record);
    formFieldForm.setFieldsValue({
      fieldKey: record.fieldKey,
      label: record.label,
      dspacePath: record.dspacePath,
      inputType: record.inputType,
      required: record.required,
      enabled: record.enabled,
      sortOrder: record.sortOrder,
      defaultValue: record.defaultValue,
      optionsText: (record.options || [])
        .map((o) => `${o.value}|${o.label}`)
        .join("\n"),
    });
    setFormFieldModalOpen(true);
  };

  const parseOptionsText = (text) => {
    if (!text?.trim()) {
      return [];
    }
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [value, ...rest] = line.split("|");
        const label = rest.join("|").trim() || value.trim();
        return { value: value.trim(), label };
      });
  };

  const saveFormField = async (values) => {
    setSavingFormField(true);
    try {
      const options = parseOptionsText(values.optionsText);
      if (editingFormField) {
        const body = {
          label: values.label,
          dspacePath: values.dspacePath || "",
          inputType: values.inputType,
          required: Boolean(values.required),
          enabled: Boolean(values.enabled),
          sortOrder: Number(values.sortOrder) || 0,
          defaultValue: values.defaultValue || "",
          options,
        };
        if (!editingFormField.systemLocked && values.fieldKey) {
          body.fieldKey = values.fieldKey;
        }
        const response = await requestFormField(editingFormField.id, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(auth.token),
          },
          body: JSON.stringify(body),
        });
        const payload = await parseResponse(response);
        if (!response.ok) {
          throw new Error(payload?.message || "Unable to update field");
        }
        message.success(t("Field updated"));
      } else {
        const response = await requestFormFields({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(auth.token),
          },
          body: JSON.stringify({
            fieldKey: values.fieldKey,
            label: values.label,
            dspacePath: values.dspacePath || "",
            inputType: values.inputType,
            required: Boolean(values.required),
            enabled: Boolean(values.enabled),
            defaultValue: values.defaultValue || "",
            storage: "extra",
            options,
          }),
        });
        const payload = await parseResponse(response);
        if (!response.ok) {
          throw new Error(payload?.message || "Unable to create field");
        }
        message.success(t("Field created"));
      }
      setFormFieldModalOpen(false);
      await loadFormFields();
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setSavingFormField(false);
    }
  };

  const toggleFormFieldFlag = async (record, patch) => {
    try {
      const response = await requestFormField(record.id, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify(patch),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to update field");
      }
      await loadFormFields();
    } catch (error) {
      message.error(tr(error.message));
    }
  };

  const deleteFormField = (record) => {
    Modal.confirm({
      title: t('Delete field "{{label}}"?', { label: record.label }),
      content: record.systemLocked
        ? t("System fields cannot be deleted.")
        : t("Custom field will be removed from the submission form."),
      okType: "danger",
      onOk: async () => {
        if (record.systemLocked) {
          return;
        }
        const response = await requestFormField(record.id, {
          method: "DELETE",
          headers: authHeaders(auth.token),
        });
        const payload = await parseResponse(response);
        if (!response.ok) {
          throw new Error(payload?.message || "Unable to delete field");
        }
        message.success(t("Field deleted"));
        await loadFormFields();
      },
    });
  };
  return {
    openCreateFormField,
    openEditFormField,
    parseOptionsText,
    saveFormField,
    toggleFormFieldFlag,
    deleteFormField,
  };
}
