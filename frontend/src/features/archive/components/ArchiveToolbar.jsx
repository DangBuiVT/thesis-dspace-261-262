import { Space, Typography, Button } from "antd";
const { Text } = Typography;
import { useArchive } from "../ArchiveContext";
export default function ArchiveToolbar() {
  const {
    allowEdit,
    t,
    loadFaculties,
    expandedFacultyKeys,
    loadFacultyTree,
    loadingFaculties,
    syncingDspace,
    syncFromDspaceRoot,
    canManageFaculties,
    setFacultyModalOpen,
  } = useArchive();
  return (
    <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
      <Text type="secondary">
        {allowEdit
          ? t("Config submission period under existing faculty / semester")
          : t("Read-only view")}
      </Text>
      <Space wrap>
        <Button
          onClick={() => {
            void (async () => {
              await loadFaculties();
              await Promise.all(
                expandedFacultyKeys.map((facultyId) =>
                  loadFacultyTree(facultyId),
                ),
              );
            })();
          }}
          loading={loadingFaculties}
        >
          {t("Refresh")}
        </Button>
        {allowEdit && (
          <Button
            loading={syncingDspace}
            onClick={() => void syncFromDspaceRoot()}
          >
            {t("Sync from DSpace")}
          </Button>
        )}
        {canManageFaculties && (
          <Button
            type="primary"
            onClick={() => {
              setFacultyModalOpen(true);
            }}
          >
            {t("Add faculty")}
          </Button>
        )}
      </Space>
    </Space>
  );
}
