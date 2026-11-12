import { Modal, Form, Input, Select, DatePicker } from "antd";
import { useArchive } from "../ArchiveContext";
export default function ArchiveEditDialog() {
  const {
    editKind,
    setEditKind,
    setEditRecord,
    editForm,
    saving,
    submitEdit,
    t,
  } = useArchive();
  return (
    <Modal
      title={
        editKind === "faculty"
          ? "Edit faculty"
          : editKind === "semester"
            ? "Edit semester"
            : editKind === "period"
              ? "Edit submission period"
              : "Edit"
      }
      open={Boolean(editKind)}
      onCancel={() => {
        setEditKind(null);
        setEditRecord(null);
        editForm.resetFields();
      }}
      onOk={() => editForm.submit()}
      confirmLoading={saving}
      destroyOnClose
    >
      <Form form={editForm} layout="vertical" onFinish={submitEdit}>
        {editKind === "faculty" && (
          <>
            <Form.Item
              name="name"
              label={t("Faculty name")}
              rules={[{ required: true, min: 2 }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="status"
              label={t("Status")}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: "active", label: t("active") },
                  { value: "inactive", label: t("inactive") },
                ]}
              />
            </Form.Item>
          </>
        )}
        {editKind === "semester" && (
          <>
            <Form.Item
              name="name"
              label={t("Display name")}
              rules={[{ required: true, min: 2 }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="status"
              label={t("Status")}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: "active", label: t("active") },
                  { value: "inactive", label: t("inactive") },
                ]}
              />
            </Form.Item>
          </>
        )}
        {editKind === "period" && (
          <>
            <Form.Item
              name="name"
              label={t("Period name")}
              rules={[{ required: true, min: 3 }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="range"
              label={t("Open — close")}
              rules={[{ required: true }]}
            >
              <DatePicker.RangePicker showTime style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="allowResubmit"
              label={t("Allow resubmit on reject")}
            >
              <Select
                options={[
                  { value: true, label: t("Yes") },
                  { value: false, label: t("No") },
                ]}
              />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
