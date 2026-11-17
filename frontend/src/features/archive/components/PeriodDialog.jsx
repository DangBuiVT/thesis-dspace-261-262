import {
  Modal,
  Typography,
  Form,
  Select,
  Input,
  DatePicker,
  Checkbox,
} from "antd";
import dayjs from "dayjs";
const { Paragraph } = Typography;
import { useArchive } from "../ArchiveContext";
export default function PeriodDialog() {
  const {
    t,
    periodModalOpen,
    setPeriodModalOpen,
    periodForm,
    saving,
    submitPeriod,
    loadingFaculties,
    faculties,
    onConfigFacultyChange,
    configFacultyId,
    loadingConfigSemesters,
    configSemesters,
  } = useArchive();
  return (
    <Modal
      title={t("Create period")}
      open={periodModalOpen}
      onCancel={() => {
        setPeriodModalOpen(false);
        periodForm.resetFields();
      }}
      onOk={() => periodForm.submit()}
      confirmLoading={saving}
      okText={t("Create period")}
      width={640}
      destroyOnClose
    >
      <Paragraph type="secondary">
        {t(
          "A faculty has many semesters; a semester can have several open periods. A DSpace collection is created under the configured root community when one is set.",
        )}
      </Paragraph>
      <Form
        form={periodForm}
        layout="vertical"
        onFinish={submitPeriod}
        initialValues={{
          allowResubmit: true,
          openAfterCreate: false,
          range: [dayjs().startOf("day"), dayjs().add(90, "day").endOf("day")],
        }}
      >
        <Form.Item
          name="facultyId"
          label={t("Faculty")}
          rules={[{ required: true, message: t("Select a faculty") }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t("Select a faculty")}
            loading={loadingFaculties}
            options={faculties.map((f) => ({
              value: f.id,
              label: f.name,
            }))}
            onChange={onConfigFacultyChange}
          />
        </Form.Item>
        <Form.Item
          name="semesterId"
          label={t("Semester")}
          rules={[{ required: true, message: t("Select a semester") }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={
              configFacultyId
                ? t("Select a semester")
                : t("Select a faculty first.")
            }
            loading={loadingConfigSemesters}
            disabled={!configFacultyId}
            options={configSemesters.map((s) => ({
              value: s.id,
              label: s.name,
            }))}
            notFoundContent={
              loadingConfigSemesters
                ? t("Loading…")
                : t("No semesters for this faculty")
            }
          />
        </Form.Item>
        <Form.Item
          name="name"
          label={t("Period name")}
          rules={[
            {
              required: true,
              min: 3,
              message: t("Enter a period name (at least 3 characters)"),
            },
          ]}
        >
          <Input placeholder={t("e.g. Deposit period HK1/2025")} />
        </Form.Item>
        <Form.Item
          name="range"
          label={t("Submission window (open — close)")}
          rules={[
            { required: true, message: t("Choose the submission window") },
          ]}
        >
          <DatePicker.RangePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="allowResubmit" label={t("Allow resubmit on reject")}>
          <Select
            options={[
              { value: true, label: t("Yes") },
              { value: false, label: t("No") },
            ]}
          />
        </Form.Item>
        <Form.Item name="openAfterCreate" valuePropName="checked">
          <Checkbox>{t("Open period immediately after creating")}</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
