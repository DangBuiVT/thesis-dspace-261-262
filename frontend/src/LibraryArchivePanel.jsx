// Compatibility adapter for existing callers.
import { ArchiveWorkspace } from "./features/archive";
export default function LibraryArchivePanel({
  auth,
  readOnly = false,
  canManage,
}) {
  return (
    <ArchiveWorkspace
      auth={auth}
      mode={(canManage ?? !readOnly) ? "manage" : "browse"}
    />
  );
}
