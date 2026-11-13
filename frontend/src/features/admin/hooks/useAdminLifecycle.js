import { useEffect } from "react";
export function useAdminLifecycle({
  formFieldsOnly,
  loadFormFields,
  emailOnly,
  activeTab,
  loadSettings,
  loadUsers,
  loadFaculties,
  loadRoles,
  loadWorkflow,
  loadGroups,
}) {
  useEffect(() => {
    if (formFieldsOnly) {
      void loadFormFields();
      return;
    }
    if (
      emailOnly ||
      activeTab === "settings" ||
      activeTab === "email" ||
      activeTab === "signature"
    ) {
      void loadSettings();
      return;
    }
    if (activeTab === "users") {
      void loadUsers();
      void loadFaculties();
    } else if (activeTab === "roles") {
      void loadRoles();
    } else if (activeTab === "form-fields") {
      void loadFormFields();
    } else if (activeTab === "workflow") {
      void loadWorkflow();
    } else if (activeTab === "groups") {
      void loadUsers();
      void loadGroups();
    }
  }, [
    activeTab,
    emailOnly,
    formFieldsOnly,
    loadUsers,
    loadFaculties,
    loadRoles,
    loadSettings,
    loadFormFields,
    loadWorkflow,
    loadGroups,
  ]);
  return {};
}
