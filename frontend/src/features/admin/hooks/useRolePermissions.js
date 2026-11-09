import { requestRole } from "../api.js";
import { useEffect } from "react";
import {
  authHeaders,
  parseTextResponse as parseResponse,
} from "../../../shared/api/http.js";
import { message } from "antd";
export function useRolePermissions({
  roles,
  selectedRole,
  setRolePermissions,
  setSavingRoles,
  auth,
  rolePermissions,
  t,
  loadRoles,
  tr,
}) {
  useEffect(() => {
    const entry = roles.find((r) => r.role === selectedRole);
    if (entry) {
      setRolePermissions({ ...entry.permissions });
    }
  }, [selectedRole, roles]);

  const saveRolePermissions = async () => {
    setSavingRoles(true);
    try {
      const response = await requestRole(selectedRole, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({ permissions: rolePermissions }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to update role permissions",
        );
      }
      message.success(t("Role permissions updated"));
      await loadRoles();
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setSavingRoles(false);
    }
  };
  return { saveRolePermissions };
}
