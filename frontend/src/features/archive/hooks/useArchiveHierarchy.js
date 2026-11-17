import { requestFaculties, requestSemesters, requestPeriods } from "../api.js";
import { useCallback } from "react";
import {
  authHeaders,
  parseTextResponse as parseResponse,
} from "../../../shared/api/http.js";
import { message } from "antd";
export function useArchiveHierarchy({
  setLoadingFaculties,
  auth,
  setFaculties,
  tr,
  setFacultyTree,
  setExpandedFacultyKeys,
}) {
  const loadFaculties = useCallback(async () => {
    setLoadingFaculties(true);
    try {
      const response = await requestFaculties({
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load faculties");
      }
      setFaculties(Array.isArray(payload) ? payload : []);
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setLoadingFaculties(false);
    }
  }, [auth.token]);

  const loadFacultyTree = useCallback(
    async (facultyId) => {
      if (!facultyId) {
        return;
      }
      setFacultyTree((prev) => ({
        ...prev,
        [facultyId]: {
          semesters: prev[facultyId]?.semesters || [],
          periods: prev[facultyId]?.periods || [],
          loading: true,
        },
      }));
      try {
        const [semRes, perRes] = await Promise.all([
          requestSemesters(facultyId, {
            headers: authHeaders(auth.token),
          }),
          requestPeriods(facultyId, {
            headers: authHeaders(auth.token),
          }),
        ]);
        const semPayload = await parseResponse(semRes);
        const perPayload = await parseResponse(perRes);
        if (!semRes.ok) {
          throw new Error(semPayload?.message || "Unable to load semesters");
        }
        if (!perRes.ok) {
          throw new Error(
            perPayload?.message || "Unable to load submission periods",
          );
        }
        setFacultyTree((prev) => ({
          ...prev,
          [facultyId]: {
            semesters: Array.isArray(semPayload) ? semPayload : [],
            periods: Array.isArray(perPayload) ? perPayload : [],
            loading: false,
          },
        }));
      } catch (error) {
        message.error(tr(error.message));
        setFacultyTree((prev) => ({
          ...prev,
          [facultyId]: {
            semesters: prev[facultyId]?.semesters || [],
            periods: prev[facultyId]?.periods || [],
            loading: false,
          },
        }));
      }
    },
    [auth.token],
  );

  const expandFaculty = useCallback(
    async (facultyId) => {
      if (!facultyId) {
        return;
      }
      setExpandedFacultyKeys((prev) =>
        prev.includes(facultyId) ? prev : [...prev, facultyId],
      );
      await loadFacultyTree(facultyId);
    },
    [loadFacultyTree],
  );
  return { loadFaculties, loadFacultyTree, expandFaculty };
}
