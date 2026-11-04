import {
  Space,
  Alert,
  Select,
  Button,
  Modal,
  Typography,
  Tree,
  Table,
  Tag,
} from "antd";
import { statusText } from "../../../i18n/labels";
import { dspaceIdText } from "./DspaceTree.jsx";
const { Text } = Typography;
import { useArchive } from "../ArchiveContext";
export default function DspacePublishPanel() {
  const {
    t,
    publishFilterFacultyId,
    faculties,
    onPublishFilterFacultyChange,
    publishFilterSemesterId,
    publishSemesters,
    onPublishFilterSemesterChange,
    publishFilterPeriodId,
    publishPeriods,
    setPublishFilterPeriodId,
    publishFilterStatus,
    setPublishFilterStatus,
    loadingPublishQueue,
    loadPublishQueue,
    selectedPublishIds,
    openPushCollectionModal,
    pushCollectionModalOpen,
    closePushCollectionModal,
    pushingDspace,
    targetCollectionId,
    pushSelectedToDspace,
    pushCollectionTreeData,
    dspaceSyncNodes,
    setTargetCollectionId,
    selectedPushCollection,
    publishQueue,
    setSelectedPublishIds,
  } = useArchive();
  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message={t(
          "Archived submissions stay in Portal periods until you push them",
        )}
        description={t(
          "Filter by faculty / semester / period / DSpace status, select submissions, then click Push selected to choose a DSpace collection.",
        )}
      />
      <Space wrap>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t("Filter faculty")}
          style={{ minWidth: 220 }}
          value={publishFilterFacultyId}
          options={faculties.map((f) => ({
            value: f.id,
            label: f.name,
          }))}
          onChange={(v) => void onPublishFilterFacultyChange(v)}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t("Filter semester")}
          style={{ minWidth: 200 }}
          value={publishFilterSemesterId}
          disabled={!publishFilterFacultyId}
          options={publishSemesters.map((s) => ({
            value: s.id,
            label: s.name,
          }))}
          onChange={onPublishFilterSemesterChange}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t("Filter period")}
          style={{ minWidth: 220 }}
          value={publishFilterPeriodId}
          disabled={!publishFilterSemesterId}
          options={publishPeriods
            .filter((period) => period.semesterId === publishFilterSemesterId)
            .map((period) => ({
              value: period.id,
              label: period.name,
            }))}
          onChange={(v) => setPublishFilterPeriodId(v || null)}
        />
        <Select
          placeholder={t("DSpace status")}
          style={{ minWidth: 160 }}
          value={publishFilterStatus}
          options={[
            { value: "pending", label: t("Pending (not published)") },
            { value: "published", label: t("Published") },
            { value: "failed", label: t("Failed") },
            { value: "", label: t("All") },
          ]}
          onChange={(v) => setPublishFilterStatus(v ?? "")}
        />
        <Button
          loading={loadingPublishQueue}
          onClick={() => void loadPublishQueue()}
        >
          {t("Apply filters")}
        </Button>
      </Space>
      <Button
        type="primary"
        disabled={selectedPublishIds.length === 0}
        onClick={openPushCollectionModal}
      >
        {t("Push selected ({{count}})", { count: selectedPublishIds.length })}
      </Button>
      <Modal
        title={t("Push to DSpace")}
        open={pushCollectionModalOpen}
        onCancel={closePushCollectionModal}
        destroyOnClose
        width={720}
        okText={t("Push")}
        confirmLoading={pushingDspace}
        okButtonProps={{ disabled: !targetCollectionId }}
        onOk={() => void pushSelectedToDspace()}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Text>
            {selectedPublishIds.length === 1
              ? t(
                  "{{count}} submission selected. Choose a collection in the DSpace tree.",
                  {
                    count: selectedPublishIds.length,
                  },
                )
              : t(
                  "{{count}} submissions selected. Choose a collection in the DSpace tree.",
                  {
                    count: selectedPublishIds.length,
                  },
                )}
          </Text>
          {pushCollectionTreeData.length === 0 ? (
            <Alert
              type="info"
              showIcon
              message={t("No DSpace tree yet")}
              description={t("Sync DSpace first to choose a collection.")}
            />
          ) : (
            <Tree
              showLine
              blockNode
              defaultExpandAll
              treeData={pushCollectionTreeData}
              selectedKeys={targetCollectionId ? [targetCollectionId] : []}
              onSelect={(keys) => {
                const id = keys[0] ? String(keys[0]) : null;
                const node = dspaceSyncNodes.find(
                  (item) => item.dspaceId === id,
                );
                setTargetCollectionId(node?.type === "collection" ? id : null);
              }}
              style={{
                background: "#fafafa",
                padding: 8,
                borderRadius: 6,
                border: "1px solid #f0f0f0",
                maxHeight: 420,
                overflow: "auto",
              }}
            />
          )}
          <Text type="secondary">
            {selectedPushCollection
              ? `Collection: ${selectedPushCollection.path || selectedPushCollection.name}`
              : "Chỉ chọn được collection. Community dùng để mở nhánh."}
          </Text>
        </Space>
      </Modal>
      <Table
        rowKey="id"
        size="small"
        loading={loadingPublishQueue}
        dataSource={publishQueue}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1100 }}
        rowSelection={{
          selectedRowKeys: selectedPublishIds,
          onChange: (keys) => setSelectedPublishIds(keys),
        }}
        columns={[
          { title: t("Title"), dataIndex: "title", ellipsis: true },
          {
            title: t("Status"),
            dataIndex: "status",
            width: 120,
            render: (status) => statusText(status, t),
          },
          {
            title: t("Author"),
            dataIndex: "author",
            width: 160,
            ellipsis: true,
          },
          {
            title: t("Faculty"),
            dataIndex: "facultyName",
            width: 180,
            ellipsis: true,
            render: (v) => v || "—",
          },
          {
            title: t("Semester"),
            width: 160,
            ellipsis: true,
            render: (_, row) => row.semesterName || "—",
          },
          {
            title: t("Period"),
            dataIndex: "periodName",
            width: 160,
            ellipsis: true,
            render: (v) => v || "—",
          },
          {
            title: t("DSpace status"),
            dataIndex: "dspacePublishStatus",
            width: 120,
            render: (s) => {
              if (s === "published") {
                return <Tag color="green">{t("Published")}</Tag>;
              }
              if (s === "failed") {
                return <Tag color="red">{t("Failed")}</Tag>;
              }
              return <Tag color="gold">{t("Pending")}</Tag>;
            },
          },
          {
            title: t("DSpace item"),
            dataIndex: "dspaceItemId",
            width: 260,
            render: (id) => dspaceIdText(id),
          },
        ]}
      />
    </Space>
  );
}
