import { requestSettings } from "../api.js";
import { useMemo } from "react";
import {
  isEmailSettingKey,
  isDspaceSettingKey,
  isSignatureSettingKey,
  sortEmailTechnical,
  isEmailTechnicalKey,
  EMAIL_TECHNICAL_KEYS,
} from "../model/settings.js";
import {
  authHeaders,
  parseTextResponse as parseResponse,
} from "../../../shared/api/http.js";
import { message } from "antd";
import {
  normalizeSignatureStyle,
  setStoredSignatureStyle,
  setStoredWatermarkPages,
  DEFAULT_WATERMARK_PAGES,
} from "../../../shared/signature.js";
export function useAdminSettings({
  settings,
  setSavingSettings,
  auth,
  t,
  loadSettings,
  tr,
}) {
  const systemSettings = useMemo(
    () =>
      settings.filter(
        (item) =>
          !isEmailSettingKey(item.key) &&
          !isDspaceSettingKey(item.key) &&
          !isSignatureSettingKey(item.key),
      ),
    [settings],
  );

  const emailSettings = useMemo(
    () => settings.filter((item) => isEmailSettingKey(item.key)),
    [settings],
  );

  const emailTechnicalSettings = useMemo(
    () =>
      sortEmailTechnical(
        emailSettings.filter((item) => isEmailTechnicalKey(item.key)),
      ),
    [emailSettings],
  );

  const emailTemplateSettings = useMemo(
    () =>
      emailSettings.filter(
        (item) =>
          item.key.startsWith("email_subject_") ||
          item.key.startsWith("email_body_"),
      ),
    [emailSettings],
  );

  const saveSettings = async (values) => {
    setSavingSettings(true);
    try {
      const response = await requestSettings({
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({ settings: values }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to save settings");
      }
      message.success(t("System configuration saved"));
      await loadSettings();
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setSavingSettings(false);
    }
  };

  const saveEmailSettings = async (values) => {
    const settings = {};
    for (const [key, value] of Object.entries(values)) {
      if (
        EMAIL_TECHNICAL_KEYS.includes(key) ||
        key.startsWith("email_subject_") ||
        key.startsWith("email_body_")
      ) {
        settings[key] = value;
      }
    }
    setSavingSettings(true);
    try {
      const response = await requestSettings({
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({ settings }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to save email settings");
      }
      message.success(t("Email configuration saved"));
      await loadSettings();
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setSavingSettings(false);
    }
  };
  // Defaults used when archiving; the browser copy keeps the pickers in sync immediately.
  const saveSignatureSettings = async ({ style, pages }) => {
    const signatureStyle = normalizeSignatureStyle(style);
    const watermarkPages = String(pages ?? "").trim() || DEFAULT_WATERMARK_PAGES;
    if (!/^\d+(\s*-\s*\d+)?(\s*[,;\s]\s*\d+(\s*-\s*\d+)?)*$/.test(watermarkPages)) {
      message.error(t("Watermark pages must be numbers, lists or ranges"));
      return;
    }
    setSavingSettings(true);
    try {
      const response = await requestSettings({
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({
          settings: {
            signature_style: signatureStyle,
            signature_watermark_pages: watermarkPages,
          },
        }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to save settings");
      }
      setStoredSignatureStyle(signatureStyle);
      setStoredWatermarkPages(watermarkPages);
      message.success(t("Digital signature configuration saved"));
      await loadSettings();
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setSavingSettings(false);
    }
  };
  return {
    systemSettings,
    emailSettings,
    emailTechnicalSettings,
    emailTemplateSettings,
    saveSettings,
    saveEmailSettings,
    saveSignatureSettings,
  };
}
