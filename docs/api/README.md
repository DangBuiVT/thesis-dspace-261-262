# API Documentation

Tài liệu chi tiết cho từng endpoint backend.

## Base URL

- Local backend: `http://localhost:3000`
- Auth header cho endpoint bảo vệ: `Authorization: Bearer <access_token>`

## Swagger

- Swagger UI: [http://localhost:3000/docs](http://localhost:3000/docs)
- OpenAPI JSON: [http://localhost:3000/docs-json](http://localhost:3000/docs-json)
- Dùng `POST /auth/login` để lấy `access_token`, nhấn **Authorize**, nhập token rồi thử API.
- Tạo học kỳ: xem [hướng dẫn API semester](./semesters.md).

## Danh sách endpoint

| Method | Endpoint | Tài liệu |
| ------ | -------- | -------- |
| GET | `/` | [`get-root.md`](./get-root.md) |
| GET | `/health` | [`get-health.md`](./get-health.md) |
| GET | `/auth/login-options` | [`get-auth-login-options.md`](./get-auth-login-options.md) |
| POST | `/auth/login` | [`post-auth-login.md`](./post-auth-login.md) |
| GET | `/auth/me` | [`get-auth-me.md`](./get-auth-me.md) |
| POST | `/auth/change-password` | [`post-auth-change-password.md`](./post-auth-change-password.md) |
| GET | `/archive-config/faculties/:facultyId/semesters` | [`semesters.md`](./semesters.md) |
| POST | `/archive-config/faculties/:facultyId/semesters` | [`semesters.md`](./semesters.md) |
| POST | `/archive-config/semesters/for-all-faculties` | [`semesters.md`](./semesters.md) |
| GET | `/archive-config/semesters/:semesterId` | [`semesters.md`](./semesters.md) |
| PATCH | `/archive-config/semesters/:semesterId` | [`semesters.md`](./semesters.md) |
| DELETE | `/archive-config/semesters/:semesterId` | [`semesters.md`](./semesters.md) |
| GET | `/auth/google` | [`get-auth-google.md`](./get-auth-google.md) |
| GET | `/admin/users/import-template` | [`admin-users-import.md`](./admin-users-import.md) |
| POST | `/admin/users/import/preview` | [`admin-users-import.md`](./admin-users-import.md) |
| POST | `/admin/users/import` | [`admin-users-import.md`](./admin-users-import.md) |
| DELETE | `/admin/users/:userId` | [`delete-admin-users.md`](./delete-admin-users.md) |
| POST | `/submissions` | [`post-submissions.md`](./post-submissions.md) |
| GET | `/submissions/student/:studentId` | [`get-submissions-student.md`](./get-submissions-student.md) |
| GET | `/reviews/my-queue` | [`get-reviews-my-queue.md`](./get-reviews-my-queue.md) |
| POST | `/reviews/action` | [`post-reviews-action.md`](./post-reviews-action.md) |

## Ghi chú trạng thái nghiệp vụ

Theo code backend hiện tại, trạng thái bản nộp đang dùng tập giá trị:

- `pending`
- `approved`
- `rejected`
