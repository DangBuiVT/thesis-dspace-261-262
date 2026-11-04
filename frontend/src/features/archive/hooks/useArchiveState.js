import { useState } from "react";
import { Form } from "antd";
export function useArchiveState({ canManage, readOnly, auth }) {
  const allowEdit = canManage ?? !readOnly;

  const isAdmin = auth?.user?.role === "admin";

  const canManageFaculties = isAdmin;

  const [faculties, setFaculties] = useState([]);

  const [facultyTree, setFacultyTree] = useState({});

  const [expandedFacultyKeys, setExpandedFacultyKeys] = useState([]);

  const [expandedSemesterKeys, setExpandedSemesterKeys] = useState({});

  const [loadingFaculties, setLoadingFaculties] = useState(false);

  const [syncingDspace, setSyncingDspace] = useState(false);

  const [syncResult, setSyncResult] = useState(null);

  const [dspaceSyncNodes, setDspaceSyncNodes] = useState([]);

  const [dspaceTreeExpandedKeys, setDspaceTreeExpandedKeys] = useState([]);

  const [loadingDspaceTree, setLoadingDspaceTree] = useState(false);

  const [mainTab, setMainTab] = useState("browse");

  const [configSemesters, setConfigSemesters] = useState([]);

  const [loadingConfigSemesters, setLoadingConfigSemesters] = useState(false);

  const [facultyModalOpen, setFacultyModalOpen] = useState(false);

  const [semesterModalOpen, setSemesterModalOpen] = useState(false);

  const [periodModalOpen, setPeriodModalOpen] = useState(false);

  const [semesterForm] = Form.useForm();

  const [detailKind, setDetailKind] = useState(null);

  const [detailRecord, setDetailRecord] = useState(null);

  const [detailLoading, setDetailLoading] = useState(false);

  const [editKind, setEditKind] = useState(null);

  const [editRecord, setEditRecord] = useState(null);

  const [facultyForm] = Form.useForm();

  const [periodForm] = Form.useForm();

  const [editForm] = Form.useForm();

  const [dspaceSettingsForm] = Form.useForm();

  const [dspaceSettings, setDspaceSettings] = useState([]);

  const [loadingDspaceSettings, setLoadingDspaceSettings] = useState(false);

  const [savingDspaceSettings, setSavingDspaceSettings] = useState(false);

  const configFacultyId = Form.useWatch("facultyId", periodForm);

  const [saving, setSaving] = useState(false);

  const [actionId, setActionId] = useState(null);

  const [publishQueue, setPublishQueue] = useState([]);

  const [loadingPublishQueue, setLoadingPublishQueue] = useState(false);

  const [pushingDspace, setPushingDspace] = useState(false);

  const [selectedPublishIds, setSelectedPublishIds] = useState([]);

  const [publishFilterFacultyId, setPublishFilterFacultyId] = useState(null);

  const [publishFilterSemesterId, setPublishFilterSemesterId] = useState(null);

  const [publishFilterPeriodId, setPublishFilterPeriodId] = useState(null);

  const [publishFilterStatus, setPublishFilterStatus] = useState("pending");

  const [publishSemesters, setPublishSemesters] = useState([]);

  const [publishPeriods, setPublishPeriods] = useState([]);

  const [targetCollectionId, setTargetCollectionId] = useState(null);

  const [pushCollectionModalOpen, setPushCollectionModalOpen] = useState(false);
  return {
    allowEdit,
    isAdmin,
    canManageFaculties,
    faculties,
    setFaculties,
    facultyTree,
    setFacultyTree,
    expandedFacultyKeys,
    setExpandedFacultyKeys,
    expandedSemesterKeys,
    setExpandedSemesterKeys,
    loadingFaculties,
    setLoadingFaculties,
    syncingDspace,
    setSyncingDspace,
    syncResult,
    setSyncResult,
    dspaceSyncNodes,
    setDspaceSyncNodes,
    dspaceTreeExpandedKeys,
    setDspaceTreeExpandedKeys,
    loadingDspaceTree,
    setLoadingDspaceTree,
    mainTab,
    setMainTab,
    configSemesters,
    setConfigSemesters,
    loadingConfigSemesters,
    setLoadingConfigSemesters,
    facultyModalOpen,
    setFacultyModalOpen,
    semesterModalOpen,
    setSemesterModalOpen,
    periodModalOpen,
    setPeriodModalOpen,
    semesterForm,
    detailKind,
    setDetailKind,
    detailRecord,
    setDetailRecord,
    detailLoading,
    setDetailLoading,
    editKind,
    setEditKind,
    editRecord,
    setEditRecord,
    facultyForm,
    periodForm,
    editForm,
    dspaceSettingsForm,
    dspaceSettings,
    setDspaceSettings,
    loadingDspaceSettings,
    setLoadingDspaceSettings,
    savingDspaceSettings,
    setSavingDspaceSettings,
    configFacultyId,
    saving,
    setSaving,
    actionId,
    setActionId,
    publishQueue,
    setPublishQueue,
    loadingPublishQueue,
    setLoadingPublishQueue,
    pushingDspace,
    setPushingDspace,
    selectedPublishIds,
    setSelectedPublishIds,
    publishFilterFacultyId,
    setPublishFilterFacultyId,
    publishFilterSemesterId,
    setPublishFilterSemesterId,
    publishFilterPeriodId,
    setPublishFilterPeriodId,
    publishFilterStatus,
    setPublishFilterStatus,
    publishSemesters,
    setPublishSemesters,
    publishPeriods,
    setPublishPeriods,
    targetCollectionId,
    setTargetCollectionId,
    pushCollectionModalOpen,
    setPushCollectionModalOpen,
  };
}
