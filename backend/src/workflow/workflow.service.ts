import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ArchiveSigningService, signedEvidence } from "../signing/archive-signing.service";
import type { PoolClient } from "pg";
import { createPgPool } from "../users/db-pool";
import { ensurePortalSchema } from "./ensure-schema";

export type WorkflowRole = "reviewer" | "library_staff" | "director";

export type WorkflowStep = {
  id: string;
  sortOrder: number;
  role: WorkflowRole;
  label: string;
};

const ROLES = new Set<WorkflowRole>(["reviewer", "library_staff", "director"]);

@Injectable()
export class WorkflowService implements OnModuleInit {
  private readonly db = createPgPool();

  constructor(private readonly archiveSigning: ArchiveSigningService) {}

  async onModuleInit() {
    await ensurePortalSchema(this.db);
  }

  currentStepSql(role: WorkflowRole) {
    return `EXISTS (
      SELECT 1 FROM submission_steps ss
      WHERE ss.submission_id = s.id
        AND ss.sort_order = s.current_step
        AND ss.role = '${role}'
    )`;
  }

  async listTemplate(): Promise<WorkflowStep[]> {
    const result = await this.db.query<{ id: string; sort_order: number; role: WorkflowRole; label: string }>(
      `SELECT id, sort_order, role, label FROM workflow_steps ORDER BY sort_order ASC, id ASC`
    );
    return result.rows.map((row) => ({
      id: row.id,
      sortOrder: row.sort_order,
      role: row.role,
      label: row.label
    }));
  }

