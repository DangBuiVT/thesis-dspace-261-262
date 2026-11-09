import { requestDspaceNodes } from "../api.js";
import { message } from "antd";
import { useMemo, useCallback } from "react";
import { buildDspaceTreeData } from "../components/DspaceTree.jsx";
import {
  authHeaders,
  parseTextResponse as parseResponse,
} from "../../../shared/api/http.js";
export function useDspaceTree({
  dspaceSyncNodes,
  t,
  targetCollectionId,
  setDspaceSyncNodes,
  setDspaceTreeExpandedKeys,
  setLoadingDspaceTree,
  auth,
}) {
  const openDspaceCollection = (node) => {
    const key = node?.key != null ? String(node.key) : "";
    const synced = dspaceSyncNodes.find((item) => item.dspaceId === key);
    const type = node?.nodeType || synced?.type;
    if (type !== "collection") {
      return;
    }
    const url = node?.browseUrl || synced?.browseUrl || "";
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    message.warning(t("DSpace address is not configured"));
  };

  const dspaceTreeData = useMemo(
    () => buildDspaceTreeData(dspaceSyncNodes, { t }),
    [dspaceSyncNodes, t],
  );

  const pushCollectionTreeData = useMemo(
    () =>
      buildDspaceTreeData(dspaceSyncNodes, {
        selectableCollectionsOnly: true,
        hideId: true,
        t,
      }),
    [dspaceSyncNodes, t],
  );

  const selectedPushCollection = dspaceSyncNodes.find(
    (node) =>
      node.type === "collection" && node.dspaceId === targetCollectionId,
  );

  const applyDspaceNodes = useCallback((nodes) => {
    const list = Array.isArray(nodes) ? nodes : [];
    setDspaceSyncNodes(list);
    const tree = buildDspaceTreeData(list);
    // Expand first two levels by default for readability
    const topKeys = tree.map((n) => n.key);
    const secondLevel = tree.flatMap((n) =>
      (n.children || []).map((c) => c.key),
    );
    setDspaceTreeExpandedKeys([...topKeys, ...secondLevel].map(String));
  }, []);

  const loadDspaceSyncNodes = useCallback(async () => {
    setLoadingDspaceTree(true);
    try {
      const response = await requestDspaceNodes({
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load DSpace sync tree");
      }
      applyDspaceNodes(payload);
    } catch (error) {
      // Tree is optional until first sync succeeds
      console.warn(error);
    } finally {
      setLoadingDspaceTree(false);
    }
  }, [auth.token, applyDspaceNodes]);
  return {
    openDspaceCollection,
    dspaceTreeData,
    pushCollectionTreeData,
    selectedPushCollection,
    applyDspaceNodes,
    loadDspaceSyncNodes,
  };
}
