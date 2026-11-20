import { Typography, Space, Button, Table, Select, Tag } from "antd";
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
          "Choose mandatory, optional, or hidden for each question. Student labels and submission validation follow this setting.",
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
            title: t("Question mode"),
            width: 160,
            render: (_, row) => <Select aria-label={t("Question mode for {{label}}", { label: fieldDisplayLabel(row, t) })}
              value={row.mode} style={{ width: 145 }}
              options={["mandatory", "optional", "hidden"].map(value => ({ value, label: t(value) }))}
              onChange={mode => void toggleFormFieldFlag(row, { mode })} />,
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
                  disabled={Boolean(row.questionNumber)}
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
