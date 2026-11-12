import { Modal, Form, Input } from "antd";
import { useArchive } from "../ArchiveContext";
export default function FacultyDialog() {
  const {
    t,
    facultyModalOpen,
    setFacultyModalOpen,
    facultyForm,
    saving,
    submitFaculty,
  } = useArchive();
  return (
    <Modal
      title={t("Add faculty")}
      open={facultyModalOpen}
      onCancel={() => {
        setFacultyModalOpen(false);
        facultyForm.resetFields();
      }}
      onOk={() => facultyForm.submit()}
      confirmLoading={saving}
      destroyOnClose
    >
      <Form form={facultyForm} layout="vertical" onFinish={submitFaculty}>
        <Form.Item
          name="name"
          label={t("Faculty name")}
          rules={[{ required: true, min: 2 }]}
        >
          <Input placeholder={t("e.g. Faculty of Mechanical Engineering")} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
