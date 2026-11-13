import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  THESIS_METADATA_GROUP_BY,
  THESIS_METADATA_SELECT,
} from "../submissions/submission-metadata";
import { WorkflowMailService } from "../mail/workflow-mail.service";
import { createPgPool } from "../users/db-pool";
import type { JwtPayload } from "../auth/jwt.strategy";
import { GroupsService } from "../workflow/groups.service";
import { WorkflowService } from "../workflow/workflow.service";
import { ReviewActionDto } from "./dto/review-action.dto";
import { ArchiveSigningService, resolveSignatureStyle, signedEvidence } from "../signing/archive-signing.service";
import { PdfStampingService, SignatureStyleType } from "./pdf-stamping.service";
import {
  SubmissionStatus,
  ReviewDecision,
  ReviewActionType,
  WorkflowRole,
  WorkflowEventType,
  DSpacePublishStatus,
} from "../common/constants/workflow.constants";

/* export const SUBMISSION_CONFIG = {
  DRAFT_STATE: SubmissionStatus.DRAFT,
  REVIEWING_STATE: SubmissionStatus.REVIEWING,
  APPROVED_STATE: SubmissionStatus.APPROVED,
  REJECTED_STATE: SubmissionStatus.REJECTED,
  ARCHIVED_STATE: SubmissionStatus.ARCHIVED
} as const */

@Injectable()
export class ReviewsService {
  private readonly db = createPgPool();

  constructor(
    private readonly workflowMail: WorkflowMailService,
    private readonly workflow: WorkflowService,
    private readonly groups: GroupsService,
    private readonly pdfStamping: PdfStampingService,
    private readonly archiveSigning: ArchiveSigningService,
  ) { }

  private libraryIntakeReadyClause() {
    return `s.status = 'reviewing'
      AND EXISTS (SELECT 1 FROM reviews r0 WHERE r0.submission_id = s.id)
      AND NOT EXISTS (
        SELECT 1 FROM reviews r1
        WHERE r1.submission_id = s.id AND r1.decision = 'pending'
      )
      AND NOT EXISTS (
        SELECT 1 FROM reviews r2
        WHERE r2.submission_id = s.id AND r2.decision = 'reject'
      )`;
  }
  async assertFacultyScope(user: JwtPayload, submissionId: string) {
    if (user.role === WorkflowRole.ADMIN) return;

    const res = await this.db.query(
      `SELECT sp.faculty_id, u.faculty_id AS user_faculty_id
      FROM submissions s
      JOIN submission_periods sp ON s.submission_period_id = sp.id
      JOIN users u ON u.username = $1
      WHERE s.id = $2::uuid`,
      [user.username, submissionId],
    );

    const record = res.rows[0];
    if (!record) {
      throw new NotFoundException("Submission or Period not found");
    }
    if (
      record.faculty_id &&
      record.user_faculty_id &&
      record.faculty_id !== record.user_faculty_id
    ) {
      throw new ForbiddenException(
        "You are not authorized to review submissions outside your faculty/collection.",
      );
    }
  }
  async getMyQueue(user: JwtPayload) {
    await this.workflow.backfillOpenSubmissions();

    const result = await this.db.query(
      `SELECT s.id,
              s.title,
              s.abstract,
              s.keywords,
              s.university_name,
              s.author,
              s.reviewer,
              sem.faculty_id,
              COALESCE(NULLIF(s.faculty_name, ''), f.name) AS faculty_name,
              COALESCE(NULLIF(s.semester_name, ''), sem.name) AS semester_name,
              s.submission_period_id,
              sp.name AS period_name,
              sp.semester_id,
              ${THESIS_METADATA_SELECT},
              s.student_id AS submitter_id,
              COALESCE(su.display_name, su.username) AS submitter,
              su.username AS submitter_username,
              s.status AS submission_status,
              s.created_at,
              r.decision AS my_decision,
              r.comment AS my_comment,
              r.decided_at AS my_decided_at,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', sf.id,
                    'fileName', sf.file_name,
                    'fileUrl', sf.file_url,
                    'fileType', sf.file_type
                  )
                ) FILTER (WHERE sf.id IS NOT NULL),
                '[]'::json
              ) AS files
       FROM reviews r
       JOIN submissions s ON s.id = r.submission_id
       LEFT JOIN users su ON su.username = s.student_id
       LEFT JOIN submission_periods sp ON sp.id = s.submission_period_id
       LEFT JOIN semesters sem ON sem.id = sp.semester_id
       LEFT JOIN faculties f ON f.id = sem.faculty_id
       LEFT JOIN submission_files sf ON sf.submission_id = s.id
       WHERE r.reviewer_id = $1
         AND (
           s.status = 'reviewing'
           OR (s.status = 'rejected' AND r.decision = 'reject')
         )
         AND ${this.groups.reviewerCanSeeStudentSql("$1")}
       GROUP BY s.id,
                s.title,
                s.abstract,
                s.keywords,
                s.university_name,
                s.author,
                s.reviewer,
                sem.faculty_id,
                s.faculty_name,
                f.name,
                s.semester_name,
                sem.name,
                s.submission_period_id,
                sp.name,
                sp.semester_id,
                ${THESIS_METADATA_GROUP_BY},
                s.student_id,
                su.display_name,
                su.username,
                s.status,
                s.created_at,
                r.decision,
                r.comment,
                r.decided_at
       ORDER BY s.created_at DESC`,
      [user.sub],
    );

    return this.workflow.annotate(result.rows);
  }

