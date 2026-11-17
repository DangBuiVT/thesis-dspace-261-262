import { Modal, Space, Typography, Alert, Button, Tree } from "antd";
import { collectExpandableKeys, buildDspaceTreeData } from "./DspaceTree.jsx";
const { Text } = Typography;
import { useArchive } from "../ArchiveContext";
export default function DspaceSyncDialog() {
  const {
    t,
    syncResult,
    setSyncResult,
    setDspaceTreeExpandedKeys,
    dspaceTreeExpandedKeys,
    openDspaceCollection,
  } = useArchive();
  return (
    <Modal
      title={t("DSpace sync result")}
      open={Boolean(syncResult)}
      onCancel={() => setSyncResult(null)}
      onOk={() => setSyncResult(null)}
      width={900}
      destroyOnClose
    >
      {syncResult ? (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Text>
            {t("Sync scope:")}{" "}
            {syncResult.rootCommunityId ? (
              <>
                {t("configured root")}{" "}
                <Text code>{syncResult.rootCommunityId}</Text>
              </>
            ) : (
              <Text>{t("all top-level communities")}</Text>
            )}
          </Text>
          <Alert
            type="success"
            showIcon
            message={t(
              "Indexed {{total}} nodes ({{communities}} communities, {{collections}} collections)",
              {
                total: syncResult.stats?.total ?? syncResult.nodes?.length ?? 0,
                communities: syncResult.stats?.communities ?? 0,
                collections: syncResult.stats?.collections ?? 0,
              },
            )}
            description={t(
              "Portal faculty / semester / period structure is unchanged. Expand or collapse the DSpace tree below.",
            )}
          />
          <Space wrap>
            <Button
              size="small"
              onClick={() =>
                setDspaceTreeExpandedKeys(
                  collectExpandableKeys(
                    buildDspaceTreeData(syncResult.nodes || []),
                  ),
                )
              }
            >
              {t("Expand all")}
            </Button>
            <Button size="small" onClick={() => setDspaceTreeExpandedKeys([])}>
              {t("Collapse all")}
            </Button>
          </Space>
          <Tree
            showLine
            treeData={buildDspaceTreeData(syncResult.nodes || [], { t })}
            expandedKeys={dspaceTreeExpandedKeys}
            onExpand={(keys) => setDspaceTreeExpandedKeys(keys.map(String))}
            onSelect={(_keys, info) => openDspaceCollection(info?.node)}
            style={{ maxHeight: 420, overflow: "auto" }}
          />
        </Space>
      ) : null}
    </Modal>
  );
}
