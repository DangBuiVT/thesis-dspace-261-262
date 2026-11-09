import {
  requestSession,
  requestLoginOptions,
  requestLogin,
  requestPasswordChange,
} from "./api.js";
import { useI18n } from "../../i18n/I18nProvider.jsx";
import { translateApiMessage } from "../../i18n/api.js";
import { Form, message } from "antd";
import { useState, useEffect } from "react";
import { authHeaders, parseResponse } from "../../shared/api/http.js";

const STORAGE_KEY = "thesis_portal_auth";

export function useAuthSession() {
  const { t } = useI18n();

  const tr = (value) => translateApiMessage(value, t);

  const [loginForm] = Form.useForm();

  const [passwordForm] = Form.useForm();

  const [auth, setAuth] = useState(null);

  const [loginMethod, setLoginMethod] = useState("username");

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    const accessToken = params.get("access_token");
    if (oauthError || accessToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (oauthError) {
      const oauthMessages = {
        domain: t("Only verified @hcmut.edu.vn Google accounts can sign in."),
        not_registered: t(
          "This account has not been created. Ask an administrator to add you to a faculty first.",
        ),
        cancelled: t("Google sign-in was cancelled."),
        disabled: t("This account has been disabled."),
        maintenance: t(
          "System is in maintenance mode. Only administrators can sign in.",
        ),
        oauth: t("Google sign-in failed. Please try again."),
      };
      message.error(
        oauthMessages[oauthError] ||
          t("Google sign-in failed. Please try again."),
      );
    }

    const finishGoogleSession = async (token) => {
      try {
        const response = await requestSession({
          headers: authHeaders(token),
        });
        const user = await parseResponse(response);
        if (!response.ok || !user?.username || !user?.role) {
          throw new Error(user?.message || "Unable to complete Google sign-in");
        }
        const nextAuth = { token, user };
        setAuth(nextAuth);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
        message.success(t("Login successful"));
      } catch (error) {
        message.error(tr(error.message || "Unable to complete Google sign-in"));
      }
    };

    if (accessToken) {
      void finishGoogleSession(accessToken);
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.token && parsed?.user?.username && parsed?.user?.role) {
        setAuth(parsed);
        void requestSession({ headers: authHeaders(parsed.token) })
          .then((response) =>
            parseResponse(response).then((user) => ({ ok: response.ok, user })),
          )
          .then(({ ok, user }) => {
            if (!ok || !user?.username || !user?.role) {
              return;
            }
            const nextAuth = { token: parsed.token, user };
            setAuth(nextAuth);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
          })
          .catch(() => undefined);
      }
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const loadLoginOptions = async () => {
      try {
        const response = await requestLoginOptions();
        const payload = await parseResponse(response);
        if (
          response.ok &&
          (payload?.method === "google" || payload?.method === "username")
        ) {
          setLoginMethod(payload.method);
        }
      } catch (_error) {
        setLoginMethod("username");
      }
    };
    void loadLoginOptions();
  }, []);

  const handleLogin = async (values) => {
    setIsLoggingIn(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      const response = await requestLogin({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
        signal: controller.signal,
      });

      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            (response.status === 401
              ? "Invalid username or password"
              : response.status === 403
                ? "Password login is disabled. Use Google sign-in."
                : "Login failed. Please check backend server and API URL."),
        );
      }

      if (!payload?.access_token || !payload?.user) {
        throw new Error("Invalid login response from server");
      }

      const nextAuth = {
        token: payload.access_token,
        user: payload.user,
      };
      setAuth(nextAuth);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
      message.success(t("Login successful"));
    } catch (error) {
      if (error.name === "AbortError") {
        message.error(
          t("Login timeout. Please check backend server or Docker network."),
        );
      } else {
        message.error(tr(error.message || "Unable to login"));
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoggingIn(false);
    }
  };

  const handleChangePassword = async (values) => {
    if (!auth?.token) {
      return;
    }
    setChangingPassword(true);
    try {
      const body = { newPassword: values.newPassword };
      if (auth.user?.hasPassword !== false && values.currentPassword) {
        body.currentPassword = values.currentPassword;
      }
      const response = await requestPasswordChange({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify(body),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to change password");
      }
      const nextAuth = {
        ...auth,
        user: { ...auth.user, hasPassword: true },
      };
      setAuth(nextAuth);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
      passwordForm.resetFields();
      setPasswordModalOpen(false);
      message.success(t("Password updated"));
    } catch (error) {
      message.error(tr(error.message || "Unable to change password"));
    } finally {
      setChangingPassword(false);
    }
  };
  const handleLogout = () => {
    setAuth(null);
    localStorage.removeItem(STORAGE_KEY);
    loginForm.resetFields();
    passwordForm.resetFields();
    setPasswordModalOpen(false);
    message.info(t("You have been logged out"));
  };
  return {
    auth,
    loginForm,
    passwordForm,
    loginMethod,
    isLoggingIn,
    passwordModalOpen,
    changingPassword,
    setPasswordModalOpen,
    handleLogin,
    handleChangePassword,
    handleLogout,
  };
}
