import { requestUser, requestUsers } from "../api.js";
import {
  authHeaders,
  parseTextResponse as parseResponse,
} from "../../../shared/api/http.js";
import { message, Tag, Space, Button, Popconfirm } from "antd";
import { useMemo } from "react";
import { roleText, statusText, formatDateTime } from "../../../i18n/labels";
export function useUserManagement({
  setEditingUser,
  userForm,
  setUserModalOpen,
  setSavingUser,
  editingUser,
  auth,
  t,
  loadUsers,
  tr,
  userSearch,
  users,
  userRoleFilter,
  userStatusFilter,
  setUserSearch,
  setUserRoleFilter,
  setUserStatusFilter,
  lang,
}) {
  const openCreateUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    userForm.setFieldsValue({ role: "student" });
    setUserModalOpen(true);
  };

  const openEditUser = (record) => {
    setEditingUser(record);
    userForm.setFieldsValue({
      username: record.username,
      displayName: record.displayName,
      role: record.role,
      status: record.status,
      facultyId: record.facultyId || undefined,
    });
    setUserModalOpen(true);
  };

  const saveUser = async (values) => {
    setSavingUser(true);
    try {
      if (editingUser) {
        const body = {
          displayName: values.displayName,
          role: values.role,
          status: values.status,
          facultyId: values.facultyId || null,
        };
        if (values.password?.trim()) {
          body.password = values.password.trim();
        }
        const response = await requestUser(editingUser.id, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(auth.token),
          },
          body: JSON.stringify(body),
        });
        const payload = await parseResponse(response);
        if (!response.ok) {
          throw new Error(payload?.message || "Unable to update user");
        }
        message.success(t("User updated"));
      } else {
        const response = await requestUsers({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(auth.token),
          },
          body: JSON.stringify({
            username: values.username.trim(),
            password: values.password,
            displayName: values.displayName.trim(),
            role: values.role,
            facultyId: values.facultyId || undefined,
          }),
        });
        const payload = await parseResponse(response);
        if (!response.ok) {
          throw new Error(payload?.message || "Unable to create user");
        }
        message.success(t("User created"));
      }
      setUserModalOpen(false);
      await loadUsers();
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setSavingUser(false);
    }
  };

  const deleteUser = async (record) => {
    try {
      const response = await requestUser(record.id, {
        method: "DELETE",
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to delete user");
      }
      message.success(t("Deleted {{name}}", { name: record.username }));
      await loadUsers();
    } catch (error) {
      message.error(tr(error.message || "Unable to delete user"));
    }
  };

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      if (userRoleFilter !== "all" && user.role !== userRoleFilter) {
        return false;
      }
      if (userStatusFilter !== "all" && user.status !== userStatusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const username = (user.username || "").toLowerCase();
      const displayName = (user.displayName || "").toLowerCase();
      const facultyName = (user.facultyName || "").toLowerCase();
      return (
        username.includes(query) ||
        displayName.includes(query) ||
        facultyName.includes(query)
      );
    });
  }, [users, userSearch, userRoleFilter, userStatusFilter]);

  const clearUserFilters = () => {
    setUserSearch("");
    setUserRoleFilter("all");
    setUserStatusFilter("all");
  };

  const userColumns = [
    {
      title: t("Username"),
      dataIndex: "username",
      key: "username",
      width: 120,
    },
    {
      title: t("Display name"),
      dataIndex: "displayName",
      key: "displayName",
      width: 160,
    },
    {
      title: t("Role"),
      dataIndex: "role",
      key: "role",
      width: 130,
      render: (role) => <Tag>{roleText(role, t)}</Tag>,
    },
    {
      title: t("Faculty"),
      dataIndex: "facultyName",
      key: "facultyName",
      width: 220,
      render: (value) => value || "—",
    },
    {
      title: t("Status"),
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => (
        <Tag color={status === "active" ? "green" : "red"}>
          {statusText(status, t)}
        </Tag>
      ),
    },
    {
      title: t("Created"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (v) => (v ? formatDateTime(v, lang) : "—"),
    },
    {
      title: t("Actions"),
      key: "actions",
      width: 160,
      render: (_v, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEditUser(record)}>
            {t("Edit")}
          </Button>
          {record.id !== auth.user.id ? (
            <Popconfirm
              title={t("Delete {{name}}?", { name: record.username })}
              description={t(
                "This cannot be undone. Users with submissions or reviews cannot be deleted.",
              )}
              okText={t("Delete")}
              okButtonProps={{ danger: true }}
              onConfirm={() => void deleteUser(record)}
            >
              <Button type="link" size="small" danger>
                {t("Delete")}
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];
  return {
    openCreateUser,
    openEditUser,
    saveUser,
    deleteUser,
    filteredUsers,
    clearUserFilters,
    userColumns,
  };
}
