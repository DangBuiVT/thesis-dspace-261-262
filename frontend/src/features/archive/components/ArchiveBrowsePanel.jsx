import { Space, Typography, Tag, Button, Alert, Tree } from "antd";
import { collectExpandableKeys } from "./DspaceTree.jsx";
import { ArchiveTreeRow } from "./ArchiveTreeRow.jsx";
import {
  BankOutlined,
  ReadOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { statusText, countPhrase } from "../../../i18n/labels";
import { periodStatusColor, formatTreeDate } from "../model/dates.js";
const { Text } = Typography;
import { useArchive } from "../ArchiveContext";
export default function ArchiveBrowsePanel() {
  const {
    t,
    dspaceSyncNodes,
    loadingDspaceTree,
    loadDspaceSyncNodes,
    dspaceTreeData,
    setDspaceTreeExpandedKeys,
    dspaceTreeExpandedKeys,
    openDspaceCollection,
    allowEdit,
    openCreateSemesterModal,
    openCreatePeriodModal,
    faculties,
    setExpandedFacultyKeys,
    loadFacultyTree,
    expandedFacultyKeys,
    loadingFaculties,
    facultyTree,
    expandedSemesterKeys,
    toggleFaculty,
    openDetail,
    toggleSemester,
    actionId,
    periodAction,
  } = useArchive();
  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <div
        style={{
          border: "1px solid #f0f0f0",
          borderRadius: 8,
          padding: 12,
          background: "#fafafa",
        }}
      >
        <Space
          style={{
            width: "100%",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
          wrap
        >
          <Space wrap>
            <Text strong>{t("DSpace structure")}</Text>
            <Tag>{dspaceSyncNodes.length} nodes</Tag>
            <Tag color="geekblue">
              {dspaceSyncNodes.filter((n) => n.type === "community").length}{" "}
              communities
            </Tag>
            <Tag color="blue">
              {dspaceSyncNodes.filter((n) => n.type === "collection").length}{" "}
              collections
            </Tag>
          </Space>
          <Space wrap>
            <Button
              size="small"
              loading={loadingDspaceTree}
              onClick={() => void loadDspaceSyncNodes()}
            >
              {t("Reload tree")}
            </Button>
            <Button
              size="small"
              disabled={dspaceTreeData.length === 0}
              onClick={() =>
                setDspaceTreeExpandedKeys(collectExpandableKeys(dspaceTreeData))
              }
            >
              {t("Expand all")}
            </Button>
            <Button
              size="small"
              disabled={dspaceTreeExpandedKeys.length === 0}
              onClick={() => setDspaceTreeExpandedKeys([])}
            >
              {t("Collapse all")}
            </Button>
          </Space>
        </Space>
        {dspaceTreeData.length === 0 ? (
          <Alert
            type="info"
            showIcon
            message={t("No synced DSpace communities/collections yet")}
            description='Click "Sync from DSpace" to fetch the live tree, then expand/collapse nodes here.'
          />
        ) : (
          <Tree
            showLine
            showIcon={false}
            treeData={dspaceTreeData}
            expandedKeys={dspaceTreeExpandedKeys}
            onExpand={(keys) => setDspaceTreeExpandedKeys(keys.map(String))}
            onSelect={(_keys, info) => openDspaceCollection(info?.node)}
            style={{
              background: "#fff",
              padding: 8,
              borderRadius: 6,
              maxHeight: 360,
              overflow: "auto",
            }}
          />
        )}
      </div>
      <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
        <Space wrap>
          {allowEdit && (
            <Button type="primary" onClick={openCreateSemesterModal}>
              {t("Create semester")}
            </Button>
          )}
          {allowEdit && (
            <Button onClick={openCreatePeriodModal}>
              {t("Create period")}
            </Button>
          )}
        </Space>
        <Space wrap>
          <Button
            size="small"
            disabled={faculties.length === 0}
            onClick={() => {
              const ids = faculties.map((faculty) => faculty.id);
              setExpandedFacultyKeys(ids);
              void Promise.all(
                ids.map((facultyId) => loadFacultyTree(facultyId)),
              );
            }}
          >
            {t("Expand all")}
          </Button>
          <Button
            size="small"
            disabled={expandedFacultyKeys.length === 0}
            onClick={() => setExpandedFacultyKeys([])}
          >
            {t("Collapse all")}
          </Button>
        </Space>
      </Space>
      <style>{`
                  .archive-tree-row:hover { background: #f4f9fd; }
                `}</style>
      {loadingFaculties && faculties.length === 0 ? (
        <Text type="secondary">{t("Loading faculties…")}</Text>
      ) : faculties.length === 0 ? (
        <Text type="secondary">{t("No faculties")}</Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {faculties.map((faculty) => {
            const facultyOpen = expandedFacultyKeys.includes(faculty.id);
            const node = facultyTree[faculty.id];
            const semesterRows = node?.semesters || [];
            const periodRows = node?.periods || [];
            const openSemesterKeys = expandedSemesterKeys[faculty.id] || [];
            return (
              <div
                key={faculty.id}
                style={{
                  border: "1px solid #e3ebf5",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#fff",
                  boxShadow: "0 1px 2px rgba(19, 45, 101, 0.05)",
                }}
              >
                <ArchiveTreeRow
                  depth={0}
                  expanded={facultyOpen}
                  expandable
                  onToggle={() => toggleFaculty(faculty.id)}
                  icon={<BankOutlined />}
                  title={faculty.name}
                  extra={
                    <>
                      <Tag
                        color={
                          faculty.status === "active" ? "green" : "default"
                        }
                      >
                        {statusText(faculty.status, t)}
                      </Tag>
                      <Text type="secondary">
                        {countPhrase(
                          faculty.semesterCount,
                          "{{count}} semester",
                          "{{count}} semesters",
                          t,
                        )}
                      </Text>
                      <Text type="secondary">
                        {countPhrase(
                          faculty.openPeriodCount,
                          "{{count}} open period",
                          "{{count}} open periods",
                          t,
                        )}
                      </Text>
                    </>
                  }
                  actions={
                    <Button
                      size="small"
                      onClick={() => void openDetail("faculty", faculty.id)}
                    >
                      {t("Detail")}
                    </Button>
                  }
                />
                {facultyOpen ? (
                  <div
                    style={{
                      borderTop: "1px solid #e8eef6",
                      background: "#f8fbfe",
                    }}
                  >
                    {node?.loading && semesterRows.length === 0 ? (
                      <div style={{ padding: "12px 16px 12px 52px" }}>
                        <Text type="secondary">{t("Loading semesters…")}</Text>
                      </div>
                    ) : semesterRows.length === 0 ? (
                      <div style={{ padding: "12px 16px 12px 52px" }}>
                        <Text type="secondary">{t("No semesters")}</Text>
                      </div>
                    ) : (
                      semesterRows.map((semester) => {
                        const semesterOpen = openSemesterKeys.includes(
                          semester.id,
                        );
                        const semesterPeriods = periodRows.filter(
                          (period) => period.semesterId === semester.id,
                        );
                        return (
                          <div
                            key={semester.id}
                            style={{ borderTop: "1px solid #eef3f8" }}
                          >
                            <ArchiveTreeRow
                              depth={1}
                              expanded={semesterOpen}
                              expandable
                              onToggle={() =>
                                toggleSemester(faculty.id, semester.id)
                              }
                              icon={<ReadOutlined />}
                              title={semester.name}
                              extra={
                                <>
                                  <Tag
                                    color={
                                      semester.status === "active"
                                        ? "green"
                                        : "default"
                                    }
                                  >
                                    {semester.status
                                      ? statusText(semester.status, t)
                                      : "—"}
                                  </Tag>
                                  <Text type="secondary">
                                    {countPhrase(
                                      semester.periodCount,
                                      "{{count}} period",
                                      "{{count}} periods",
                                      t,
                                    )}
                                  </Text>
                                </>
                              }
                              actions={
                                <Button
                                  size="small"
                                  onClick={() =>
                                    void openDetail("semester", semester.id)
                                  }
                                >
                                  {t("Detail")}
                                </Button>
                              }
                            />
                            {semesterOpen ? (
                              <div
                                style={{
                                  margin: "0 12px 10px 46px",
                                  borderLeft: "2px solid #d5e4f4",
                                  background: "#fff",
                                  borderRadius: "0 8px 8px 0",
                                }}
                              >
                                {semesterPeriods.length === 0 ? (
                                  <div style={{ padding: "10px 14px" }}>
                                    <Text type="secondary">
                                      {t("No periods")}
                                    </Text>
                                  </div>
                                ) : (
                                  semesterPeriods.map((period, index) => (
                                    <ArchiveTreeRow
                                      key={period.id}
                                      depth={2}
                                      stacked
                                      expandable={false}
                                      style={
                                        index > 0
                                          ? { borderTop: "1px solid #f0f4f8" }
                                          : undefined
                                      }
                                      icon={<CalendarOutlined />}
                                      title={period.name}
                                      extra={
                                        <>
                                          <Tag
                                            color={periodStatusColor(
                                              period.status,
                                            )}
                                          >
                                            {statusText(period.status, t)}
                                          </Tag>
                                          <Text type="secondary">
                                            {formatTreeDate(period.opensAt)} –{" "}
                                            {formatTreeDate(period.closesAt)}
                                          </Text>
                                          <Text type="secondary">
                                            {countPhrase(
                                              period.submissionCount,
                                              "{{count}} submission",
                                              "{{count}} submissions",
                                              t,
                                            )}
                                          </Text>
                                          {period.allowResubmit ? (
                                            <Tag>{t("Resubmit")}</Tag>
                                          ) : null}
                                        </>
                                      }
                                      actions={
                                        <Space size={6}>
                                          <Button
                                            size="small"
                                            onClick={() =>
                                              void openDetail(
                                                "period",
                                                period.id,
                                              )
                                            }
                                          >
                                            {t("Detail")}
                                          </Button>
                                          {allowEdit &&
                                          period.status !== "open" &&
                                          period.status !== "archived" ? (
                                            <Button
                                              size="small"
                                              type="primary"
                                              loading={
                                                actionId === `open-${period.id}`
                                              }
                                              onClick={() =>
                                                periodAction(
                                                  period.id,
                                                  "open",
                                                  period.facultyId,
                                                )
                                              }
                                            >
                                              {t("Open")}
                                            </Button>
                                          ) : null}
                                          {allowEdit &&
                                          period.status === "open" ? (
                                            <Button
                                              size="small"
                                              danger
                                              loading={
                                                actionId ===
                                                `close-${period.id}`
                                              }
                                              onClick={() =>
                                                periodAction(
                                                  period.id,
                                                  "close",
                                                  period.facultyId,
                                                )
                                              }
                                            >
                                              {t("Close")}
                                            </Button>
                                          ) : null}
                                        </Space>
                                      }
                                    />
                                  ))
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Space>
  );
}
