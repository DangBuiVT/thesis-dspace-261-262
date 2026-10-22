# Bảng Đối Chiếu Quy Trình Workflow & RBAC (DSpace REST API vs Thesis System)

## 1. Đối chiếu Thực thể Trạng thái (State Entities Mapping)

| Giai đoạn Portal          | Trạng thái Portal (`submissions.status`) | Thực thể DSpace REST API       | DSpace Task Endpoint                       |
| :------------------------ | :--------------------------------------- | :----------------------------- | :----------------------------------------- |
| Khởi tạo / Soạn thảo      | `draft`                                  | `workspaceitems`               | `/api/submission/workspaceitems`           |
| Bước 1: Giảng viên duyệt  | `reviewing` (Step 1)                     | `workflowitems` (Reviewer)     | `/api/workflow/claimedtasks` / `pooltasks` |
| Bước 2: Thư viện biên tập | `reviewing` (Step 2 - library_queue)     | `workflowitems` (Editor)       | `/api/workflow/claimedtasks`               |
| Bước 3: Giám đốc duyệt    | `approved` (Chờ archive)                 | `workflowitems` (Final Editor) | `/api/workflow/claimedtasks`               |
| Xuất bản / Lưu chiểu      | `archived`                               | `items` (bundle `ORIGINAL`)    | `/api/core/items/{id}`                     |
| Từ chối / Nộp lại         | `rejected` $\rightarrow$ `reviewing`     | Trả về `workspaceitems`        | Reject action trên workflowitem            |

## 2. Ma trận Ánh xạ Vai trò (Role & RBAC Mapping)

| DSpace Standard Group Role                  | Portal DB Role (`users.role`) | Nhiệm vụ chính trong hệ thống                               |
| :------------------------------------------ | :---------------------------- | :---------------------------------------------------------- |
| `SUBMITTER`                                 | `student`                     | Tạo bản nháp, tải PDF, nộp bài, chỉnh sửa khi bị reject     |
| `COLLECTION_<ID>_WORKFLOW_ROLE_reviewer`    | `reviewer`                    | Sơ duyệt học thuật, yêu cầu chỉnh sửa hoặc chấp thuận       |
| `COLLECTION_<ID>_WORKFLOW_ROLE_editor`      | `library_staff`               | Tiếp nhận, chuẩn hóa Dublin Core metadata, duyệt chuyển B3  |
| `COLLECTION_<ID>_WORKFLOW_ROLE_finaleditor` | `director`                    | Phê duyệt lưu chiểu cuối cùng, kích hoạt ký số & đẩy DSpace |
| `ADMIN`                                     | `admin`                       | Quản lý người dùng, mở đợt nộp, cấu hình hệ thống           |
