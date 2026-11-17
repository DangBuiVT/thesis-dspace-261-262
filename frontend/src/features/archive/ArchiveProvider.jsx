import { useI18n } from "../../i18n/I18nProvider";
import { translateApiMessage } from "../../i18n/api";
import { ArchiveContext } from "./ArchiveContext";
import { useArchiveState } from "./hooks/useArchiveState.js";
import { useDspaceTree } from "./hooks/useDspaceTree.js";
import { useDspaceSettings } from "./hooks/useDspaceSettings.js";
import { useArchiveHierarchy } from "./hooks/useArchiveHierarchy.js";
import { useDspacePublishing } from "./hooks/useDspacePublishing.js";
import { useDspaceSync } from "./hooks/useDspaceSync.js";
import { useArchiveDetails } from "./hooks/useArchiveDetails.js";
import { useArchiveConfiguration } from "./hooks/useArchiveConfiguration.js";
import { useArchiveExpansion } from "./hooks/useArchiveExpansion.js";
import { useArchiveLifecycle } from "./hooks/useArchiveLifecycle.js";
export default function ArchiveProvider({ auth, mode, children }) {
  const { t, lang } = useI18n();
  const tr = (value) => translateApiMessage(value, t);
  const session = {
    t,
    lang,
    tr,
    auth,
    readOnly: mode === "browse",
    canManage: mode === "manage",
  };
  const state = useArchiveState(session);
  const stateModel = { ...session, ...state };
  const tree = useDspaceTree(stateModel);
  const treeModel = { ...stateModel, ...tree };
  const settings = useDspaceSettings(treeModel);
  const settingsModel = { ...treeModel, ...settings };
  const hierarchy = useArchiveHierarchy(settingsModel);
  const hierarchyModel = { ...settingsModel, ...hierarchy };
  const publishing = useDspacePublishing(hierarchyModel);
  const publishingModel = { ...hierarchyModel, ...publishing };
  const sync = useDspaceSync(publishingModel);
  const syncModel = { ...publishingModel, ...sync };
  const details = useArchiveDetails(syncModel);
  const detailsModel = { ...syncModel, ...details };
  const configuration = useArchiveConfiguration(detailsModel);
  const configurationModel = { ...detailsModel, ...configuration };
  const expansion = useArchiveExpansion(configurationModel);
  const archiveModel = { ...configurationModel, ...expansion };
  useArchiveLifecycle(archiveModel);
  return (
    <ArchiveContext.Provider value={archiveModel}>
      {children}
    </ArchiveContext.Provider>
  );
}
