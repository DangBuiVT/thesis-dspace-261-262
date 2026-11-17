import { requestDspaceSync } from "../api.js";
import {
  authHeaders,
  parseTextResponse as parseResponse,
} from "../../../shared/api/http.js";
import { message } from "antd";
export function useDspaceSync({
  setSyncingDspace,
  auth,
  setSyncResult,
  applyDspaceNodes,
  t,
  loadFaculties,
  expandedFacultyKeys,
  loadFacultyTree,
  tr,
}) {
  const syncFromDspaceRoot = async () => {
    setSyncingDspace(true);
    try {
      const response = await requestDspaceSync({
        method: "POST",
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "DSpace sync failed");
      }
      setSyncResult(payload);
      applyDspaceNodes(payload.nodes || []);
      const total = payload.stats?.total ?? payload.nodes?.length ?? 0;
      const communities = payload.stats?.communities ?? 0;
      const collections = payload.stats?.collections ?? 0;
      message.success(
        t(
          "Synced {{total}} DSpace nodes ({{communities}} communities, {{collections}} collections)",
          {
            total,
            communities,
            collections,
          },
        ),
      );
      await loadFaculties();
      await Promise.all(
        expandedFacultyKeys.map((facultyId) => loadFacultyTree(facultyId)),
      );
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setSyncingDspace(false);
    }
  };
  return { syncFromDspaceRoot };
}
