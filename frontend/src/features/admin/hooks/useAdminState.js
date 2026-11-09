import { useState } from "react";
import { Form } from "antd";
export function useAdminState() {
  const [activeTab, setActiveTab] = useState("users");

  const [users, setUsers] = useState([]);

  const [roles, setRoles] = useState([]);

  const [settings, setSettings] = useState([]);

  const [loadingUsers, setLoadingUsers] = useState(false);

  const [loadingRoles, setLoadingRoles] = useState(false);

  const [loadingSettings, setLoadingSettings] = useState(false);

  const [userModalOpen, setUserModalOpen] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);

  const [importingUsers, setImportingUsers] = useState(false);

  const [previewingImport, setPreviewingImport] = useState(false);

  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const [exportingUsers, setExportingUsers] = useState(false);

  const [faculties, setFaculties] = useState([]);

  const [importPreview, setImportPreview] = useState(null);

  const [importFacultyId, setImportFacultyId] = useState(null);

  const [importResult, setImportResult] = useState(null);

  const [editingUser, setEditingUser] = useState(null);

  const [userForm] = Form.useForm();

  const watchedUserRole = Form.useWatch("role", userForm);

  const facultyRequired =
    watchedUserRole === "student" || watchedUserRole === "reviewer";

  const [settingsForm] = Form.useForm();

  const [emailForm] = Form.useForm();

  const [savingUser, setSavingUser] = useState(false);

  const [savingRoles, setSavingRoles] = useState(false);

  const [savingSettings, setSavingSettings] = useState(false);

  const [formFields, setFormFields] = useState([]);

  const [workflowSteps, setWorkflowSteps] = useState([]);

  const [loadingWorkflow, setLoadingWorkflow] = useState(false);

  const [savingWorkflow, setSavingWorkflow] = useState(false);

  const [newStepRole, setNewStepRole] = useState("reviewer");

  const [newStepLabel, setNewStepLabel] = useState("");

  const [groups, setGroups] = useState([]);

  const [loadingGroups, setLoadingGroups] = useState(false);

  const [groupName, setGroupName] = useState("");

  const [groupKind, setGroupKind] = useState("student");

  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const [loadingFormFields, setLoadingFormFields] = useState(false);

  const [savingFormField, setSavingFormField] = useState(false);

  const [formFieldModalOpen, setFormFieldModalOpen] = useState(false);

  const [editingFormField, setEditingFormField] = useState(null);

  const [formFieldForm] = Form.useForm();

  const [selectedRole, setSelectedRole] = useState("student");

  const [rolePermissions, setRolePermissions] = useState({});

  const [userSearch, setUserSearch] = useState("");

  const [userRoleFilter, setUserRoleFilter] = useState("all");

  const [userStatusFilter, setUserStatusFilter] = useState("all");
  return {
    activeTab,
    setActiveTab,
    users,
    setUsers,
    roles,
    setRoles,
    settings,
    setSettings,
    loadingUsers,
    setLoadingUsers,
    loadingRoles,
    setLoadingRoles,
    loadingSettings,
    setLoadingSettings,
    userModalOpen,
    setUserModalOpen,
    importModalOpen,
    setImportModalOpen,
    importingUsers,
    setImportingUsers,
    previewingImport,
    setPreviewingImport,
    downloadingTemplate,
    setDownloadingTemplate,
    exportingUsers,
    setExportingUsers,
    faculties,
    setFaculties,
    importPreview,
    setImportPreview,
    importFacultyId,
    setImportFacultyId,
    importResult,
    setImportResult,
    editingUser,
    setEditingUser,
    userForm,
    watchedUserRole,
    facultyRequired,
    settingsForm,
    emailForm,
    savingUser,
    setSavingUser,
    savingRoles,
    setSavingRoles,
    savingSettings,
    setSavingSettings,
    formFields,
    setFormFields,
    workflowSteps,
    setWorkflowSteps,
    loadingWorkflow,
    setLoadingWorkflow,
    savingWorkflow,
    setSavingWorkflow,
    newStepRole,
    setNewStepRole,
    newStepLabel,
    setNewStepLabel,
    groups,
    setGroups,
    loadingGroups,
    setLoadingGroups,
    groupName,
    setGroupName,
    groupKind,
    setGroupKind,
    selectedGroupId,
    setSelectedGroupId,
    loadingFormFields,
    setLoadingFormFields,
    savingFormField,
    setSavingFormField,
    formFieldModalOpen,
    setFormFieldModalOpen,
    editingFormField,
    setEditingFormField,
    formFieldForm,
    selectedRole,
    setSelectedRole,
    rolePermissions,
    setRolePermissions,
    userSearch,
    setUserSearch,
    userRoleFilter,
    setUserRoleFilter,
    userStatusFilter,
    setUserStatusFilter,
  };
}
