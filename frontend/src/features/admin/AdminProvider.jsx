import { useI18n } from "../../i18n/I18nProvider";
import { translateApiMessage } from "../../i18n/api";
import { AdminContext } from "./AdminContext";
import { useAdminState } from "./hooks/useAdminState.js";
import { useAdminResources } from "./hooks/useAdminResources.js";
import { useUserImport } from "./hooks/useUserImport.js";
import { useUserManagement } from "./hooks/useUserManagement.jsx";
import { useRolePermissions } from "./hooks/useRolePermissions.js";
import { useAdminSettings } from "./hooks/useAdminSettings.js";
import { useFormFieldManagement } from "./hooks/useFormFieldManagement.js";
import { useWorkflowGroups } from "./hooks/useWorkflowGroups.js";
import { useAdminLifecycle } from "./hooks/useAdminLifecycle.js";
export default function AdminProvider({ auth, mode, children }) {
  const { t, lang } = useI18n();
  const tr = (value) => translateApiMessage(value, t);
  const session = {
    t,
    lang,
    tr,
    auth,
    formFieldsOnly: mode === "fields",
    emailOnly: mode === "email",
  };
  const state = useAdminState();
  const stateModel = { ...session, ...state };
  const resources = useAdminResources(stateModel);
  const resourcesModel = { ...stateModel, ...resources };
  const userImport = useUserImport(resourcesModel);
  const importModel = { ...resourcesModel, ...userImport };
  const userManagement = useUserManagement(importModel);
  const usersModel = { ...importModel, ...userManagement };
  const rolePermissions = useRolePermissions(usersModel);
  const rolesModel = { ...usersModel, ...rolePermissions };
  const settings = useAdminSettings(rolesModel);
  const settingsModel = { ...rolesModel, ...settings };
  const formFields = useFormFieldManagement(settingsModel);
  const fieldsModel = { ...settingsModel, ...formFields };
  const workflowGroups = useWorkflowGroups(fieldsModel);
  const adminModel = { ...fieldsModel, ...workflowGroups };
  useAdminLifecycle(adminModel);
  return (
    <AdminContext.Provider value={adminModel}>{children}</AdminContext.Provider>
  );
}
