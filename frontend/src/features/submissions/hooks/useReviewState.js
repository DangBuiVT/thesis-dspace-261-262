import { useRef, useState } from "react";

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
  };
}
