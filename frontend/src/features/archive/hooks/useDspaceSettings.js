import { requestDspaceSettings } from "../api.js";
import { useCallback } from "react";
import {
  authHeaders,
  parseTextResponse as parseResponse,
} from "../../../shared/api/http.js";
import {
  sortDspaceSettings,
  isDspaceSettingKey,
  HIDDEN_DSPACE_SETTINGS,
} from "../model/settings.js";
import { message } from "antd";
export function useDspaceSettings({
  isAdmin,
  setLoadingDspaceSettings,
  auth,
  setDspaceSettings,
  dspaceSettingsForm,
  tr,
  setSavingDspaceSettings,
  t,
}) {
  const loadDspaceSettings = useCallback(async () => {
    if (!isAdmin) {
      return;
    }
    setLoadingDspaceSettings(true);
    try {
      const response = await requestDspaceSettings({
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error(payload?.message || "Unable to load DSpace settings");
      }
      const dspaceItems = sortDspaceSettings(
        payload.filter(
          (item) =>
            isDspaceSettingKey(item.key) &&
            !HIDDEN_DSPACE_SETTINGS.has(item.key),
        ),
      );
      setDspaceSettings(dspaceItems);
      const values = {};
      for (const item of dspaceItems) {
        values[item.key] = item.value;
      }
      dspaceSettingsForm.setFieldsValue(values);
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setLoadingDspaceSettings(false);
    }
  }, [auth.token, dspaceSettingsForm, isAdmin]);

  const saveDspaceSettings = async (values) => {
    setSavingDspaceSettings(true);
    try {
      const response = await requestDspaceSettings({
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({ settings: values }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to save DSpace settings");
      }
      message.success(t("DSpace settings saved"));
      await loadDspaceSettings();
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setSavingDspaceSettings(false);
    }
  };
  return { loadDspaceSettings, saveDspaceSettings };
}
