import { Typography, Space, Button, Table, Switch, Tag } from "antd";
import { fieldDisplayLabel, inputTypeText } from "../../../i18n/labels";
const { Paragraph, Text } = Typography;
import { useAdmin } from "../AdminContext";
export default function FormFieldsPanel() {
  const {
    t,
    openCreateFormField,
    loadFormFields,
    loadingFormFields,
    formFields,
    toggleFormFieldFlag,
    openEditFormField,
    deleteFormField,
  } = useAdmin();
  return (
    <>
      <Paragraph type="secondary">
        {t(
          "Configure every field on the student form. Turn a field off to hide it, or change its input type. Disabled fields are not required when submitting.",
        )}
      </Paragraph>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button type="primary" onClick={openCreateFormField}>
          {t("Add field")}
        </Button>
        <Button
          onClick={() => void loadFormFields()}
          loading={loadingFormFields}
        >
          {t("Refresh")}
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loadingFormFields}
        dataSource={formFields}
        pagination={false}
        scroll={{ x: 1280 }}
        columns={[
          {
            title: t("Label"),
            dataIndex: "label",
            width: 160,
            render: (_value, row) => fieldDisplayLabel(row, t),
          },
          {
            title: t("Key"),
            dataIndex: "fieldKey",
            width: 140,
            render: (v) => <Text code>{v}</Text>,
          },
          {
            title: t("DSpace path"),
            dataIndex: "dspacePath",
            width: 200,
            render: (v) => (v ? <Text code>{v}</Text> : "—"),
          },
          {
            title: t("Type"),
            dataIndex: "inputType",
            width: 100,
            render: (value) => inputTypeText(value, t),
          },
          {
            title: t("Required"),
            dataIndex: "required",
            width: 100,
            render: (v, row) => (
              <Switch
                checked={v}
                onChange={(checked) =>
                  void toggleFormFieldFlag(row, { required: checked })
                }
              />
            ),
          },
          {
            title: t("Enabled"),
            dataIndex: "enabled",
            width: 100,
            render: (v, row) => (
              <Switch
                checked={v}
                onChange={(checked) =>
                  void toggleFormFieldFlag(row, { enabled: checked })
                }
              />
            ),
          },
          {
            title: t("System"),
            dataIndex: "systemLocked",
            width: 90,
            render: (v, row) =>
              row.builtin || v ? (
                <Tag>{t("locked")}</Tag>
              ) : (
                <Tag color="blue">{t("custom")}</Tag>
              ),
          },
          {
            title: t("Actions"),
            width: 220,
            render: (_, row) => (
              <Space>
                <Button size="small" onClick={() => openEditFormField(row)}>
                  {t("Edit")}
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={() => deleteFormField(row)}
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
