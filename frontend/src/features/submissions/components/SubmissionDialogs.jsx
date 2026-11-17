import SubmissionDetail from "./SubmissionDetail";
import { Modal, Button, Typography, Input } from "antd";
import {
  getStudentSubmissionCapabilities,
  canStaffDeleteSubmission,
} from "../model/access.js";
import ReviewWorkspace from "../workflow/ReviewWorkspace.jsx";
import SignatureStylePicker from "../workflow/SignatureStylePicker.jsx";
import BatchSigningResultDialog from "./BatchSigningResultDialog.jsx";
const { Paragraph } = Typography;
const { TextArea } = Input;
import { useSubmissions } from "../SubmissionContext.jsx";

export default function SubmissionDialogs({
  administration,
  formFieldsPanel,
  archivePanel,
} = {}) {
  const {
    studentDetailRecord,
    t,
    setStudentDetailRecord,
    auth,
    studentSubmissions,
    loadSubmissionIntoForm,
    isSubmittingSubmission,
    handleSubmitDraftFromDetail,
    isDeletingSubmission,
    promptDeleteSubmission,
    reviewerDetailRecord,
    setReviewerDetailRecord,
    configurableFormFields,
    reviewActionLoadingId,
    openRejectModal,
    submitReviewAction,
    staffDetailRecord,
    setStaffDetailRecord,
    isAdminActor,
    handleAdminEditSubmission,
    promptStaffDeleteSubmission,
    loadStaffSubmissions,
    loadLibraryQueue,
    libraryActionLoadingId,
    openLibraryRejectModal,
    submitLibraryAction,
    directorActionLoadingId,
    openDirectorReturnModal,
    submitStageAction,
    requestDirectorArchive,
    rejectModalOpen,
    confirmReject,
    setRejectModalOpen,
    setRejectTargetId,
    setRejectReason,
    rejectReason,
    libraryRejectModalOpen,
    confirmLibraryReject,
    setLibraryRejectModalOpen,
    setLibraryRejectTargetId,
    setLibraryRejectReason,
    libraryRejectReason,
    directorReturnModalOpen,
    confirmDirectorReturn,
    setDirectorReturnModalOpen,
    setDirectorReturnTargetId,
    setDirectorReturnReason,
    directorReturnReason,
    adminRejectModalOpen,
    adminIntakeActionLoadingId,
    confirmAdminReject,
    setAdminRejectModalOpen,
    setAdminRejectTargetId,
    setAdminRejectReason,
    adminRejectReason,
    submitAdminIntakeAction,
    openAdminRejectModal,
  } = useSubmissions();
  // Director (or admin acting at the final step) picks the visible style before archiving.
  const showSignatureTools = (record) =>
    ["director", "admin"].includes(auth.user.role) &&
    (record.status || record.submission_status) !== "archived";
  return (
    <>
      <Modal
        title={
          studentDetailRecord
            ? t("Thesis detail: {{title}}", {
                title:
                  studentDetailRecord.title_en || studentDetailRecord.title,
              })
            : t("Thesis detail")
        }
        open={Boolean(studentDetailRecord)}
        onCancel={() => setStudentDetailRecord(null)}
        footer={
          studentDetailRecord
            ? (() => {
                const caps = getStudentSubmissionCapabilities(
                  studentDetailRecord,
                  auth?.user?.id,
                  studentSubmissions,
                );
                const actions = [];
                if (caps.canEdit) {
                  actions.push(
                    <Button
                      key="edit"
                      onClick={() => {
                        const record = studentDetailRecord;
                        setStudentDetailRecord(null);
                        void loadSubmissionIntoForm(record);
                      }}
                    >
                      {t("Edit")}
                    </Button>,
                  );
                }
                if (caps.canSubmit && studentDetailRecord.status === "draft") {
                  actions.push(
                    <Button
                      key="submit"
                      type="primary"
                      loading={isSubmittingSubmission}
                      onClick={() =>
                        void handleSubmitDraftFromDetail(studentDetailRecord)
                      }
                    >
                      {t("Submit")}
                    </Button>,
                  );
                }
                if (caps.canDelete) {
                  actions.push(
                    <Button
                      key="delete"
                      danger
                      loading={isDeletingSubmission}
                      onClick={() =>
                        promptDeleteSubmission(studentDetailRecord)
                      }
                    >
                      {t("Delete")}
                    </Button>,
                  );
                }
                actions.push(
                  <Button
                    key="close"
                    onClick={() => setStudentDetailRecord(null)}
                  >
                    {t("Close")}
                  </Button>,
                );
                return actions;
              })()
            : null
        }
        width={820}
        destroyOnClose
      >
        {studentDetailRecord ? (
          <SubmissionDetail record={studentDetailRecord} />
        ) : null}
      </Modal>
      <Modal
        title={t("Submission details")}
        open={Boolean(reviewerDetailRecord)}
        onCancel={() => setReviewerDetailRecord(null)}
        footer={null}
        width={1240}
        destroyOnClose
      >
        {reviewerDetailRecord && (
          <ReviewWorkspace
            key={reviewerDetailRecord.id}
            submission={reviewerDetailRecord}
            auth={auth}
            fields={configurableFormFields}
            actions={
              reviewerDetailRecord.my_decision === "pending" &&
              reviewerDetailRecord.current_step_role === "reviewer" ? (
                <>
                  <Button
                    danger
                    disabled={Boolean(reviewActionLoadingId)}
                    onClick={() => openRejectModal(reviewerDetailRecord.id)}
                  >
                    {t("Reject")}
                  </Button>
                  <Button
                    type="primary"
                    loading={reviewActionLoadingId === reviewerDetailRecord.id}
                    onClick={() =>
                      submitReviewAction(reviewerDetailRecord.id, "approve")
                    }
                  >
                    {t("Accept")}
                  </Button>
                </>
              ) : null
            }
          />
        )}
      </Modal>
      <Modal
        title={t("Submission details")}
        open={Boolean(staffDetailRecord)}
        onCancel={() => setStaffDetailRecord(null)}
        footer={null}
        width={1240}
        destroyOnClose
      >
        {staffDetailRecord && (
          <ReviewWorkspace
            key={staffDetailRecord.id}
            submission={staffDetailRecord}
            auth={auth}
            fields={configurableFormFields}
            extraActions={
              <>
                {isAdminActor && (
                  <Button
                    onClick={() =>
                      void handleAdminEditSubmission(staffDetailRecord)
                    }
                  >
                    {t("Edit")}
                  </Button>
                )}
                {canStaffDeleteSubmission(auth.user.role) && (
                  <Button
                    danger
                    loading={isDeletingSubmission}
                    onClick={() =>
                      promptStaffDeleteSubmission(staffDetailRecord)
                    }
                  >
                    {t("Delete")}
                  </Button>
                )}
              </>
            }
            onSaved={(updated) => {
              setStaffDetailRecord(updated);
              void loadStaffSubmissions();
              if (auth.user.role === "library_staff") void loadLibraryQueue();
            }}
            signatureTools={
              showSignatureTools(staffDetailRecord) ? (
                <SignatureStylePicker
                  submissionId={staffDetailRecord.id}
                  files={staffDetailRecord.files || []}
                  token={auth.token}
                />
              ) : null
            }
            actions={
              isAdminActor &&
              staffDetailRecord.current_step_role &&
              ["reviewing", "approved"].includes(
                staffDetailRecord.status || staffDetailRecord.submission_status,
              ) ? (
                <>
                  <Button
                    danger
                    disabled={Boolean(adminIntakeActionLoadingId)}
                    onClick={() => openAdminRejectModal(staffDetailRecord.id)}
                  >
                    {t("Reject")}
                  </Button>
                  <Button
                    type="primary"
                    loading={adminIntakeActionLoadingId === staffDetailRecord.id}
                    onClick={() =>
                      submitAdminIntakeAction(
                        staffDetailRecord.id,
                        staffDetailRecord.current_step_role === "director" &&
                          staffDetailRecord.current_step_is_last
                          ? "archive"
                          : "approve",
                      )
                    }
                  >
                    {staffDetailRecord.current_step_role === "director" &&
                    staffDetailRecord.current_step_is_last
                      ? t("Archive & sign")
                      : t("Approve")}
                  </Button>
                </>
              ) : staffDetailRecord.current_step_role === auth?.user.role &&
                ["reviewing", "approved"].includes(
                  staffDetailRecord.status ||
                    staffDetailRecord.submission_status,
                ) ? (
                <>
                  {auth.user.role === "library_staff" ? (
                    <>
                      <Button
                        danger
                        disabled={Boolean(libraryActionLoadingId)}
                        onClick={() =>
                          openLibraryRejectModal(staffDetailRecord.id)
                        }
                      >
                        {t("Reject")}
                      </Button>
                      <Button
                        type="primary"
                        loading={
                          libraryActionLoadingId === staffDetailRecord.id
                        }
                        onClick={() =>
                          submitLibraryAction(staffDetailRecord.id, "approve")
                        }
                      >
                        {t("Accept")}
                      </Button>
                    </>
                  ) : auth.user.role === "director" ? (
                    <>
                      <Button
                        disabled={Boolean(directorActionLoadingId)}
                        onClick={() =>
                          openDirectorReturnModal(staffDetailRecord.id)
                        }
                      >
                        {t("Return to Editor")}
                      </Button>
                      <Button
                        type="primary"
                        loading={
                          directorActionLoadingId === staffDetailRecord.id
                        }
                        onClick={() =>
                          staffDetailRecord.current_step_is_last === false
                            ? submitStageAction(
                                "director-action",
                                staffDetailRecord.id,
                                "approve",
                                undefined,
                                t("Approved"),
                              )
                            : requestDirectorArchive(staffDetailRecord.id)
                        }
                      >
                        {t(
                          staffDetailRecord.current_step_is_last === false
                            ? "Accept"
                            : "Commit to Archive",
                        )}
                      </Button>
                    </>
                  ) : null}
                </>
              ) : null
            }
          />
        )}
      </Modal>
      <Modal
        title={t("Reject thesis")}
        open={rejectModalOpen}
        confirmLoading={Boolean(reviewActionLoadingId)}
        cancelButtonProps={{ disabled: Boolean(reviewActionLoadingId) }}
        closable={!reviewActionLoadingId}
        maskClosable={!reviewActionLoadingId}
        onOk={confirmReject}
        onCancel={() => {
          setRejectModalOpen(false);
          setRejectTargetId(null);
          setRejectReason("");
        }}
        okText={t("Reject")}
        okButtonProps={{ danger: true, "aria-label": t("Reject") }}
      >
        <Paragraph type="secondary">
          {t("Please provide a clear reason for rejection.")}
        </Paragraph>
        <TextArea
          aria-label={t("Reason")}
          disabled={Boolean(reviewActionLoadingId)}
          rows={4}
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
        />
      </Modal>
      <Modal
        title={t("Library intake reject")}
        open={libraryRejectModalOpen}
        confirmLoading={Boolean(libraryActionLoadingId)}
        cancelButtonProps={{ disabled: Boolean(libraryActionLoadingId) }}
        closable={!libraryActionLoadingId}
        maskClosable={!libraryActionLoadingId}
        onOk={confirmLibraryReject}
        onCancel={() => {
          setLibraryRejectModalOpen(false);
          setLibraryRejectTargetId(null);
          setLibraryRejectReason("");
        }}
        okText={t("Reject")}
        okButtonProps={{ danger: true, "aria-label": t("Reject") }}
      >
        <Paragraph type="secondary">
          {t("Please provide a clear reason for rejection.")}
        </Paragraph>
        <TextArea
          aria-label={t("Reason")}
          disabled={Boolean(libraryActionLoadingId)}
          rows={4}
          value={libraryRejectReason}
          onChange={(event) => setLibraryRejectReason(event.target.value)}
        />
      </Modal>
      <Modal
        title={t("Return to Editor")}
        open={directorReturnModalOpen}
        confirmLoading={Boolean(directorActionLoadingId)}
        cancelButtonProps={{ disabled: Boolean(directorActionLoadingId) }}
        closable={!directorActionLoadingId}
        maskClosable={!directorActionLoadingId}
        onOk={confirmDirectorReturn}
        onCancel={() => {
          setDirectorReturnModalOpen(false);
          setDirectorReturnTargetId(null);
          setDirectorReturnReason("");
        }}
        okText={t("Return to Editor")}
        okButtonProps={{ "aria-label": t("Return to Editor") }}
      >
        <Paragraph type="secondary">
          {t(
            "Explain what the Editor needs to correct. Academic approvals will be preserved.",
          )}
        </Paragraph>
        <TextArea
          aria-label={t("Reason")}
          disabled={Boolean(directorActionLoadingId)}
          rows={4}
          value={directorReturnReason}
          onChange={(event) => setDirectorReturnReason(event.target.value)}
        />
      </Modal>
      <Modal
        title={t("Reject thesis (admin intake)")}
        open={adminRejectModalOpen}
        confirmLoading={Boolean(adminIntakeActionLoadingId)}
        cancelButtonProps={{ disabled: Boolean(adminIntakeActionLoadingId) }}
        closable={!adminIntakeActionLoadingId}
        maskClosable={!adminIntakeActionLoadingId}
        onOk={confirmAdminReject}
        onCancel={() => {
          setAdminRejectModalOpen(false);
          setAdminRejectTargetId(null);
          setAdminRejectReason("");
        }}
        okText={t("Reject")}
        okButtonProps={{ danger: true, "aria-label": t("Reject") }}
      >
        <Paragraph type="secondary">
          {t("Please provide a clear reason for rejection.")}
        </Paragraph>
        <TextArea
          aria-label={t("Reason")}
          disabled={Boolean(adminIntakeActionLoadingId)}
          rows={4}
          value={adminRejectReason}
          onChange={(event) => setAdminRejectReason(event.target.value)}
        />
      </Modal>
      <BatchSigningResultDialog />
    </>
  );
}