  async saveTemplate(steps: Array<{ role: string; label?: string }>): Promise<WorkflowStep[]> {
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new BadRequestException("Workflow must keep at least one step");
    }
    for (const step of steps) {
      if (!ROLES.has(step.role as WorkflowRole)) {
        throw new BadRequestException("Each step must use reviewer, library_staff, or director");
      }
    }

    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM workflow_steps`);
      let order = 1;
      for (const step of steps) {
        await client.query(
          `INSERT INTO workflow_steps (id, sort_order, role, label) VALUES ($1, $2, $3, $4)`,
          [randomUUID(), order, step.role, (step.label || "").trim()]
        );
        order += 1;
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return this.listTemplate();
  }

  async backfillOpenSubmissions() {
    const missing = await this.db.query<{ id: string; status: string }>(
      `SELECT s.id, s.status
       FROM submissions s
       WHERE s.status IN ('reviewing', 'approved')
         AND NOT EXISTS (SELECT 1 FROM submission_steps ss WHERE ss.submission_id = s.id)`
    );
    for (const row of missing.rows) {
      await this.installLegacy(row.id, row.status);
    }
  }

  /**
   * Chép quy trình duyệt vào bài nộp.
   * - `enabledRoles` = undefined/null: dùng quy trình chung của hệ thống.
   * - `enabledRoles` = mảng (Admin cấu hình riêng): chỉ giữ các vai trò được bật, theo thứ tự
   *   Phản biện → Thư viện → Giám đốc. Mảng rỗng = không cần duyệt → tự lưu chiểu + ký số.
   */
  async snapshot(
    client: PoolClient,
    submissionId: string,
    options?: {
      enabledRoles?: WorkflowRole[] | null;
      actor?: { sub: string; role: string; displayName?: string; username?: string };
      signatureStyle?: string;
    }
  ): Promise<{ status: string; role: WorkflowRole | null }> {
    let template = await this.listTemplate();
    const enabledRoles = options?.enabledRoles;
    if (Array.isArray(enabledRoles)) {
      const canonical: Array<{ role: WorkflowRole; label: string }> = [
        { role: "reviewer", label: "Review" },
        { role: "library_staff", label: "Library" },
        { role: "director", label: "Director" }
      ];
      template = canonical
        .filter((step) => enabledRoles.includes(step.role))
        .map((step, index) => ({
          id: "",
          sortOrder: index + 1,
          role: step.role,
          label: template.find((t) => t.role === step.role)?.label || step.label
        }));
      if (template.length === 0) {
        await this.archiveWithoutReview(client, submissionId, options?.actor, options?.signatureStyle);
        return { status: "archived", role: null };
      }
    }
    if (template.length === 0) {
      throw new BadRequestException("Workflow must keep at least one step");
    }
    await client.query(`DELETE FROM submission_steps WHERE submission_id = $1::uuid`, [submissionId]);
    for (const step of template) {
      await client.query(
        `INSERT INTO submission_steps (id, submission_id, sort_order, role, label)
         VALUES ($1, $2::uuid, $3, $4, $5)`,
        [randomUUID(), submissionId, step.sortOrder, step.role, step.label]
      );
    }
    const first = template[0];
    let status = "reviewing";
    if (template.length === 1 && first.role === "director") {
      status = "approved";
    }
    await client.query(`UPDATE submissions SET current_step = $1, status = $2 WHERE id = $3::uuid`, [
      first.sortOrder,
      status,
      submissionId
    ]);
    if (first.role === "reviewer") {
      await this.resetReviewerDecisions(client, submissionId);
      const count = await this.reviewerCount(client, submissionId);
      if (count === 0) {
        const moved = await this.advance(client, submissionId);
        return { status: moved.toStatus, role: moved.enteredRole || first.role };
      }
    }
    return { status, role: first.role };
  }

  /**
   * Bài nộp không có bước duyệt nào (Admin tắt hết): lưu chiểu ngay và ghi nhận chữ ký số.
   * PDF được đóng dấu khi tải xuống, dựa trên sự kiện `digital_signature_signed`.
   */
  private async archiveWithoutReview(
    client: PoolClient,
    submissionId: string,
    actor?: { sub: string; role: string; displayName?: string; username?: string },
    signatureStyle?: string
  ) {
    const before = await client.query<{ status: string }>(
      `SELECT status FROM submissions WHERE id = $1::uuid LIMIT 1`,
      [submissionId]
    );
    const fromStatus = before.rows[0]?.status || "draft";
    await client.query(`DELETE FROM submission_steps WHERE submission_id = $1::uuid`, [submissionId]);
    await client.query(`DELETE FROM reviews WHERE submission_id = $1::uuid`, [submissionId]);
    await client.query(
      `UPDATE submissions
       SET status = 'archived',
           current_step = NULL,
           dspace_publish_status = COALESCE(NULLIF(dspace_publish_status, ''), 'pending')
       WHERE id = $1::uuid`,
      [submissionId]
    );

    const style = signatureStyle === "diagonal" || signatureStyle === "invisible" ? signatureStyle : "margin_strips";
    const pagesSetting = await client.query<{ value: string }>(
      `SELECT value FROM system_settings WHERE key = 'signature_watermark_pages' LIMIT 1`
    );
    const archived = await this.archiveSigning.signArchivedPdf({
      submissionId,
      actorSub: actor?.sub || "system",
      actorName: actor?.displayName || actor?.username || "BKlib Admin",
      style,
      watermarkPages: pagesSetting.rows[0]?.value || "10",
    });
    const evidence = archived ? signedEvidence(archived) : null;
    const actorRole = actor?.role || "system";

    if (evidence) await client.query(
      `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
       VALUES ($1, $2::uuid, $3, $4, 'digital_signature_signed', $5::jsonb)`,
      [
        randomUUID(),
        submissionId,
        actor?.sub || null,
        actorRole,
        JSON.stringify({
          is_signed: true,
          auto_archived_without_review: true,
          ...evidence,
          institution_text: "ĐẠI HỌC BÁCH KHOA THÀNH PHỐ HỒ CHÍ MINH - HCMUT",
          signed_pages_scope: "Tất cả các trang (100% pages)",
          signer_name: actor?.displayName || actor?.username || "BKlib Admin",
          signed_at: archived?.signedAt.toISOString() ?? null,
          signature_style: style,
          watermark_pages: pagesSetting.rows[0]?.value || "10",
          signature_style_name:
            style === "diagonal"
              ? "Chữ ký số chéo trang"
              : style === "invisible"
                ? "Không chữ ký số (Vô hình)"
                : "Chữ ký số 2 bên lề"
        })
      ]
    );
    await client.query(
      `INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload)
       VALUES ($1, $2::uuid, $3, 'system', 'status_changed', $4::jsonb)`,
      [
        randomUUID(),
        submissionId,
        actor?.sub || null,
        JSON.stringify({ from: fromStatus, to: "archived", reason: "admin_no_review_required" })
      ]
    );
  }

  async assertCurrentRole(submissionId: string, role: WorkflowRole) {
    await this.backfillOpenSubmissions();
    const result = await this.db.query<{ role: WorkflowRole; is_last: boolean; status: string }>(
      `SELECT ss.role,
              ss.sort_order = (
                SELECT MAX(sort_order) FROM submission_steps sx WHERE sx.submission_id = s.id
              ) AS is_last,
              s.status
       FROM submissions s
       JOIN submission_steps ss ON ss.submission_id = s.id AND ss.sort_order = s.current_step
       WHERE s.id = $1::uuid
       LIMIT 1`,
      [submissionId]
    );
    const row = result.rows[0];
    if (!row || row.role !== role) {
      throw new BadRequestException("This submission is not waiting for this step");
    }
    return { isLast: Boolean(row.is_last), status: row.status };
  }

  async advance(client: PoolClient, submissionId: string): Promise<{
    fromStatus: string;
    toStatus: string;
    enteredRole: WorkflowRole | null;
    archived: boolean;
  }> {
    const current = await client.query<{ status: string; current_step: number }>(
      `SELECT status, current_step FROM submissions WHERE id = $1::uuid LIMIT 1 FOR UPDATE`,
      [submissionId]
    );
    const row = current.rows[0];
    if (!row) {
      throw new NotFoundException("Submission not found");
    }
    const steps = await client.query<{ sort_order: number; role: WorkflowRole }>(
      `SELECT sort_order, role FROM submission_steps WHERE submission_id = $1::uuid ORDER BY sort_order ASC`,
      [submissionId]
    );
    const list = steps.rows;
    const index = list.findIndex((step) => step.sort_order === row.current_step);
    if (index < 0) {
      throw new BadRequestException("Submission has no current workflow step");
    }
    const next = list[index + 1];
    if (!next) {
      if (list[index].role === "director") {
        await client.query(
          `UPDATE submissions
           SET status = 'archived',
               dspace_publish_status = COALESCE(NULLIF(dspace_publish_status, ''), 'pending')
           WHERE id = $1::uuid`,
          [submissionId]
        );
        return { fromStatus: row.status, toStatus: "archived", enteredRole: null, archived: true };
      }
      await client.query(`UPDATE submissions SET status = 'approved' WHERE id = $1::uuid`, [submissionId]);
      return { fromStatus: row.status, toStatus: "approved", enteredRole: null, archived: false };
    }

    let toStatus = "reviewing";
    const nextIsLast = index + 1 === list.length - 1;
    if (nextIsLast && next.role === "director") {
      toStatus = "approved";
    }
    await client.query(`UPDATE submissions SET current_step = $1, status = $2 WHERE id = $3::uuid`, [
      next.sort_order,
      toStatus,
      submissionId
    ]);
    if (next.role === "reviewer") {
      await this.resetReviewerDecisions(client, submissionId);
      const count = await this.reviewerCount(client, submissionId);
      if (count === 0) {
        return this.advance(client, submissionId);
      }
    }
    return { fromStatus: row.status, toStatus, enteredRole: next.role, archived: false };
  }

  async annotate<T extends { id: string }>(rows: T[]) {
    if (rows.length === 0) {
      return rows;
    }
    const result = await this.db.query<{ id: string; current_step_role: string | null; current_step_is_last: boolean }>(
      `SELECT s.id,
              ss.role AS current_step_role,
              ss.sort_order = mx.max_order AS current_step_is_last
       FROM submissions s
       LEFT JOIN submission_steps ss ON ss.submission_id = s.id AND ss.sort_order = s.current_step
       LEFT JOIN (
         SELECT submission_id, MAX(sort_order) AS max_order
         FROM submission_steps
         GROUP BY submission_id
       ) mx ON mx.submission_id = s.id
       WHERE s.id = ANY($1::uuid[])`,
      [rows.map((row) => row.id)]
    );
    const byId = new Map(result.rows.map((row) => [row.id, row]));
    return rows.map((row) => {
      const step = byId.get(row.id);
      return {
        ...row,
        current_step_role: step?.current_step_role || null,
        current_step_is_last: Boolean(step?.current_step_is_last)
      };
    });
  }

  private async installLegacy(submissionId: string, status: string) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const steps: Array<{ order: number; role: WorkflowRole; label: string }> = [
        { order: 1, role: "reviewer", label: "Review" },
        { order: 2, role: "library_staff", label: "Library" },
        { order: 3, role: "director", label: "Director" }
      ];
      for (const step of steps) {
        await client.query(
          `INSERT INTO submission_steps (id, submission_id, sort_order, role, label)
           VALUES ($1, $2::uuid, $3, $4, $5)`,
          [randomUUID(), submissionId, step.order, step.role, step.label]
        );
      }
      let current = 1;
      if (status === "approved") {
        current = 3;
      } else {
        const ready = await client.query(
          `SELECT 1
           WHERE EXISTS (SELECT 1 FROM reviews r0 WHERE r0.submission_id = $1::uuid)
             AND NOT EXISTS (
               SELECT 1 FROM reviews r1 WHERE r1.submission_id = $1::uuid AND r1.decision = 'pending'
             )
             AND NOT EXISTS (
               SELECT 1 FROM reviews r2 WHERE r2.submission_id = $1::uuid AND r2.decision = 'reject'
             )`,
          [submissionId]
        );
        if (ready.rows[0]) {
          current = 2;
        }
      }
      await client.query(`UPDATE submissions SET current_step = $1 WHERE id = $2::uuid`, [current, submissionId]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async resetReviewerDecisions(client: PoolClient, submissionId: string) {
    await client.query(
      `UPDATE reviews
       SET decision = 'pending', comment = NULL, decided_at = NULL
       WHERE submission_id = $1::uuid`,
      [submissionId]
    );
  }

  private async reviewerCount(client: PoolClient, submissionId: string) {
    const result = await client.query<{ cnt: number }>(
      `SELECT COUNT(*)::int AS cnt FROM reviews WHERE submission_id = $1::uuid`,
      [submissionId]
    );
    return result.rows[0]?.cnt ?? 0;
  }
}
