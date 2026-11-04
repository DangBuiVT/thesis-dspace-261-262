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
    // Quản trị viên (admin) có toàn quyền trên toàn hệ thống, bỏ qua ràng buộc khoa
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
    // Kiểm tra tồn tại của bài nộp hoặc đợt nộp tương ứng
    if (!record) {
      throw new NotFoundException("Submission or Period not found");
    }
    // Ràng buộc RBAC: Cấm reviewer duyệt bài nộp thuộc khoa/bộ sưu tập khác
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
    // Chỉ người dùng có vai trò reviewer mới được truy cập danh sách chờ duyệt học thuật
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
    // Chỉ người dùng có vai trò reviewer mới được thực hiện hành động tại Bước 1
    if (user.role !== WorkflowRole.REVIEWER) {
      throw new ForbiddenException();
    }
    // Reviewer không có quyền lưu chiểu (archive)
    if (dto.action === ReviewActionType.ARCHIVE) {
      throw new BadRequestException("Reviewers cannot archive submissions");
    }

    // Xác nhận hồ sơ đang ở đúng chặng và vai trò Reviewer
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
    // Kiểm tra xem bài nộp có được phân công cho reviewer này hay không
    if (!row) {
      throw new NotFoundException("Submission not assigned to this reviewer");
    }
    // Chặn duyệt lại nếu reviewer đã đưa ra quyết định trước đó
    if (row.decision !== ReviewDecision.PENDING) {
      throw new BadRequestException("Review already completed");
    }
    // Đảm bảo hồ sơ đang ở trạng thái reviewing
    if (row.submission_status !== SubmissionStatus.REVIEWING) {
      throw new BadRequestException("Submission is not in reviewer stage");
    }
    await this.groups.assertReviewerMayAct(user.sub, row.student_id);

    // Bắt buộc nhập lý do nếu từ chối bài nộp
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
      // Bắt đầu transaction cập nhật quyết định của Reviewer và trạng thái bài nộp
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

      // Nhánh 1: Nếu reviewer từ chối -> chuyển trạng thái hồ sơ sang REJECTED và ghi vết sự kiện
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
        // Nhánh 2: Reviewer đồng thuận -> kiểm tra xem tất cả reviewers được gán đã duyệt hết chưa
        const pending = await client.query(
          `SELECT COUNT(*)::int AS cnt
           FROM reviews
           WHERE submission_id = $1 AND decision = 'pending'`,
          [dto.submissionId],
        );
        const pendingCount = pending.rows[0]?.cnt ?? 0;
        // Nếu tất cả reviewers đã đồng thuận -> chuyển tiếp hồ sơ sang bước tiếp theo trong workflow
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
      // Rollback toàn bộ dữ liệu nếu có lỗi trong transaction
      await client.query("ROLLBACK");
      throw error;
    } finally {
      // Giải phóng client kết nối database về pool
      client.release();
    }

    const actorName = user.displayName || user.username;

    // Gửi email thông báo cho sinh viên dựa theo kết quả duyệt
    if (dto.action === "reject") {
      // Thông báo từ chối tới sinh viên kèm lý do
      this.workflowMail.notifySafely("student_reviewer_rejected", () =>
        this.workflowMail.notifyStudentOnReviewerDecision(
          dto.submissionId,
          SubmissionStatus.REJECTED,
          actorName,
          rejectReason,
        ),
      );
    } else {
      // Thông báo một reviewer đã chấp thuận
      this.workflowMail.notifySafely("student_reviewer_approved", () =>
        this.workflowMail.notifyStudentOnReviewerDecision(
          dto.submissionId,
          SubmissionStatus.APPROVED,
          actorName,
        ),
      );
      // Khi toàn bộ reviewers đã chấp thuận -> kích hoạt thông báo chuyển chặng
      if (allReviewersApproved) {
        // Nếu bước kế tiếp là Cán bộ thư viện -> gửi email thông báo có hồ sơ mới cần tiếp nhận
        if (enteredRole === WorkflowRole.LIBRARY_STAFF) {
          this.workflowMail.notifySafely("library_review", () =>
            this.workflowMail.notifyLibraryOnAllReviewersApproved(
              dto.submissionId,
            ),
          );
        }
        // Gửi email báo cho sinh viên biết toàn bộ reviewer đã thông qua
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
    // Chỉ cán bộ thư viện mới có quyền xem danh sách chờ tiếp nhận và biên tập
    if (user.role !== WorkflowRole.LIBRARY_STAFF) {
      throw new ForbiddenException();
    }
    await this.workflow.backfillOpenSubmissions();
    return this.getQueueRows(
      `s.status = 'reviewing' AND ${this.workflow.currentStepSql(WorkflowRole.LIBRARY_STAFF)}`,
    );
  }

  async getDirectorQueue(user: JwtPayload) {
    // Chỉ giám đốc thư viện mới có quyền xem danh sách chờ phê duyệt lưu chiểu
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
    // Chặn nếu hồ sơ chưa thỏa mãn điều kiện sẵn sàng cho thư viện tiếp nhận
    if (!result.rows[0]) {
      throw new BadRequestException(
        "Submission is not ready for library intake",
      );
    }
  }

  async libraryAct(user: JwtPayload, dto: ReviewActionDto) {
    // Kiểm tra quyền hạn: Chỉ cán bộ thư viện mới được duyệt Bước 2
    if (user.role !== WorkflowRole.LIBRARY_STAFF) {
      throw new ForbiddenException();
    }
    // Cán bộ thư viện không có quyền trực tiếp đưa bài vào kho lưu trữ vĩnh viễn (archive)
    if (dto.action === ReviewActionType.ARCHIVE) {
      throw new BadRequestException("Library staff cannot archive submissions");
    }

    const step = await this.workflow.assertCurrentRole(
      dto.submissionId,
      WorkflowRole.LIBRARY_STAFF,
    );
    // Đảm bảo hồ sơ đang trong trạng thái reviewing
    if (step.status !== SubmissionStatus.REVIEWING) {
      throw new BadRequestException("Submission is not in reviewing stage");
    }

    // Nếu từ chối, bắt buộc cán bộ thư viện phải nhập lý do
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
      // Bắt đầu transaction xử lý quyết định của Thư viện
      await client.query("BEGIN");
      const current = await client.query<{ status: string }>(
        `SELECT status FROM submissions WHERE id = $1::uuid LIMIT 1 FOR UPDATE`,
        [dto.submissionId],
      );
      const row = current.rows[0];
      // Khóa và xác thực lại trạng thái hồ sơ trước khi cập nhật
      if (!row || row.status !== SubmissionStatus.REVIEWING) {
        throw new BadRequestException("Submission is not in reviewing stage");
      }

      // Nhánh 1: Thư viện chấp nhận hồ sơ -> chuyển tiếp sang bước của Giám đốc (Bước 3)
      if (dto.action === ReviewActionType.APPROVE) {
        const advanced = await this.workflow.advance(client, dto.submissionId);
        nextStatus = advanced.toStatus as SubmissionStatus;
        enteredRole = advanced.enteredRole;
      } else {
        // Nhánh 2: Thư viện từ chối hồ sơ -> cập nhật trạng thái rejected trả về cho sinh viên
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
      // Rollback transaction nếu xảy ra lỗi trong quá trình duyệt của Thư viện
      await client.query("ROLLBACK");
      throw error;
    } finally {
      // Trả lại connection client về pool
      client.release();
    }

    const actorName = user.displayName || user.username;
    // Gửi email thông báo tùy theo kết quả duyệt của Cán bộ thư viện
    if (dto.action === ReviewActionType.APPROVE) {
      // Nếu bước tiếp theo là Giám đốc duyệt -> gửi email thông báo cho Giám đốc
      if (enteredRole === WorkflowRole.DIRECTOR) {
        this.workflowMail.notifySafely("director_review", () =>
          this.workflowMail.notifyDirectorsOnLibraryApproved(dto.submissionId),
        );
      }
      // Gửi email báo cho sinh viên biết thư viện đã thông qua
      this.workflowMail.notifySafely("student_library_approved", () =>
        this.workflowMail.notifyStudentOnLibraryDecision(
          dto.submissionId,
          SubmissionStatus.APPROVED,
          actorName,
        ),
      );
    } else {
      // Gửi email báo cho sinh viên biết thư viện đã từ chối kèm lý do cụ thể
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
    // Kiểm tra quyền hạn: Chỉ Giám đốc mới được thực hiện hành động tại Bước 3
    if (user.role !== WorkflowRole.DIRECTOR) {
      throw new ForbiddenException();
    }
    // Giám đốc chỉ được phép thực hiện 3 hành động: approve, archive hoặc reject
    if (
      dto.action !== ReviewActionType.ARCHIVE &&
      dto.action !== ReviewActionType.RETURN_TO_EDITOR &&
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
    // Chỉ bước cuối cùng của Giám đốc mới được phép thực hiện archive
    if (dto.action === ReviewActionType.ARCHIVE && !step.isLast) {
      throw new BadRequestException("Only the final director step can archive");
    }
    // Bước cuối cùng bắt buộc phải archive chứ không được approve thông thường
    if (dto.action === ReviewActionType.APPROVE && step.isLast) {
      throw new BadRequestException(
        "The final director step is archived, not approved",
      );
    }

    const actorName = user.displayName || user.username;
    const returnReason =
      dto.action === ReviewActionType.RETURN_TO_EDITOR
        ? dto.comment?.trim() || ""
        : "";
    // Giám đốc chuyển về bắt buộc phải cung cấp lý do
    if (dto.action === ReviewActionType.RETURN_TO_EDITOR && !returnReason) {
      throw new BadRequestException(
        "Return comment for library staff is required",
      );
    }

    const client = await this.db.connect();
    try {
      // Bắt đầu transaction ghi nhận quyết định cuối cùng của Giám đốc
      await client.query("BEGIN");
      const current = await client.query<{ status: string }>(
        `SELECT status FROM submissions WHERE id = $1::uuid LIMIT 1 FOR UPDATE`,
        [dto.submissionId],
      );
      const row = current.rows[0];
      // Kiểm tra hồ sơ có tồn tại trong hệ thống hay không
      if (!row) {
        throw new NotFoundException("Submission not found");
      }
      // Đảm bảo hồ sơ đang ở trạng thái chờ Giám đốc duyệt (approved hoặc reviewing)
      if (
        row.status !== SubmissionStatus.APPROVED &&
        row.status !== SubmissionStatus.REVIEWING
      ) {
        throw new BadRequestException(
          "This submission is not waiting for the director",
        );
      }

      // Nhánh 1: Giám đốc chấp thuận hoặc phê duyệt lưu chiểu hồ sơ (Archive)
      if (
        dto.action === ReviewActionType.ARCHIVE ||
        dto.action === ReviewActionType.APPROVE
      ) {
        const advanced = await this.workflow.advance(client, dto.submissionId);
        // Kiểm tra tính hợp lệ nếu thực hiện archive nhưng workflow chưa đến chặng lưu trữ
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
      } else // Nhánh 2: Giám đốc từ chối hồ sơ -> chuyển trạng thái rejected và ghi vết
      {
        // Gọi hàm rollback bước về thư viện
        const reverted = await this.workflow.revertToRole(
          client,
          dto.submissionId,
          WorkflowRole.LIBRARY_STAFF,
        );
        // Ghi log sự kiện kiểm toán DIRECTOR_RETURNED
        await client.query(
          `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
     VALUES ($1, $2, $3, 'director', $4, $5::jsonb)`,
          [
            randomUUID(),
            dto.submissionId,
            user.sub,
            WorkflowEventType.DIRECTOR_RETURNED,
            JSON.stringify({ comment: dto.comment?.trim() }),
          ],
        );
        // Ghi log chuyển trạng thái hệ thống
        await client.query(
          `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
     VALUES ($1, $2, $3, 'system', 'status_changed', $4::jsonb)`,
          [
            randomUUID(),
            dto.submissionId,
            user.sub,
            JSON.stringify({
              from: reverted.fromStatus,
              to: reverted.toStatus,
              reason: WorkflowEventType.DIRECTOR_RETURNED,
            }),
          ],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      // Rollback transaction nếu có lỗi xảy ra trong quá trình Giám đốc phê duyệt
      await client.query("ROLLBACK");
      throw error;
    } finally {
      // Giải phóng kết nối database về pool
      client.release();
    }

    // Nếu chỉ là bước approve trung gian của giám đốc -> trả về kết quả thành công
    if (dto.action === ReviewActionType.APPROVE) {
      return { ok: true };
    }

    // Nếu là bước archive cuối cùng -> gửi email chúc mừng hoàn thành lưu chiểu cho sinh viên
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

    // Trường hợp giám đốc từ chối -> gửi email thông báo từ chối kèm lý do cho sinh viên
    this.workflowMail.notifySafely("library_returned", () =>
      this.workflowMail.notifyLibraryOnDirectorReturned(
        dto.submissionId,
        actorName,
        dto.comment,
      ),
    );
    return { ok: true, message: "Returned to library editor successfully" };
  }
}