  async act(user: JwtPayload, dto: ReviewActionDto) {
    if (dto.action === ReviewActionType.ARCHIVE) {
      throw new BadRequestException("Reviewers cannot archive submissions");
    }

    if (dto.action === ReviewActionType.RETURN_TO_EDITOR) {
      throw new BadRequestException("Only the director can return a submission to Editor");
    }

    await this.workflow.assertCurrentRole(
      dto.submissionId,
      WorkflowRole.REVIEWER,
    );
    const assignment = await this.db.query<{
      decision: string;
      submission_status: string;
      student_id: string;
    }>(
      `SELECT r.decision, s.status AS submission_status, s.student_id
       FROM reviews r
       JOIN submissions s ON s.id = r.submission_id
       WHERE r.submission_id = $1 AND r.reviewer_id = $2
       LIMIT 1`,
      [dto.submissionId, user.sub],
    );
    const row = assignment.rows[0];
    if (!row) {
      throw new NotFoundException("Submission not assigned to this reviewer");
    }
    if (row.decision !== ReviewDecision.PENDING) {
      throw new BadRequestException("Review already completed");
    }
    if (row.submission_status !== SubmissionStatus.REVIEWING) {
      throw new BadRequestException("Submission is not in reviewer stage");
    }
    await this.groups.assertReviewerMayAct(user.sub, row.student_id);

    if (dto.action === ReviewActionType.REJECT) {
      if (!dto.comment || !dto.comment.trim()) {
        throw new BadRequestException("Reject reason is required");
      }
    }

    const reviewDecision =
      dto.action === ReviewActionType.APPROVE
        ? ReviewDecision.APPROVED
        : ReviewDecision.REJECT;
    let allReviewersApproved = false;
    let enteredRole: string | null = null;
    const rejectReason =
      dto.action === ReviewActionType.REJECT ? dto.comment?.trim() || "" : "";

    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE reviews
         SET decision = $1,
             comment = $2,
             decided_at = NOW()
         WHERE submission_id = $3::uuid AND reviewer_id = $4`,
        [
          reviewDecision,
          dto.action === ReviewActionType.REJECT ? rejectReason || null : null,
          dto.submissionId,
          user.sub,
        ],
      );
      await client.query(
        `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
         VALUES ($1, $2, $3, 'reviewer', $4, $5::jsonb)`,
        [
          randomUUID(),
          dto.submissionId,
          user.sub,
          dto.action === ReviewActionType.APPROVE
            ? WorkflowEventType.REVIEWER_APPROVED
            : WorkflowEventType.REVIEWER_REJECTED,
          JSON.stringify({
            comment:
              dto.action === ReviewActionType.REJECT
                ? rejectReason || null
                : null,
          }),
        ],
      );

      if (dto.action === ReviewActionType.REJECT) {
        await client.query(
          `UPDATE submissions SET status = $1 WHERE id = $2::uuid`,
          [SubmissionStatus.REJECTED, dto.submissionId],
        );
        await client.query(
          `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
           VALUES ($1, $2, $3, 'system', 'status_changed', $4::jsonb)`,
          [
            randomUUID(),
            dto.submissionId,
            user.sub,
            JSON.stringify({
              from: row.submission_status,
              to: SubmissionStatus.REJECTED,
              reason: WorkflowEventType.REVIEWER_REJECTED,
            }),
          ],
        );
      } else {
        const pending = await client.query(
          `SELECT COUNT(*)::int AS cnt
           FROM reviews
           WHERE submission_id = $1 AND decision = 'pending'`,
          [dto.submissionId],
        );
        const pendingCount = pending.rows[0]?.cnt ?? 0;
        if (pendingCount === 0) {
          allReviewersApproved = true;
          const advanced = await this.workflow.advance(
            client,
            dto.submissionId,
          );
          enteredRole = advanced.enteredRole;
          await client.query(
            `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
             VALUES ($1, $2, $3, 'system', 'status_changed', $4::jsonb)`,
            [
              randomUUID(),
              dto.submissionId,
              user.sub,
              JSON.stringify({
                from: advanced.fromStatus as SubmissionStatus,
                to: advanced.toStatus as SubmissionStatus,
                reason: "all_reviewers_approved",
              }),
            ],
          );
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const actorName = user.displayName || user.username;

    if (dto.action === "reject") {
      this.workflowMail.notifySafely("student_reviewer_rejected", () =>
        this.workflowMail.notifyStudentOnReviewerDecision(
          dto.submissionId,
          SubmissionStatus.REJECTED,
          actorName,
          rejectReason,
        ),
      );
    } else {
      this.workflowMail.notifySafely("student_reviewer_approved", () =>
        this.workflowMail.notifyStudentOnReviewerDecision(
          dto.submissionId,
          SubmissionStatus.APPROVED,
          actorName,
        ),
      );
      if (allReviewersApproved) {
        if (enteredRole === WorkflowRole.LIBRARY_STAFF) {
          this.workflowMail.notifySafely("library_review", () =>
            this.workflowMail.notifyLibraryOnAllReviewersApproved(
              dto.submissionId,
            ),
          );
        }
        this.workflowMail.notifySafely("student_all_reviewers_approved", () =>
          this.workflowMail.notifyStudentOnAllReviewersApproved(
            dto.submissionId,
          ),
        );
      }
    }

    return { ok: true };
  }

  private async getQueueRows(whereClause: string, params: unknown[] = []) {
    const result = await this.db.query(
      `SELECT s.id,
              s.title,
              s.abstract,
              s.keywords,
              s.university_name,
              s.author,
              s.reviewer,
              sem.faculty_id,
              COALESCE(NULLIF(s.faculty_name, ''), f.name) AS faculty_name,
              COALESCE(NULLIF(s.semester_name, ''), sem.name) AS semester_name,
              s.submission_period_id,
              sp.name AS period_name,
              sp.semester_id,
              ${THESIS_METADATA_SELECT},
              s.student_id AS submitter_id,
              COALESCE(su.display_name, su.username) AS submitter,
              su.username AS submitter_username,
              s.status AS submission_status,
              s.created_at,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', sf.id,
                    'fileName', sf.file_name,
                    'fileUrl', sf.file_url,
                    'fileType', sf.file_type
                  )
                ) FILTER (WHERE sf.id IS NOT NULL),
                '[]'::json
              ) AS files
       FROM submissions s
       LEFT JOIN users su ON su.username = s.student_id
       LEFT JOIN submission_periods sp ON sp.id = s.submission_period_id
       LEFT JOIN semesters sem ON sem.id = sp.semester_id
       LEFT JOIN faculties f ON f.id = sem.faculty_id
       LEFT JOIN submission_files sf ON sf.submission_id = s.id
       WHERE ${whereClause}
       GROUP BY s.id,
                s.title,
                s.abstract,
                s.keywords,
                s.university_name,
                s.author,
                s.reviewer,
                sem.faculty_id,
                s.faculty_name,
                f.name,
                s.semester_name,
                sem.name,
                s.submission_period_id,
                sp.name,
                sp.semester_id,
                ${THESIS_METADATA_GROUP_BY},
                s.student_id,
                su.display_name,
                su.username,
                s.status,
                s.created_at
       ORDER BY s.created_at DESC`,
      params,
    );
    return this.workflow.annotate(result.rows);
  }

  async getLibraryQueue(user: JwtPayload) {
    await this.workflow.backfillOpenSubmissions();
    return this.getQueueRows(
      `s.status = 'reviewing' AND ${this.workflow.currentStepSql(WorkflowRole.LIBRARY_STAFF)}`,
    );
  }

  async getDirectorQueue(user: JwtPayload) {
    await this.workflow.backfillOpenSubmissions();
    return this.getQueueRows(
      `s.status IN ('reviewing', 'approved') AND ${this.workflow.currentStepSql(WorkflowRole.DIRECTOR)}`,
    );
  }

  private async assertLibraryIntakeReady(submissionId: string) {
    const result = await this.db.query(
      `SELECT 1
       FROM submissions s
       WHERE s.id = $1::uuid AND ${this.libraryIntakeReadyClause()}
       LIMIT 1`,
      [submissionId],
    );
    if (!result.rows[0]) {
      throw new BadRequestException(
        "Submission is not ready for library intake",
      );
    }
  }

  async libraryAct(user: JwtPayload, dto: ReviewActionDto) {
    if (dto.action === ReviewActionType.ARCHIVE) {
      throw new BadRequestException("Library staff cannot archive submissions");
    }

    if (dto.action === ReviewActionType.RETURN_TO_EDITOR) {
      throw new BadRequestException("Only the director can return a submission to Editor");
    }

    const step = await this.workflow.assertCurrentRole(
      dto.submissionId,
      WorkflowRole.LIBRARY_STAFF,
    );
    if (step.status !== SubmissionStatus.REVIEWING) {
      throw new BadRequestException("Submission is not in reviewing stage");
    }

    if (
      dto.action === ReviewActionType.REJECT &&
      (!dto.comment || !dto.comment.trim())
    ) {
      throw new BadRequestException("Reject reason is required");
    }

    let nextStatus =
      dto.action === ReviewActionType.APPROVE
        ? SubmissionStatus.APPROVED
        : SubmissionStatus.REJECTED;
    let enteredRole: string | null = null;
    const rejectReason =
      dto.action === ReviewActionType.REJECT ? dto.comment?.trim() || "" : "";
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<{ status: string; current_step: number; active_role: string }>(
        `SELECT s.status, s.current_step, ss.role AS active_role FROM submissions s
         LEFT JOIN submission_steps ss ON ss.submission_id = s.id AND ss.sort_order = s.current_step
         WHERE s.id = $1::uuid FOR UPDATE OF s`,
        [dto.submissionId],
      );
      const row = current.rows[0];
      if (!row || row.status !== SubmissionStatus.REVIEWING || row.active_role !== WorkflowRole.LIBRARY_STAFF) {
        throw new BadRequestException("Submission is not in reviewing stage");
      }

      if (dto.action === ReviewActionType.APPROVE) {
        const advanced = await this.workflow.advance(client, dto.submissionId);
        nextStatus = advanced.toStatus as SubmissionStatus;
        enteredRole = advanced.enteredRole;
      } else {
        await client.query(
          `UPDATE submissions SET status = 'rejected' WHERE id = $1::uuid`,
          [dto.submissionId],
        );
      }
      await client.query(
        `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
         VALUES ($1, $2, $3, 'library_staff', $4, $5::jsonb)`,
        [
          randomUUID(),
          dto.submissionId,
          user.sub,
          dto.action === ReviewActionType.APPROVE
            ? "library_staff_approved"
            : "library_staff_rejected",
          JSON.stringify({
            comment:
              dto.action === ReviewActionType.REJECT
                ? rejectReason || null
                : null,
          }),
        ],
      );
      await client.query(
        `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
         VALUES ($1, $2, $3, 'system', 'status_changed', $4::jsonb)`,
        [
          randomUUID(),
          dto.submissionId,
          user.sub,
          JSON.stringify({
            from: row.status,
            to: nextStatus,
            reason:
              dto.action === ReviewActionType.APPROVE
                ? WorkflowEventType.LIBRARY_STAFF_APPROVED
                : WorkflowEventType.LIBRARY_STAFF_REJECTED,
          }),
        ],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const actorName = user.displayName || user.username;
    if (dto.action === ReviewActionType.APPROVE) {
      if (enteredRole === WorkflowRole.DIRECTOR) {
        this.workflowMail.notifySafely("director_review", () =>
          this.workflowMail.notifyDirectorsOnLibraryApproved(dto.submissionId),
        );
      }
      this.workflowMail.notifySafely("student_library_approved", () =>
        this.workflowMail.notifyStudentOnLibraryDecision(
          dto.submissionId,
          SubmissionStatus.APPROVED,
          actorName,
        ),
      );
    } else {
      this.workflowMail.notifySafely("student_library_rejected", () =>
        this.workflowMail.notifyStudentOnLibraryDecision(
          dto.submissionId,
          SubmissionStatus.REJECTED,
          actorName,
          rejectReason,
        ),
      );
    }

    return { ok: true };
  }

  async directorAct(user: JwtPayload, dto: ReviewActionDto) {
    if (
      dto.action !== ReviewActionType.ARCHIVE &&
      dto.action !== ReviewActionType.RETURN_TO_EDITOR &&
      dto.action !== ReviewActionType.APPROVE
    ) {
      throw new BadRequestException(
        "Director can approve, archive, or return to Editor",
      );
    }
    const step = await this.workflow.assertCurrentRole(
      dto.submissionId,
      WorkflowRole.DIRECTOR,
    );
    if (dto.action === ReviewActionType.ARCHIVE && !step.isLast) {
      throw new BadRequestException("Only the final director step can archive");
    }
    if (dto.action === ReviewActionType.APPROVE && step.isLast) {
      throw new BadRequestException(
        "The final director step is archived, not approved",
      );
    }

    const actorName = user.displayName || user.username;
    const returnReason = dto.action === ReviewActionType.RETURN_TO_EDITOR ? dto.comment?.trim() || "" : "";
    if (dto.action === ReviewActionType.RETURN_TO_EDITOR && !returnReason) {
      throw new BadRequestException("Return reason is required");
    }

    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<{ status: string; current_step: number; active_role: string }>(
        `SELECT s.status, s.current_step, ss.role AS active_role FROM submissions s
         LEFT JOIN submission_steps ss ON ss.submission_id = s.id AND ss.sort_order = s.current_step
         WHERE s.id = $1::uuid FOR UPDATE OF s`,
        [dto.submissionId],
      );
      const row = current.rows[0];
      if (!row) {
        throw new NotFoundException("Submission not found");
      }
      if (row.active_role !== WorkflowRole.DIRECTOR || (
        row.status !== SubmissionStatus.APPROVED &&
        row.status !== SubmissionStatus.REVIEWING
      )) {
        throw new BadRequestException(
          "This submission is not waiting for the director",
        );
      }

      if (
        dto.action === ReviewActionType.ARCHIVE ||
        dto.action === ReviewActionType.APPROVE
      ) {
        const advanced = await this.workflow.advance(client, dto.submissionId);
        if (dto.action === ReviewActionType.ARCHIVE && !advanced.archived) {
          throw new BadRequestException(
            "Only the final director step can archive",
          );
        }
        const eventType =
          dto.action === ReviewActionType.ARCHIVE
            ? WorkflowEventType.DIRECTOR_ARCHIVED
            : "director_approved";
        await client.query(
          `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
           VALUES ($1, $2, $3, 'director', $4, $5::jsonb)`,
          [
            randomUUID(),
            dto.submissionId,
            user.sub,
            eventType,
            JSON.stringify({ comment: dto.comment?.trim() || null }),
          ],
        );

        if (dto.action === ReviewActionType.ARCHIVE) {
          // Tính toán SHA-256 Hash toàn vẹn cho chữ ký số lưu chiểu
          const archived = await this.archiveSigning.signArchivedPdf({
            submissionId: dto.submissionId,
            actorSub: user.sub,
            actorName: user.displayName || user.username || "Thư viện",
            style: resolveSignatureStyle(dto.signatureStyle || (dto.metadata as any)?.signatureStyle || (await this.archiveSigning.defaultSignatureStyle())),
            watermarkPages: dto.watermarkPages || (dto.metadata as any)?.watermarkPages || (await this.db.query<{ value: string }>("SELECT value FROM system_settings WHERE key = 'signature_watermark_pages' LIMIT 1")).rows[0]?.value || "10",
          });
          const evidence = archived ? signedEvidence(archived) : null;

          await client.query(
            `UPDATE submissions
             SET dspace_publish_status = COALESCE(NULLIF(dspace_publish_status, ''), 'pending')
             WHERE id = $1::uuid`,
            [dto.submissionId]
          );

          if (evidence) await client.query(
            `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
            VALUES ($1, $2, $3, 'director', 'digital_signature_signed', $4::jsonb)`,
            [
              randomUUID(),
              dto.submissionId,
              user.sub,
              JSON.stringify({
                is_signed: true,
                ...evidence,
                institution_text: "ĐẠI HỌC BÁCH KHOA THÀNH PHỐ HỒ CHÍ MINH - HCMUT",
                signed_pages_scope: "Tất cả các trang (100% pages)",
                signer_name: user.displayName || user.username || "ThS. Lê Hoàng (Thư viện)",
                signed_at: evidence?.signed_at ?? null,
                signature_style: dto.signatureStyle || (dto.metadata as any)?.signatureStyle || "margin_strips",
                watermark_pages: dto.watermarkPages || (dto.metadata as any)?.watermarkPages || (await this.db.query<{ value: string }>("SELECT value FROM system_settings WHERE key = 'signature_watermark_pages' LIMIT 1")).rows[0]?.value || "10",
                signature_style_name: (dto.signatureStyle === "diagonal" || (dto.metadata as any)?.signatureStyle === "diagonal") 
                  ? "Chữ ký số chéo trang" 
                  : ((dto.signatureStyle === "invisible" || (dto.metadata as any)?.signatureStyle === "invisible") 
                    ? "Không chữ ký số (Vô hình)" 
                    : "Chữ ký số 2 bên lề")
              })
            ]
          );
        }
        await client.query(
          `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
           VALUES ($1, $2, $3, 'system', 'status_changed', $4::jsonb)`,
          [
            randomUUID(),
            dto.submissionId,
            user.sub,
            JSON.stringify({
              from: advanced.fromStatus as SubmissionStatus,
              to: advanced.toStatus as SubmissionStatus,
              reason: eventType,
            }),
          ],
        );
      } else {
        const previous = await client.query<{ sort_order: number }>(
          `SELECT sort_order FROM submission_steps WHERE submission_id = $1::uuid
           AND sort_order < $2 AND role = 'library_staff' ORDER BY sort_order DESC LIMIT 1`,
          [dto.submissionId, row.current_step],
        );
        if (!previous.rows[0]) throw new BadRequestException("No previous Editor step is available");
        await client.query(
          `UPDATE submissions SET status = 'reviewing', current_step = $2 WHERE id = $1::uuid`,
          [dto.submissionId, previous.rows[0].sort_order],
        );
        await client.query(
          `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
           VALUES ($1, $2, $3, 'director', 'director_returned', $4::jsonb)`,
          [randomUUID(), dto.submissionId, user.sub, JSON.stringify({ comment: returnReason,
            fromStep: row.current_step, toStep: previous.rows[0].sort_order })],
        );
        await client.query(
          `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
           VALUES ($1, $2, $3, 'system', 'status_changed', $4::jsonb)`,
          [randomUUID(), dto.submissionId, user.sub, JSON.stringify({ from: row.status,
            to: SubmissionStatus.REVIEWING, reason: "director_returned" })],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    if (dto.action === ReviewActionType.APPROVE) {
      return { ok: true };
    }

    if (dto.action === ReviewActionType.ARCHIVE) {
      this.workflowMail.notifySafely("student_director_approved", () =>
        this.workflowMail.notifyStudentOnDirectorDecision(
          dto.submissionId,
          ReviewDecision.APPROVED,
          actorName,
        ),
      );
      return {
        ok: true,
        dspaceDeferred: true,
        message:
          "Archived to period. Push to DSpace later from Archive configuration.",
      };
    }

    this.workflowMail.notifySafely("library_director_returned", () =>
      this.workflowMail.notifyLibraryOnDirectorReturn(dto.submissionId, returnReason),
    );
    return { ok: true };
  }

  async getAdminIntakeQueue(user: JwtPayload) {
    if (user.role !== WorkflowRole.ADMIN) {
      throw new ForbiddenException();
    }
    await this.workflow.backfillOpenSubmissions();
    return this.getQueueRows(
      `s.status IN ('reviewing', 'approved')`
    );
  }

  async adminIntakeAct(user: JwtPayload, dto: ReviewActionDto) {
    if (user.role !== WorkflowRole.ADMIN) {
      throw new ForbiddenException();
    }
    await this.workflow.backfillOpenSubmissions();

    // Determine current active workflow step role for this submission
    const res = await this.db.query<{ role: WorkflowRole; is_last: boolean; status: string }>(
      `SELECT ss.role,
              ss.sort_order = (
                SELECT MAX(sort_order) FROM submission_steps sx WHERE sx.submission_id = s.id
              ) AS is_last,
              s.status
       FROM submissions s
       JOIN submission_steps ss ON ss.submission_id = s.id AND ss.sort_order = s.current_step
       WHERE s.id = $1::uuid
       LIMIT 1`,
      [dto.submissionId]
    );
    const currentStep = res.rows[0];
    if (!currentStep) {
      throw new NotFoundException("Submission or workflow step not found");
    }

    const currentRole = currentStep.role;
    const actorName = user.displayName || user.username || "Quản trị viên";
    const rejectReason =
      dto.action === ReviewActionType.REJECT ? dto.comment?.trim() || "" : "";

    if (dto.action === ReviewActionType.REJECT && !rejectReason) {
      throw new BadRequestException("Reject reason is required");
    }

    if (currentRole === WorkflowRole.REVIEWER) {
      if (dto.action === ReviewActionType.ARCHIVE) {
        throw new BadRequestException("Cannot archive at reviewer step");
      }

      const client = await this.db.connect();
      let allReviewersApproved = false;
      let enteredRole: string | null = null;
      try {
        await client.query("BEGIN");
        // Mark all reviews for this submission as approved or rejected by admin
        const reviewDecision =
          dto.action === ReviewActionType.APPROVE
            ? ReviewDecision.APPROVED
            : ReviewDecision.REJECT;

        await client.query(
          `UPDATE reviews
           SET decision = $1,
               comment = $2,
               decided_at = NOW()
           WHERE submission_id = $3::uuid`,
          [
            reviewDecision,
            dto.action === ReviewActionType.REJECT ? rejectReason || null : null,
            dto.submissionId,
          ]
        );

        await client.query(
          `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
           VALUES ($1, $2, $3, 'reviewer', $4, $5::jsonb)`,
          [
            randomUUID(),
            dto.submissionId,
            user.sub,
            dto.action === ReviewActionType.APPROVE
              ? WorkflowEventType.REVIEWER_APPROVED
              : WorkflowEventType.REVIEWER_REJECTED,
            JSON.stringify({
              admin_override: true,
              comment:
                dto.action === ReviewActionType.REJECT
                  ? rejectReason || null
                  : null,
            }),
          ]
        );

        if (dto.action === ReviewActionType.REJECT) {
          await client.query(
            `UPDATE submissions SET status = $1 WHERE id = $2::uuid`,
            [SubmissionStatus.REJECTED, dto.submissionId]
          );
          await client.query(
            `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
             VALUES ($1, $2, $3, 'system', 'status_changed', $4::jsonb)`,
            [
              randomUUID(),
              dto.submissionId,
              user.sub,
              JSON.stringify({
                from: currentStep.status,
                to: SubmissionStatus.REJECTED,
                reason: WorkflowEventType.REVIEWER_REJECTED,
              }),
            ]
          );
        } else {
          allReviewersApproved = true;
          const advanced = await this.workflow.advance(client, dto.submissionId);
          enteredRole = advanced.enteredRole;
          await client.query(
            `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
             VALUES ($1, $2, $3, 'system', 'status_changed', $4::jsonb)`,
            [
              randomUUID(),
              dto.submissionId,
              user.sub,
              JSON.stringify({
                from: advanced.fromStatus as SubmissionStatus,
                to: advanced.toStatus as SubmissionStatus,
                reason: "all_reviewers_approved_by_admin",
              }),
            ]
          );
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      if (dto.action === ReviewActionType.REJECT) {
        this.workflowMail.notifySafely("student_reviewer_rejected", () =>
          this.workflowMail.notifyStudentOnReviewerDecision(
            dto.submissionId,
            SubmissionStatus.REJECTED,
            actorName,
            rejectReason,
          )
        );
      } else {
        this.workflowMail.notifySafely("student_reviewer_approved", () =>
          this.workflowMail.notifyStudentOnReviewerDecision(
            dto.submissionId,
            SubmissionStatus.APPROVED,
            actorName,
          )
        );
        if (allReviewersApproved) {
          if (enteredRole === WorkflowRole.LIBRARY_STAFF) {
            this.workflowMail.notifySafely("library_review", () =>
              this.workflowMail.notifyLibraryOnAllReviewersApproved(dto.submissionId)
            );
          }
          this.workflowMail.notifySafely("student_all_reviewers_approved", () =>
            this.workflowMail.notifyStudentOnAllReviewersApproved(dto.submissionId)
          );
        }
      }
      return { ok: true };
    }

    if (currentRole === WorkflowRole.LIBRARY_STAFF) {
      if (dto.action === ReviewActionType.ARCHIVE) {
        throw new BadRequestException("Library staff stage cannot archive");
      }

      let nextStatus =
        dto.action === ReviewActionType.APPROVE
          ? SubmissionStatus.APPROVED
          : SubmissionStatus.REJECTED;
      let enteredRole: string | null = null;

      const client = await this.db.connect();
      try {
        await client.query("BEGIN");
        const current = await client.query<{ status: string }>(
          `SELECT status FROM submissions WHERE id = $1::uuid LIMIT 1 FOR UPDATE`,
          [dto.submissionId]
        );
        const row = current.rows[0];
        if (!row || row.status !== SubmissionStatus.REVIEWING) {
          throw new BadRequestException("Submission is not in reviewing stage");
        }

        if (dto.action === ReviewActionType.APPROVE) {
          const advanced = await this.workflow.advance(client, dto.submissionId);
          nextStatus = advanced.toStatus as SubmissionStatus;
          enteredRole = advanced.enteredRole;
        } else {
          await client.query(
            `UPDATE submissions SET status = 'rejected' WHERE id = $1::uuid`,
            [dto.submissionId]
          );
        }

        await client.query(
          `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
           VALUES ($1, $2, $3, 'library_staff', $4, $5::jsonb)`,
          [
            randomUUID(),
            dto.submissionId,
            user.sub,
            dto.action === ReviewActionType.APPROVE
              ? "library_staff_approved"
              : "library_staff_rejected",
            JSON.stringify({
              admin_override: true,
              comment:
                dto.action === ReviewActionType.REJECT
                  ? rejectReason || null
                  : null,
            }),
          ]
        );
        await client.query(
          `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
           VALUES ($1, $2, $3, 'system', 'status_changed', $4::jsonb)`,
          [
            randomUUID(),
            dto.submissionId,
            user.sub,
            JSON.stringify({
              from: row.status,
              to: nextStatus,
              reason:
                dto.action === ReviewActionType.APPROVE
                  ? WorkflowEventType.LIBRARY_STAFF_APPROVED
                  : WorkflowEventType.LIBRARY_STAFF_REJECTED,
            }),
          ]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      if (dto.action === ReviewActionType.APPROVE) {
        if (enteredRole === WorkflowRole.DIRECTOR) {
          this.workflowMail.notifySafely("director_review", () =>
            this.workflowMail.notifyDirectorsOnLibraryApproved(dto.submissionId)
          );
        }
        this.workflowMail.notifySafely("student_library_approved", () =>
          this.workflowMail.notifyStudentOnLibraryDecision(
            dto.submissionId,
            SubmissionStatus.APPROVED,
            actorName,
          )
        );
      } else {
        this.workflowMail.notifySafely("student_library_rejected", () =>
          this.workflowMail.notifyStudentOnLibraryDecision(
            dto.submissionId,
            SubmissionStatus.REJECTED,
            actorName,
            rejectReason,
          )
        );
      }
      return { ok: true };
    }

    if (currentRole === WorkflowRole.DIRECTOR) {
      if (
        dto.action !== ReviewActionType.ARCHIVE &&
        dto.action !== ReviewActionType.REJECT &&
        dto.action !== ReviewActionType.APPROVE
      ) {
        throw new BadRequestException(
          "Director step can approve, archive, or reject"
        );
      }
      if (dto.action === ReviewActionType.ARCHIVE && !currentStep.is_last) {
        throw new BadRequestException("Only the final director step can archive");
      }
      if (dto.action === ReviewActionType.APPROVE && currentStep.is_last) {
        throw new BadRequestException(
          "The final director step is archived, not approved"
        );
      }

      const client = await this.db.connect();
      try {
        await client.query("BEGIN");
        const current = await client.query<{ status: string }>(
          `SELECT status FROM submissions WHERE id = $1::uuid LIMIT 1 FOR UPDATE`,
          [dto.submissionId]
        );
        const row = current.rows[0];
        if (!row) {
          throw new NotFoundException("Submission not found");
        }

        if (
          dto.action === ReviewActionType.ARCHIVE ||
          dto.action === ReviewActionType.APPROVE
        ) {
          const advanced = await this.workflow.advance(client, dto.submissionId);
          if (dto.action === ReviewActionType.ARCHIVE && !advanced.archived) {
            throw new BadRequestException("Only final step can archive");
          }
          const eventType =
            dto.action === ReviewActionType.ARCHIVE
              ? WorkflowEventType.DIRECTOR_ARCHIVED
              : "director_approved";

          await client.query(
            `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
             VALUES ($1, $2, $3, 'director', $4, $5::jsonb)`,
            [
              randomUUID(),
              dto.submissionId,
              user.sub,
              eventType,
              JSON.stringify({
                admin_override: true,
                comment: dto.comment?.trim() || null,
              }),
            ]
          );

          if (dto.action === ReviewActionType.ARCHIVE) {
            const archived = await this.archiveSigning.signArchivedPdf({
              submissionId: dto.submissionId,
              actorSub: user.sub,
              actorName: user.displayName || user.username || "Thư viện",
              style: resolveSignatureStyle(dto.signatureStyle || (dto.metadata as any)?.signatureStyle || (await this.archiveSigning.defaultSignatureStyle())),
              watermarkPages: dto.watermarkPages || (dto.metadata as any)?.watermarkPages || (await this.db.query<{ value: string }>("SELECT value FROM system_settings WHERE key = 'signature_watermark_pages' LIMIT 1")).rows[0]?.value || "10",
            });
            const evidence = archived ? signedEvidence(archived) : null;

            await client.query(
              `UPDATE submissions
               SET dspace_publish_status = COALESCE(NULLIF(dspace_publish_status, ''), 'pending')
               WHERE id = $1::uuid`,
              [dto.submissionId]
            );

            if (evidence) await client.query(
              `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
              VALUES ($1, $2, $3, 'director', 'digital_signature_signed', $4::jsonb)`,
              [
                randomUUID(),
                dto.submissionId,
                user.sub,
                JSON.stringify({
                  is_signed: true,
                  ...evidence,
                  institution_text: "ĐẠI HỌC BÁCH KHOA THÀNH PHỐ HỒ CHÍ MINH - HCMUT",
                  signed_pages_scope: "Tất cả các trang (100% pages)",
                  signer_name: user.displayName || user.username || "Admin (Bảo lưu)",
                  signed_at: evidence?.signed_at ?? null,
                  signature_style: dto.signatureStyle || (dto.metadata as any)?.signatureStyle || "margin_strips",
                  watermark_pages: dto.watermarkPages || (dto.metadata as any)?.watermarkPages || (await this.db.query<{ value: string }>("SELECT value FROM system_settings WHERE key = 'signature_watermark_pages' LIMIT 1")).rows[0]?.value || "10",
                  signature_style_name:
                    dto.signatureStyle === "diagonal" ||
                    (dto.metadata as any)?.signatureStyle === "diagonal"
                      ? "Chữ ký số chéo trang"
                      : dto.signatureStyle === "invisible" ||
                        (dto.metadata as any)?.signatureStyle === "invisible"
                      ? "Không chữ ký số (Vô hình)"
                      : "Chữ ký số 2 bên lề",
                }),
              ]
            );
          }

          await client.query(
            `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
             VALUES ($1, $2, $3, 'system', 'status_changed', $4::jsonb)`,
            [
              randomUUID(),
              dto.submissionId,
              user.sub,
              JSON.stringify({
                from: advanced.fromStatus as SubmissionStatus,
                to: advanced.toStatus as SubmissionStatus,
                reason: eventType,
              }),
            ]
          );
        } else {
          await client.query(
            `UPDATE submissions SET status = 'rejected' WHERE id = $1::uuid`,
            [dto.submissionId]
          );
          await client.query(
            `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
             VALUES ($1, $2, $3, 'director', 'director_rejected', $4::jsonb)`,
            [
              randomUUID(),
              dto.submissionId,
              user.sub,
              JSON.stringify({ comment: rejectReason }),
            ]
          );
          await client.query(
            `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
             VALUES ($1, $2, $3, 'system', 'status_changed', $4::jsonb)`,
            [
              randomUUID(),
              dto.submissionId,
              user.sub,
              JSON.stringify({
                from: row.status,
                to: SubmissionStatus.REJECTED,
                reason: "director_rejected",
              }),
            ]
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      if (dto.action === ReviewActionType.APPROVE) {
        return { ok: true };
      }

      if (dto.action === ReviewActionType.ARCHIVE) {
        this.workflowMail.notifySafely("student_director_approved", () =>
          this.workflowMail.notifyStudentOnDirectorDecision(
            dto.submissionId,
            ReviewDecision.APPROVED,
            actorName,
          )
        );
        return {
          ok: true,
          dspaceDeferred: true,
          message:
            "Archived to period. Push to DSpace later from Archive configuration.",
        };
      }

      this.workflowMail.notifySafely("student_director_rejected", () =>
        this.workflowMail.notifyStudentOnDirectorDecision(
          dto.submissionId,
          SubmissionStatus.REJECTED,
          actorName,
          rejectReason,
        )
      );
      return { ok: true };
    }

    throw new BadRequestException("Unknown stage role");
  }

  /**
   * Danh sách các bài nộp cũ / đã nộp trong hệ thống để phục vụ chuyển luồng ký hàng loạt
   */
  async getLegacyBatchSubmissions(user: JwtPayload) {
    if (user.role !== WorkflowRole.ADMIN) {
      throw new ForbiddenException();
    }
    const result = await this.db.query(
      `SELECT s.id,
              s.title,
              s.author,
              s.student_id,
              s.status,
              s.created_at,
              COALESCE(NULLIF(s.faculty_name, ''), f.name) AS faculty_name,
              COALESCE(NULLIF(s.semester_name, ''), sem.name) AS semester_name,
              EXISTS (
                SELECT 1 FROM submission_events se 
                WHERE se.submission_id = s.id AND se.event_type = 'digital_signature_signed'
              ) AS is_signed,
              (
                SELECT payload->>'signature_style' 
                FROM submission_events se 
                WHERE se.submission_id = s.id AND se.event_type = 'digital_signature_signed' 
                ORDER BY created_at DESC LIMIT 1
              ) AS signature_style,
              (
                SELECT payload->>'watermark_pages' 
                FROM submission_events se 
                WHERE se.submission_id = s.id AND se.event_type = 'digital_signature_signed' 
                ORDER BY created_at DESC LIMIT 1
              ) AS watermark_pages,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', sf.id,
                    'fileName', sf.file_name,
                    'fileUrl', sf.file_url,
                    'fileType', sf.file_type
                  )
                ) FILTER (WHERE sf.id IS NOT NULL),
                '[]'::json
              ) AS files
       FROM submissions s
       LEFT JOIN submission_periods sp ON sp.id = s.submission_period_id
       LEFT JOIN semesters sem ON sem.id = sp.semester_id
       LEFT JOIN faculties f ON f.id = sem.faculty_id
       LEFT JOIN submission_files sf ON sf.submission_id = s.id
       GROUP BY s.id,
                s.title,
                s.author,
                s.student_id,
                s.status,
                s.created_at,
                s.faculty_name,
                f.name,
                s.semester_name,
                sem.name
       ORDER BY s.created_at DESC`
    );
    return result.rows;
  }

  /**
   * Ký số hàng loạt (Batch Sign) các bài nộp cũ
   */
  async batchSignLegacy(
    user: JwtPayload,
    dto: {
      submissionIds: string[];
      signatureStyle?: SignatureStyleType;
      watermarkPages?: string;
    }
  ) {
    if (user.role !== WorkflowRole.ADMIN) {
      throw new ForbiddenException();
    }
    const { submissionIds, watermarkPages } = dto;
    const signatureStyle = resolveSignatureStyle(dto.signatureStyle || (await this.archiveSigning.defaultSignatureStyle()));
    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      throw new BadRequestException("Vui lòng chọn ít nhất 1 bài nộp để ký số");
    }

    const defaultWatermarkPages = watermarkPages ||
      (await this.db.query<{ value: string }>(
        "SELECT value FROM system_settings WHERE key = 'signature_watermark_pages' LIMIT 1"
      )).rows[0]?.value || "10";

    const results: Array<{
      submissionId: string;
      title: string;
      status: string;
      signed: boolean;
      warnings: string[];
    }> = [];

    for (const subId of submissionIds) {
      const subRes = await this.db.query<{ id: string; title: string; status: string }>(
        `SELECT id, title, status FROM submissions WHERE id = $1::uuid LIMIT 1`,
        [subId]
      );
      const sub = subRes.rows[0];
      if (!sub) continue;

      const fileRes = await this.db.query<{ id: string; file_name: string; file_url: string }>(
        `SELECT id, file_name, file_url FROM submission_files WHERE submission_id = $1::uuid AND LOWER(file_name) LIKE '%.pdf' LIMIT 1`,
        [subId]
      );
      const file = fileRes.rows[0];
      const warnings: string[] = [];

      if (file) {
        try {
          const stampDetail = await this.pdfStamping.stampPdfFileDetailed(
            file.file_url,
            signatureStyle,
            { watermarkPages: defaultWatermarkPages }
          );
          if (stampDetail.watermarkPagesMissing.length > 0) {
            warnings.push(
              `Tệp PDF có ${stampDetail.totalPages} trang, không có trang ${stampDetail.watermarkPagesMissing.join(", ")} để chèn watermark.`
            );
          }
        } catch (e: any) {
          warnings.push(`Kiểm tra file PDF: ${e?.message || "lỗi đọc file"}`);
        }
      }

      const client = await this.db.connect();
      try {
        await client.query("BEGIN");
        const archived = await this.archiveSigning.signArchivedPdf({
          submissionId: subId,
          sourceFileId: file?.id,
          actorSub: user.sub,
          actorName: user.displayName || user.username || "Quản trị viên",
          style: resolveSignatureStyle(signatureStyle),
          watermarkPages: defaultWatermarkPages,
        });
        const evidence = archived ? signedEvidence(archived) : null;

        // Đảm bảo bài nộp chuyển sang trạng thái đã lưu chiểu nếu đang draft/reviewing/approved
        await client.query(
          `UPDATE submissions
           SET status = 'archived',
               dspace_publish_status = COALESCE(NULLIF(dspace_publish_status, ''), 'pending')
           WHERE id = $1::uuid`,
          [subId]
        );

        if (evidence) await client.query(
          `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
          VALUES ($1, $2, $3, 'admin', 'digital_signature_signed', $4::jsonb)`,
          [
            randomUUID(),
            subId,
            user.sub,
            JSON.stringify({
              is_signed: true,
              is_legacy_batch: true,
              ...evidence,
              institution_text: "ĐẠI HỌC BÁCH KHOA THÀNH PHỐ HỒ CHÍ MINH - HCMUT",
              signed_pages_scope: "Tất cả các trang (100% pages)",
              signer_name: user.displayName || user.username || "Quản trị viên (Ký số hàng loạt)",
              signed_at: evidence?.signed_at ?? null,
              signature_style: signatureStyle,
              watermark_pages: defaultWatermarkPages,
              signature_style_name:
                signatureStyle === "diagonal"
                  ? "Chữ ký số chéo trang"
                  : signatureStyle === "invisible"
                  ? "Không chữ ký số (Vô hình)"
                  : "Chữ ký số 2 bên lề",
            }),
          ]
        );

        await client.query(
          `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
           VALUES ($1, $2, $3, 'system', 'status_changed', $4::jsonb)`,
          [
            randomUUID(),
            subId,
            user.sub,
            JSON.stringify({
              from: sub.status,
              to: "archived",
              reason: "admin_legacy_batch_signed",
            }),
          ]
        );

        await client.query("COMMIT");
        results.push({
          submissionId: subId,
          title: sub.title,
          status: "archived",
          signed: evidence !== null,
          warnings: evidence ? warnings : [...warnings, "Không có file PDF để ký số"],
        });
      } catch (err: any) {
        await client.query("ROLLBACK");
        results.push({
          submissionId: subId,
          title: sub.title,
          status: sub.status,
          signed: false,
          warnings: [err?.message || "Lỗi giao tác database"],
        });
      } finally {
        client.release();
      }
    }

    return {
      ok: true,
      total: results.length,
      successCount: results.filter((r) => r.signed).length,
      results,
    };
  }
}

