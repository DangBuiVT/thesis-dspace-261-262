import { useRef, useState } from "react";
import {
  getStoredSignatureStyle,
  getStoredWatermarkPages,
} from "../../../shared/signature.js";

export function useReviewState() {
  const workflowRequests = useRef(new Set());

  const [queueError, setQueueError] = useState("");

  const [libraryQueue, setLibraryQueue] = useState([]);

  const [directorQueue, setDirectorQueue] = useState([]);

  const [reviewerQueue, setReviewerQueue] = useState([]);

  const [reviewerSearch, setReviewerSearch] = useState("");

  const [reviewerSemesterFilter, setReviewerSemesterFilter] = useState();

  const [reviewerPeriodFilter, setReviewerPeriodFilter] = useState();

  const [staffSearch, setStaffSearch] = useState("");

  const [staffSemesterFilter, setStaffSemesterFilter] = useState();

  const [staffPeriodFilter, setStaffPeriodFilter] = useState();

  const [isLoadingReviewerQueue, setIsLoadingReviewerQueue] = useState(false);

  const [isLoadingLibraryQueue, setIsLoadingLibraryQueue] = useState(false);

  const [isLoadingDirectorQueue, setIsLoadingDirectorQueue] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  const [rejectTargetId, setRejectTargetId] = useState(null);

  const [rejectReason, setRejectReason] = useState("");

  const [reviewActionLoadingId, setReviewActionLoadingId] = useState(null);

  const [libraryRejectModalOpen, setLibraryRejectModalOpen] = useState(false);

  const [libraryRejectTargetId, setLibraryRejectTargetId] = useState(null);

  const [libraryRejectReason, setLibraryRejectReason] = useState("");

  const [libraryActionLoadingId, setLibraryActionLoadingId] = useState(null);

  const [directorActionLoadingId, setDirectorActionLoadingId] = useState(null);

  const [directorReturnModalOpen, setDirectorReturnModalOpen] = useState(false);

  const [directorReturnTargetId, setDirectorReturnTargetId] = useState(null);

  const [directorReturnReason, setDirectorReturnReason] = useState("");

  const [reviewerDetailRecord, setReviewerDetailRecord] = useState(null);

  // Admin intake: administrators may act on any pending step.
  const [adminIntakeQueue, setAdminIntakeQueue] = useState([]);

  const [isLoadingAdminIntakeQueue, setIsLoadingAdminIntakeQueue] =
    useState(false);

  const [adminIntakeActionLoadingId, setAdminIntakeActionLoadingId] =
    useState(null);

  const [adminRejectModalOpen, setAdminRejectModalOpen] = useState(false);

  const [adminRejectTargetId, setAdminRejectTargetId] = useState(null);

  const [adminRejectReason, setAdminRejectReason] = useState("");

  // Legacy batch signing of theses that were archived before digital signatures existed.
  const [legacyBatchList, setLegacyBatchList] = useState([]);

  const [isLoadingLegacyBatch, setIsLoadingLegacyBatch] = useState(false);

  const [selectedLegacyKeys, setSelectedLegacyKeys] = useState([]);

  const [batchSigningLoading, setBatchSigningLoading] = useState(false);

  const [legacyBatchStyle, setLegacyBatchStyle] = useState(() =>
    getStoredSignatureStyle(),
  );

  const [legacyBatchPages, setLegacyBatchPages] = useState(() =>
    getStoredWatermarkPages(),
  );

  const [batchResult, setBatchResult] = useState(null);
  return {
    workflowRequests,
    queueError,
    setQueueError,
    libraryQueue,
    setLibraryQueue,
    directorQueue,
    setDirectorQueue,
    reviewerQueue,
    setReviewerQueue,
    reviewerSearch,
    setReviewerSearch,
    reviewerSemesterFilter,
    setReviewerSemesterFilter,
    reviewerPeriodFilter,
    setReviewerPeriodFilter,
    staffSearch,
    setStaffSearch,
    staffSemesterFilter,
    setStaffSemesterFilter,
    staffPeriodFilter,
    setStaffPeriodFilter,
    isLoadingReviewerQueue,
    setIsLoadingReviewerQueue,
    isLoadingLibraryQueue,
    setIsLoadingLibraryQueue,
    isLoadingDirectorQueue,
    setIsLoadingDirectorQueue,
    rejectModalOpen,
    setRejectModalOpen,
    rejectTargetId,
    setRejectTargetId,
    rejectReason,
    setRejectReason,
    reviewActionLoadingId,
    setReviewActionLoadingId,
    libraryRejectModalOpen,
    setLibraryRejectModalOpen,
    libraryRejectTargetId,
    setLibraryRejectTargetId,
    libraryRejectReason,
    setLibraryRejectReason,
    libraryActionLoadingId,
    setLibraryActionLoadingId,
    directorActionLoadingId,
    setDirectorActionLoadingId,
    directorReturnModalOpen,
    setDirectorReturnModalOpen,
    directorReturnTargetId,
    setDirectorReturnTargetId,
    directorReturnReason,
    setDirectorReturnReason,
    reviewerDetailRecord,
    setReviewerDetailRecord,
    adminIntakeQueue,
    setAdminIntakeQueue,
    isLoadingAdminIntakeQueue,
    setIsLoadingAdminIntakeQueue,
    adminIntakeActionLoadingId,
    setAdminIntakeActionLoadingId,
    adminRejectModalOpen,
    setAdminRejectModalOpen,
    adminRejectTargetId,
    setAdminRejectTargetId,
    adminRejectReason,
    setAdminRejectReason,
    legacyBatchList,
    setLegacyBatchList,
    isLoadingLegacyBatch,
    setIsLoadingLegacyBatch,
    selectedLegacyKeys,
    setSelectedLegacyKeys,
    batchSigningLoading,
    setBatchSigningLoading,
    legacyBatchStyle,
    setLegacyBatchStyle,
    legacyBatchPages,
    setLegacyBatchPages,
    batchResult,
    setBatchResult,
  };
}
