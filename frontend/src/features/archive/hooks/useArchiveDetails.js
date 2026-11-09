import { requestArchiveResource } from "../api.js";
import {
  authHeaders,
  parseTextResponse as parseResponse,
} from "../../../shared/api/http.js";
import { message, Modal } from "antd";
import dayjs from "dayjs";
import { toIsoString } from "../model/dates.js";
export function useArchiveDetails({
  setDetailKind,
  setDetailLoading,
  setDetailRecord,
  auth,
  tr,
  detailRecord,
  detailKind,
  setEditKind,
  setEditRecord,
  editForm,
  editKind,
  editRecord,
  setSaving,
  t,
  loadFaculties,
  expandedFacultyKeys,
  loadFacultyTree,
  setActionId,
  setExpandedFacultyKeys,
  setFacultyTree,
  setExpandedSemesterKeys,
}) {
  const openDetail = async (kind, id) => {
    setDetailKind(kind);
    setDetailLoading(true);
    setDetailRecord(null);
    try {
      const path =
        kind === "faculty"
          ? `/api/archive-config/faculties/${id}`
          : kind === "semester"
            ? `/api/archive-config/semesters/${id}`
            : `/api/archive-config/submission-periods/${id}`;
      const response = await requestArchiveResource(path, {
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load detail");
      }
      setDetailRecord(payload);
    } catch (error) {
      message.error(tr(error.message));
      setDetailKind(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailKind(null);
    setDetailRecord(null);
  };

  const openEditFromDetail = () => {
    if (!detailRecord || !detailKind) {
      return;
    }
    setEditKind(detailKind);
    setEditRecord(detailRecord);
    if (detailKind === "faculty") {
      editForm.setFieldsValue({
        name: detailRecord.name,
        status: detailRecord.status,
      });
    } else if (detailKind === "semester") {
      editForm.setFieldsValue({
        name: detailRecord.name,
        status: detailRecord.status || "active",
      });
    } else {
      editForm.setFieldsValue({
        name: detailRecord.name,
        range: [dayjs(detailRecord.opensAt), dayjs(detailRecord.closesAt)],
        allowResubmit: detailRecord.allowResubmit !== false,
      });
    }
  };

  const submitEdit = async (values) => {
    if (!editKind || !editRecord) {
      return;
    }
    setSaving(true);
    try {
      let path;
      let body;
      if (editKind === "faculty") {
        path = `/api/archive-config/faculties/${editRecord.id}`;
        body = { name: values.name, status: values.status };
      } else if (editKind === "semester") {
        path = `/api/archive-config/semesters/${editRecord.id}`;
        body = {
          name: values.name,
          status: values.status,
        };
      } else {
        if (!values.range?.[0] || !values.range?.[1]) {
          message.error(t("Please choose open and close dates"));
          setSaving(false);
          return;
        }
        path = `/api/archive-config/submission-periods/${editRecord.id}`;
        body = {
          name: values.name,
          opensAt: toIsoString(values.range[0]),
          closesAt: toIsoString(values.range[1]),
          allowResubmit: values.allowResubmit !== false,
        };
      }
      const response = await requestArchiveResource(path, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(auth.token),
        },
        body: JSON.stringify(body),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to update");
      }
      message.success(t("Updated successfully"));
      const treeFacultyId =
        editKind === "faculty" ? editRecord.id : editRecord.facultyId;
      setEditKind(null);
      setEditRecord(null);
      editForm.resetFields();
      await loadFaculties();
      if (
        treeFacultyId &&
        (editKind === "semester" ||
          editKind === "period" ||
          expandedFacultyKeys.includes(treeFacultyId))
      ) {
        await loadFacultyTree(treeFacultyId);
      }
      if (detailKind) {
        setDetailRecord(payload);
      }
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteFromDetail = () => {
    if (!detailKind || !detailRecord) {
      return;
    }
    const name = detailRecord.name;
    const titles = {
      faculty: t("Delete faculty?"),
      semester: t("Delete semester?"),
      period: t("Delete submission period?"),
    };
    const contents = {
      faculty: t(
        'Delete "{{name}}" from Portal? Semesters and periods under this faculty will also be removed. Linked submissions keep files but lose the period link.',
        { name },
      ),
      semester: t(
        'Delete "{{name}}" from Portal? Periods under this semester will also be removed. Linked submissions will lose the period link.',
        { name },
      ),
      period: t(
        'Delete period "{{name}}" from Portal? Linked submissions will lose the period link.',
        { name },
      ),
    };
    Modal.confirm({
      title: titles[detailKind],
      content: contents[detailKind],
      okText: t("Delete"),
      okType: "danger",
      onOk: () => deleteFromDetail(),
    });
  };

  const deleteFromDetail = async () => {
    if (!detailKind || !detailRecord) {
      return;
    }
    const id = detailRecord.id;
    const path =
      detailKind === "faculty"
        ? `/api/archive-config/faculties/${id}`
        : detailKind === "semester"
          ? `/api/archive-config/semesters/${id}`
          : `/api/archive-config/submission-periods/${id}`;
    setActionId(`delete-${id}`);
    try {
      const response = await requestArchiveResource(path, {
        method: "DELETE",
        headers: authHeaders(auth.token),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to delete");
      }
      if (payload?.dspaceDeleteWarning) {
        message.warning(
          t(
            "Removed from Portal, but DSpace node may still exist — check backend logs",
          ),
        );
      } else if (payload?.dspaceDeleted) {
        message.success(t("Deleted from Portal and DSpace"));
      } else {
        message.success(t("Deleted successfully"));
      }
      const deletedFaculty = detailKind === "faculty";
      const treeFacultyId = deletedFaculty ? id : detailRecord.facultyId;
      closeDetail();
      await loadFaculties();
      if (deletedFaculty) {
        setExpandedFacultyKeys((prev) =>
          prev.filter((key) => key !== treeFacultyId),
        );
        setFacultyTree((prev) => {
          const next = { ...prev };
          delete next[treeFacultyId];
          return next;
        });
        setExpandedSemesterKeys((prev) => {
          const next = { ...prev };
          delete next[treeFacultyId];
          return next;
        });
      } else if (treeFacultyId) {
        await loadFacultyTree(treeFacultyId);
      }
    } catch (error) {
      message.error(tr(error.message));
    } finally {
      setActionId(null);
    }
  };
  return {
    openDetail,
    closeDetail,
    openEditFromDetail,
    submitEdit,
    confirmDeleteFromDetail,
    deleteFromDetail,
  };
}
