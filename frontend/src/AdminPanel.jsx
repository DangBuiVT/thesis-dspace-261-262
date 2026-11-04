// Compatibility adapter for existing callers. New app code uses feature entry points.
import { AdminWorkspace } from "./features/admin";
import { ArchiveWorkspace } from "./features/archive";
export default function AdminPanel({
  auth,
  hideArchiveTab = false,
  hideEmailTab = false,
  hideFormFieldsTab = false,
  emailOnly = false,
  formFieldsOnly = false,
}) {
  const hiddenTabs = [
    hideArchiveTab && "archive",
    hideEmailTab && "email",
    hideFormFieldsTab && "form-fields",
  ].filter(Boolean);
  return (
    <AdminWorkspace
      auth={auth}
      mode={formFieldsOnly ? "fields" : emailOnly ? "email" : "administration"}
      hiddenTabs={hiddenTabs}
      archivePanel={<ArchiveWorkspace auth={auth} />}
    />
  );
}
