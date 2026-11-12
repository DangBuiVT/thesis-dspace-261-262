import {
  requestSemesters,
  requestFaculties,
  requestArchiveResource,
  requestPeriods,
  requestOpenPeriod,
  requestPeriodAction,
} from "../api.js";
import { useCallback } from "react";
import {
  authHeaders,
  parseTextResponse as parseResponse,
} from "../../../shared/api/http.js";
import { message } from "antd";
import { toIsoString } from "../model/dates.js";
import dayjs from "dayjs";
export function useArchiveConfiguration({
  setConfigSemesters,
  setLoadingConfigSemesters,
  auth,
  tr,
  setSaving,
  t,
  setFacultyModalOpen,
  facultyForm,
  loadFaculties,
  setMainTab,
  expandFaculty,
  setSemesterModalOpen,
  semesterForm,
  expandedFacultyKeys,
  loadFacultyTree,
  configFacultyId,
  periodForm,
  setPeriodModalOpen,
  setExpandedSemesterKeys,
  setActionId,
  detailKind,
  detailRecord,
  openDetail,
}) {
  const loadConfigSemesters = useCallback(
    async (facultyId) => {
      if (!facultyId) {
        setConfigSemesters([]);
        return;
      }
      setLoadingConfigSemesters(true);
      try {
        const response = await requestSemesters(facultyId, {
          headers: authHeaders(auth.token),
        });
        const payload = await parseResponse(response);
        if (!response.ok) {
          throw new Error(payload?.message || "Unable to load semesters");
        }
        setConfigSemesters(Array.isArray(payload) ? payload : []);
      } catch (error) {
        setConfigSemesters([]);
        message.error(tr(error.message));
      } finally {
        setLoadingConfigSemesters(false);
      }
    },
    [auth.token],
  );

  const submitFaculty = async (values) => {
    setSaving(true);
    try {
      const response = await requestFaculties({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({
          name: values.name,
        }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to create faculty");
      }
      message.success(t("Faculty created"));
      setFacultyModalOpen(false);
      facultyForm.resetFields();
      await loadFaculties();
      setMainTab("browse");
      if (payload?.id) {
        await expandFaculty(payload.id);
      }
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setSaving(false);
    }
  };

  const submitSemester = async (values) => {
    const forAllFaculties = values.forAllFaculties === true;
    const facultyId = values.facultyId;
    if (!forAllFaculties && !facultyId) {
      message.warning(t("Select a faculty"));
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: values.name,
      };
      const response = await requestArchiveResource(
        forAllFaculties
          ? "/api/archive-config/semesters/for-all-faculties"
          : `/api/archive-config/faculties/${facultyId}/semesters`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(auth.token),
          },
          body: JSON.stringify(body),
        },
      );
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to create semester");
      }
      if (forAllFaculties) {
        const createdCount = payload?.createdCount ?? 0;
        const skippedCount = payload?.skippedCount ?? 0;
        message.success(
          skippedCount > 0
            ? t(
                "Created semester for {{created}} faculties, skipped {{skipped}}",
                {
                  created: createdCount,
                  skipped: skippedCount,
                },
              )
            : t("Created semester for {{created}} faculties", {
                created: createdCount,
              }),
        );
      } else {
        message.success(t("Semester created"));
      }
      setSemesterModalOpen(false);
      semesterForm.resetFields();
      await loadFaculties();
      if (forAllFaculties) {
        await Promise.all(expandedFacultyKeys.map((id) => loadFacultyTree(id)));
      } else {
        await expandFaculty(facultyId);
        if (configFacultyId === facultyId) {
          await loadConfigSemesters(facultyId);
        }
      }
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setSaving(false);
    }
  };

  const submitPeriod = async (values) => {
    const facultyId = values.facultyId;
    if (!facultyId) {
      message.warning(t("Select a faculty"));
      return;
    }
    if (!values.semesterId) {
      message.warning(t("Select a semester"));
      return;
    }
    if (!values.range?.[0] || !values.range?.[1]) {
      message.error(t("Please choose submission open and close dates"));
      return;
    }
    setSaving(true);
    try {
      const response = await requestPeriods(facultyId, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({
          semesterId: values.semesterId,
          name: values.name,
          opensAt: toIsoString(values.range[0]),
          closesAt: toIsoString(values.range[1]),
          allowResubmit: values.allowResubmit !== false,
        }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to create submission period",
        );
      }
      if (values.openAfterCreate && payload?.id) {
        const openRes = await requestOpenPeriod(payload.id, {
          method: "POST",
          headers: authHeaders(auth.token),
        });
        const openPayload = await parseResponse(openRes);
        if (!openRes.ok) {
          throw new Error(
            openPayload?.message || "Period created but could not be opened",
          );
        }
        message.success(t("Submission period created and opened"));
      } else {
        message.success(
          payload?.dspaceCollectionId
            ? t("Submission period created (DSpace collection linked)")
            : t("Submission period created (draft)"),
        );
      }
      periodForm.resetFields();
      setPeriodModalOpen(false);
      setExpandedSemesterKeys((prev) => {
        const current = prev[facultyId] || [];
        if (current.includes(values.semesterId)) {
          return prev;
        }
        return { ...prev, [facultyId]: [...current, values.semesterId] };
      });
      await loadFaculties();
      await expandFaculty(facultyId);
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setSaving(false);
    }
  };

  const openCreateSemesterModal = () => {
    semesterForm.setFieldsValue({
      forAllFaculties: false,
      facultyId: undefined,
      name: undefined,
    });
    setSemesterModalOpen(true);
  };

  const openCreatePeriodModal = () => {
    periodForm.setFieldsValue({
      facultyId: undefined,
      semesterId: undefined,
      name: undefined,
      allowResubmit: true,
      openAfterCreate: false,
      range: [dayjs().startOf("day"), dayjs().add(90, "day").endOf("day")],
    });
    setConfigSemesters([]);
    setPeriodModalOpen(true);
  };

  const onConfigFacultyChange = (facultyId) => {
    periodForm.setFieldsValue({ facultyId, semesterId: undefined });
    void loadConfigSemesters(facultyId);
  };

  const periodAction = async (periodId, action, facultyId) => {
    setActionId(`${action}-${periodId}`);
    try {
      const response = await requestPeriodAction(periodId, action, {
        method: "POST",
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || `Unable to ${action} period`);
      }
      message.success(
        action === "open" ? t("Period opened") : t("Period closed"),
      );
      await loadFaculties();
      if (facultyId) {
        await loadFacultyTree(facultyId);
      }
      if (detailKind === "period" && detailRecord?.id === periodId) {
        await openDetail("period", periodId);
      }
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setActionId(null);
    }
  };
  return {
    loadConfigSemesters,
    submitFaculty,
    submitSemester,
    submitPeriod,
    openCreateSemesterModal,
    openCreatePeriodModal,
    onConfigFacultyChange,
    periodAction,
  };
}
