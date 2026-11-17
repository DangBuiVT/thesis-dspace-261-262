import {
  requestUsers,
  requestFaculties,
  requestRoles,
  requestSettings,
  requestFormFields,
  requestWorkflow,
  requestGroups,
} from "../api.js";
import { useCallback } from "react";
import {
  authHeaders,
  parseTextResponse as parseResponse,
} from "../../../shared/api/http.js";
import { message } from "antd";
import { isEmailSettingKey, isDspaceSettingKey } from "../model/settings.js";
export function useAdminResources({
  setLoadingUsers,
  auth,
  setUsers,
  tr,
  setFaculties,
  setLoadingRoles,
  setRoles,
  selectedRole,
  setSelectedRole,
  setRolePermissions,
  setLoadingSettings,
  setSettings,
  settingsForm,
  emailForm,
  setLoadingFormFields,
  setFormFields,
  setLoadingWorkflow,
  setWorkflowSteps,
  setSavingWorkflow,
  t,
  setLoadingGroups,
  setGroups,
}) {
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await requestUsers({
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load users");
      }
      setUsers(payload);
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setLoadingUsers(false);
    }
  }, [auth.token]);

  const loadFaculties = useCallback(async () => {
    try {
      const response = await requestFaculties({
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error(payload?.message || "Unable to load faculties");
      }
      setFaculties(payload);
    } catch (error) {
      message.error(tr(error.message));
    }
  }, [auth.token]);

  const loadRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const response = await requestRoles({
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load roles");
      }
      setRoles(payload);
      const current =
        payload.find((r) => r.role === selectedRole) || payload[0];
      if (current) {
        setSelectedRole(current.role);
        setRolePermissions({ ...current.permissions });
      }
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setLoadingRoles(false);
    }
  }, [auth.token]);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const response = await requestSettings({
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load settings");
      }
      setSettings(payload);
      const systemValues = {};
      const emailValues = {};
      for (const item of payload) {
        if (isEmailSettingKey(item.key)) {
          emailValues[item.key] = item.value;
        } else if (!isDspaceSettingKey(item.key)) {
          systemValues[item.key] = item.value;
        }
      }
      settingsForm.setFieldsValue(systemValues);
      emailForm.setFieldsValue(emailValues);
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setLoadingSettings(false);
    }
  }, [auth.token, settingsForm, emailForm]);

  const loadFormFields = useCallback(async () => {
    setLoadingFormFields(true);
    try {
      const response = await requestFormFields({
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load form fields");
      }
      setFormFields(Array.isArray(payload) ? payload : []);
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setLoadingFormFields(false);
    }
  }, [auth.token]);

  const loadWorkflow = useCallback(async () => {
    setLoadingWorkflow(true);
    try {
      const response = await requestWorkflow({
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load workflow");
      }
      setWorkflowSteps(Array.isArray(payload) ? payload : []);
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setLoadingWorkflow(false);
    }
  }, [auth.token]);

  const saveWorkflow = async (steps) => {
    setSavingWorkflow(true);
    try {
      const response = await requestWorkflow({
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({
          steps: steps.map((step) => ({
            role: step.role,
            label: step.label || "",
          })),
        }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to save workflow");
      }
      setWorkflowSteps(Array.isArray(payload) ? payload : []);
      message.success(t("Workflow saved"));
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setSavingWorkflow(false);
    }
  };

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const response = await requestGroups({
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load groups");
      }
      setGroups(Array.isArray(payload) ? payload : []);
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setLoadingGroups(false);
    }
  }, [auth.token]);
  return {
    loadUsers,
    loadFaculties,
    loadRoles,
    loadSettings,
    loadFormFields,
    loadWorkflow,
    saveWorkflow,
    loadGroups,
  };
}
