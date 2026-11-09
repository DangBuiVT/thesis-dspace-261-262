import {
  requestPublishQueue,
  requestSemesters,
  requestPeriods,
  requestPublish,
} from "../api.js";
import { useCallback } from "react";
import {
  authHeaders,
  parseTextResponse as parseResponse,
} from "../../../shared/api/http.js";
import { message } from "antd";
export function useDspacePublishing({
  allowEdit,
  setLoadingPublishQueue,
  publishFilterFacultyId,
  publishFilterSemesterId,
  publishFilterPeriodId,
  publishFilterStatus,
  auth,
  setPublishQueue,
  setSelectedPublishIds,
  tr,
  setPublishFilterFacultyId,
  setPublishFilterSemesterId,
  setPublishFilterPeriodId,
  setPublishSemesters,
  setPublishPeriods,
  selectedPublishIds,
  t,
  setTargetCollectionId,
  setPushCollectionModalOpen,
  pushingDspace,
  targetCollectionId,
  setPushingDspace,
}) {
  const loadPublishQueue = useCallback(async () => {
    if (!allowEdit) {
      return;
    }
    setLoadingPublishQueue(true);
    try {
      const params = new URLSearchParams();
      if (publishFilterFacultyId) {
        params.set("facultyId", publishFilterFacultyId);
      }
      if (publishFilterSemesterId) {
        params.set("semesterId", publishFilterSemesterId);
      }
      if (publishFilterPeriodId) {
        params.set("periodId", publishFilterPeriodId);
      }
      if (publishFilterStatus) {
        params.set("dspaceStatus", publishFilterStatus);
      }
      const qs = params.toString();
      const response = await requestPublishQueue(qs ? `?${qs}` : "", {
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load publish queue");
      }
      setPublishQueue(Array.isArray(payload) ? payload : []);
      setSelectedPublishIds([]);
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setLoadingPublishQueue(false);
    }
  }, [
    allowEdit,
    auth.token,
    publishFilterFacultyId,
    publishFilterSemesterId,
    publishFilterPeriodId,
    publishFilterStatus,
  ]);

  const onPublishFilterFacultyChange = async (facultyId) => {
    setPublishFilterFacultyId(facultyId || null);
    setPublishFilterSemesterId(null);
    setPublishFilterPeriodId(null);
    if (!facultyId) {
      setPublishSemesters([]);
      setPublishPeriods([]);
      return;
    }
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
      setPublishSemesters(Array.isArray(semPayload) ? semPayload : []);
      setPublishPeriods(Array.isArray(perPayload) ? perPayload : []);
    } catch (error) {
      setPublishSemesters([]);
      setPublishPeriods([]);
      message.error(tr(error.message));
    }
  };

  const onPublishFilterSemesterChange = (semesterId) => {
    setPublishFilterSemesterId(semesterId || null);
    setPublishFilterPeriodId(null);
  };

  const openPushCollectionModal = () => {
    if (selectedPublishIds.length === 0) {
      message.warning(t("Select at least one submission"));
      return;
    }
    setTargetCollectionId(null);
    setPushCollectionModalOpen(true);
  };

  const closePushCollectionModal = () => {
    if (pushingDspace) {
      return;
    }
    setPushCollectionModalOpen(false);
    setTargetCollectionId(null);
  };

  const pushSelectedToDspace = async () => {
    if (!targetCollectionId) {
      message.warning(t("Choose a destination DSpace collection"));
      return;
    }
    if (selectedPublishIds.length === 0) {
      message.warning(t("Select at least one submission"));
      return;
    }
    setPushingDspace(true);
    try {
      const response = await requestPublish({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify({
          submissionIds: selectedPublishIds,
          collectionId: targetCollectionId,
        }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Push to DSpace failed");
      }
      const results = payload?.results || [];
      const okCount = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        message.success(
          t("Pushed {{count}} submission(s) to DSpace", { count: okCount }),
        );
      } else {
        const detail = failed
          .map((row) => row.message)
          .filter(Boolean)
          .slice(0, 2)
          .join(" ");
        message.warning(
          detail
            ? t("Pushed {{ok}} ok, {{failed}} failed. {{detail}}", {
                ok: okCount,
                failed: failed.length,
                detail: tr(detail),
              })
            : t("Pushed {{ok}} ok, {{failed}} failed", {
                ok: okCount,
                failed: failed.length,
              }),
        );
      }
      setPushCollectionModalOpen(false);
      setTargetCollectionId(null);
      setSelectedPublishIds([]);
      await loadPublishQueue();
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setPushingDspace(false);
    }
  };
  return {
    loadPublishQueue,
    onPublishFilterFacultyChange,
    onPublishFilterSemesterChange,
    openPushCollectionModal,
    closePushCollectionModal,
    pushSelectedToDspace,
  };
}
