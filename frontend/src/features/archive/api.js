import { request } from "../../shared/api/http.js";

export const requestSemesters = (facultyId, options) =>
  request(`/api/archive-config/faculties/${facultyId}/semesters`, options);
export const requestFaculties = (options) =>
  request("/api/archive-config/faculties", options);
export const requestArchiveResource = (resourcePath, options) =>
  request(resourcePath, options);
export const requestPeriods = (facultyId, options) =>
  request(
    `/api/archive-config/faculties/${facultyId}/submission-periods`,
    options,
  );
export const requestOpenPeriod = (periodId, options) =>
  request(`/api/archive-config/submission-periods/${periodId}/open`, options);
export const requestPeriodAction = (periodId, action, options) =>
  request(
    `/api/archive-config/submission-periods/${periodId}/${action}`,
    options,
  );
export const requestPublishQueue = (querySuffix, options) =>
  request(`/api/archive-config/dspace/publish-queue${querySuffix}`, options);
export const requestPublish = (options) =>
  request("/api/archive-config/dspace/publish", options);
export const requestDspaceSettings = (options) =>
  request("/api/admin/settings", options);
export const requestDspaceSync = (options) =>
  request("/api/archive-config/dspace/sync-from-root", options);
export const requestDspaceNodes = (options) =>
  request("/api/archive-config/dspace/sync-nodes", options);
