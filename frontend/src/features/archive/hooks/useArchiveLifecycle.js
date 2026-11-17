import { useEffect } from "react";
export function useArchiveLifecycle({
  loadFaculties,
  loadDspaceSyncNodes,
  mainTab,
  allowEdit,
  loadPublishQueue,
  isAdmin,
  loadDspaceSettings,
}) {
  useEffect(() => {
    void loadFaculties();
    void loadDspaceSyncNodes();
  }, [loadFaculties, loadDspaceSyncNodes]);

  useEffect(() => {
    if (mainTab === "push-dspace" && allowEdit) {
      void loadPublishQueue();
    }
    if (mainTab === "dspace-settings" && isAdmin) {
      void loadDspaceSettings();
    }
  }, [mainTab, allowEdit, isAdmin, loadPublishQueue, loadDspaceSettings]);
  return {};
}
