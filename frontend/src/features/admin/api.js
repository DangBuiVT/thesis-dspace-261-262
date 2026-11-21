import { request } from "../../shared/api/http.js";

export const requestGroups = (options) => request("/api/admin/groups", options);
export const requestGroup = (groupId, options) =>
  request(`/api/admin/groups/${groupId}`, options);
export const requestUsers = (options) => request("/api/admin/users", options);
export const requestFaculties = (options) =>
  request("/api/archive-config/faculties", options);
export const requestRoles = (options) => request("/api/admin/roles", options);
export const requestSettings = (options) =>
  request("/api/admin/settings", options);
export const requestFormFields = (options) =>
  request("/api/admin/submission-form-fields", options);
export const requestWorkflow = (options) =>
  request("/api/admin/workflow", options);
export const requestFormField = (fieldId, options) =>
  request(`/api/admin/submission-form-fields/${fieldId}`, options);
export const requestRole = (role, options) =>
  request(`/api/admin/roles/${role}`, options);
export const requestUserExport = (options) =>
  request("/api/admin/users/export", options);
export const requestUserImportTemplate = (options) =>
  request("/api/admin/users/import-template", options);
export const requestUserImportPreview = (options) =>
  request("/api/admin/users/import/preview", options);
export const requestUserImport = (options) =>
  request("/api/admin/users/import", options);
export const requestUser = (userId, options) =>
  request(`/api/admin/users/${userId}`, options);
export const requestGroupMembers = (groupId, options) =>
  request(`/api/admin/groups/${groupId}/members`, options);
export const requestGroupGrants = (groupId, options) =>
  request(`/api/admin/groups/${groupId}/grants`, options);
export const requestWatermarkLogo = (variant, options) =>
  request(`/api/admin/signature/logo?variant=${variant}`, options);
export const requestWatermarkLogoUpload = (options) =>
  request("/api/admin/signature/logo", options);
export const requestWatermarkPreview = (options) =>
  request("/api/admin/signature/preview", options);
