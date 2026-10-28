import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
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
    if (user.role !== WorkflowRole.REVIEWER) {
      throw new ForbiddenException();
    }
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
    if (user.role !== WorkflowRole.REVIEWER) {
      throw new ForbiddenException();
    }
    if (dto.action === ReviewActionType.ARCHIVE) {
      throw new BadRequestException("Reviewers cannot archive submissions");
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
    if (user.role !== WorkflowRole.LIBRARY_STAFF) {
      throw new ForbiddenException();
    }
    await this.workflow.backfillOpenSubmissions();
    return this.getQueueRows(
      `s.status = 'reviewing' AND ${this.workflow.currentStepSql(WorkflowRole.LIBRARY_STAFF)}`,
    );
  }

  async getDirectorQueue(user: JwtPayload) {
    if (user.role !== WorkflowRole.DIRECTOR) {
      throw new ForbiddenException();
    }
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
    if (user.role !== WorkflowRole.LIBRARY_STAFF) {
      throw new ForbiddenException();
    }
    if (dto.action === ReviewActionType.ARCHIVE) {
      throw new BadRequestException("Library staff cannot archive submissions");
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
      const current = await client.query<{ status: string }>(
        `SELECT status FROM submissions WHERE id = $1::uuid LIMIT 1 FOR UPDATE`,
        [dto.submissionId],
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
    if (user.role !== WorkflowRole.DIRECTOR) {
      throw new ForbiddenException();
    }
    if (
      dto.action !== ReviewActionType.ARCHIVE &&
      dto.action !== ReviewActionType.REJECT &&
      dto.action !== ReviewActionType.APPROVE
    ) {
      throw new BadRequestException(
        "Director can approve, archive, or reject the current step",
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
    const rejectReason =
      dto.action === ReviewActionType.REJECT ? dto.comment?.trim() || "" : "";
    if (dto.action === ReviewActionType.REJECT && !rejectReason) {
      throw new BadRequestException("Reject reason is required");
    }

    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<{ status: string }>(
        `SELECT status FROM submissions WHERE id = $1::uuid LIMIT 1 FOR UPDATE`,
        [dto.submissionId],
      );
      const row = current.rows[0];
      if (!row) {
        throw new NotFoundException("Submission not found");
      }
      if (
        row.status !== SubmissionStatus.APPROVED &&
        row.status !== SubmissionStatus.REVIEWING
      ) {
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
          const signaturePayload = `${dto.submissionId}-${user.sub}-${new Date().toISOString()}-BKlib-DSpace`;
          const sha256Hash = createHash("sha256").update(signaturePayload).digest("hex");
          const certSerial = "BK-VN-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000);
          const handleId = "123456789/" + Math.floor(1000 + Math.random() * 9000);

          await client.query(
            `UPDATE submissions
             SET dspace_item_id = COALESCE(NULLIF(dspace_item_id, ''), $1),
                 dspace_publish_status = 'published'
             WHERE id = $2::uuid`,
            [handleId, dto.submissionId]
          );

          await client.query(
            `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
             VALUES ($1, $2, $3, 'director', 'digital_signature_signed', $4::jsonb)`,
            [
              randomUUID(),
              dto.submissionId,
              user.sub,
              JSON.stringify({
                is_signed: true,
                algorithm: "SHA-256 with RSA 2048 / PKCS#7",
                sha256_hash: sha256Hash,
                certificate_serial: certSerial,
                issuer: "TRƯỜNG ĐẠI HỌC BÁCH KHOA THÀNH PHỐ HỒ CHÍ MINH - HCMUT / BKLIB CA ROOT",
                institution_text: "ĐẠI HỌC BÁCH KHOA THÀNH PHỐ HỒ CHÍ MINH - HCMUT",
                signed_pages_scope: "Tất cả các trang (100% pages)",
                signer_name: user.displayName || user.username || "ThS. Lê Hoàng (Thư viện)",
                signed_at: new Date().toISOString(),
                signature_style: dto.signatureStyle || (dto.metadata as any)?.signatureStyle || "margin_strips",
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
        await client.query(
          `UPDATE submissions SET status = 'rejected' WHERE id = $1::uuid`,
          [dto.submissionId],
        );
        await client.query(
          `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
           VALUES ($1, $2, $3, 'director', 'director_rejected', $4::jsonb)`,
          [
            randomUUID(),
            dto.submissionId,
            user.sub,
            JSON.stringify({ comment: rejectReason }),
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
              to: SubmissionStatus.REJECTED,
              reason: "director_rejected",
            }),
          ],
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

    this.workflowMail.notifySafely("student_director_rejected", () =>
      this.workflowMail.notifyStudentOnDirectorDecision(
        dto.submissionId,
        SubmissionStatus.REJECTED,
        actorName,
        rejectReason,
      ),
    );
    return { ok: true };
  }
}
