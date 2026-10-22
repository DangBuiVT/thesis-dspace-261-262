/**
 * Trạng thái tổng thể của hồ sơ bài nộp (cột `submissions.status`)
 */
export enum SubmissionStatus {
  DRAFT = "draft",
  REVIEWING = "reviewing",
  APPROVED = "approved",
  REJECTED = "rejected",
  ARCHIVED = "archived",
}

/**
 * Trạng thái quyết định của từng Reviewer riêng lẻ (cột `reviews.decision`)
 * Lưu ý: Code cũ quy ước reviewer từ chối là 'reject' (không có đuôi 'ed')
 */
export enum ReviewDecision {
  PENDING = "pending",
  APPROVED = "approved",
  REJECT = "reject",
}

/**
 * Hành động truyền lên từ Client DTO (dto.action trong ReviewActionDto)
 */
export enum ReviewActionType {
  APPROVE = "approve",
  REJECT = "reject",
  ARCHIVE = "archive",
}

/**
 * Các vai trò tham gia vào quy trình duyệt (cột `actor_role` hoặc `user.role`)
 */
export enum WorkflowRole {
  STUDENT = "student",
  REVIEWER = "reviewer",
  LIBRARY_STAFF = "library_staff",
  DIRECTOR = "director",
  ADMIN = "admin",
  SYSTEM = "system",
}

/**
 * Loại sự kiện ghi vết kiểm toán (cột `submission_events.event_type`)
 * Khớp chính xác 100% với các câu lệnh INSERT trong reviews.service.ts
 */
export enum WorkflowEventType {
  // Sinh viên thao tác
  SUBMIT = "SUBMIT",
  RESUBMIT = "RESUBMIT",

  // Chặng 1: Reviewer thao tác
  REVIEWER_APPROVED = "reviewer_approved",
  REVIEWER_REJECTED = "reviewer_rejected",

  // Chặng 2: Library Staff (Thư viện) thao tác
  LIBRARY_STAFF_APPROVED = "library_staff_approved",
  LIBRARY_STAFF_REJECTED = "library_staff_rejected",
  METADATA_UPDATED = "metadata_updated", // Chuẩn bị cho endpoint PATCH metadata sắp tới

  // Chặng 3: Director thao tác
  DIRECTOR_ARCHIVED = "director_archived",
  DIRECTOR_REJECTED = "director_rejected",
  DIRECTOR_RETURNED = "director_returned", // Cho luồng trả hồ sơ về Chặng 2

  // Sự kiện hệ thống chuyển trạng thái tự động
  STATUS_CHANGED = "status_changed",
}

/**
 * Trạng thái xuất bản sang kho số DSpace (cột `submissions.dspace_publish_status`)
 */
export enum DSpacePublishStatus {
  PENDING = "pending",
  PUBLISHED = "published",
  FAILED = "failed",
}
