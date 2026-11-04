import { Modal, Form, Checkbox, Typography, Select, Input } from "antd";
const { Paragraph } = Typography;
import { useArchive } from "../ArchiveContext";
export default function SemesterDialog() {
  const {
    t,
    semesterModalOpen,
    setSemesterModalOpen,
    semesterForm,
    saving,
    submitSemester,
    loadingFaculties,
    faculties,
  } = useArchive();
  return (
    <Modal
      title={t("Create semester")}
      open={semesterModalOpen}
      onCancel={() => {
        setSemesterModalOpen(false);
        semesterForm.resetFields();
      }}
      onOk={() => semesterForm.submit()}
      confirmLoading={saving}
      destroyOnClose
    >
      <Form
        form={semesterForm}
        layout="vertical"
        onFinish={submitSemester}
        initialValues={{ forAllFaculties: false }}
      >
        <Form.Item
          name="forAllFaculties"
          valuePropName="checked"
          style={{ marginBottom: 12 }}
        >
          <Checkbox
            onChange={(event) => {
              if (event.target.checked) {
                semesterForm.setFieldValue("facultyId", undefined);
              }
            }}
          >
            {t("Create semester for all faculties")}
          </Checkbox>
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, current) =>
            prev.forAllFaculties !== current.forAllFaculties
          }
        >
          {({ getFieldValue }) =>
            getFieldValue("forAllFaculties") ? (
              <Paragraph type="secondary" style={{ marginTop: 0 }}>
                {t("The same semester is created for every active faculty.")}
              </Paragraph>
            ) : (
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
                  options={faculties.map((faculty) => ({
                    value: faculty.id,
                    label: faculty.name,
                  }))}
                />
              </Form.Item>
            )
          }
        </Form.Item>
        <Form.Item
          name="name"
          label={t("Semester name")}
          rules={[{ required: true, min: 2 }]}
        >
          <Input placeholder={t("e.g. Semester 1, 2025")} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
