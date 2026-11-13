# API học kỳ (semester)

Base URL: `http://localhost:3000`. Swagger UI: `/docs`; OpenAPI JSON: `/docs-json`.

## Thử trên Swagger

1. Mở `/docs`, gọi `POST /auth/login` bằng tài khoản có quyền `library_intake` hoặc `configure_system` (mặc định: thư viện hoặc quản trị viên).
2. Sao chép `access_token` từ phản hồi, nhấn **Authorize** và nhập token (không thêm tiền tố `Bearer`).
3. Gọi `GET /archive-config/faculties`, chọn `id` của khoa đang hoạt động.
4. Gọi `POST /archive-config/faculties/{facultyId}/semesters`, điền `facultyId` và body bên dưới.

## Tạo học kỳ cho một khoa

`POST /archive-config/faculties/:facultyId/semesters`

Header: `Authorization: Bearer <access_token>`.

```json
{
  "name": "Học kỳ 1 năm học 2026-2027"
}
```

`facultyId` phải là UUID. Tên học kỳ được bỏ khoảng trắng đầu/cuối và phải có ít nhất 2 ký tự. Tên không được trùng trong cùng khoa, không phân biệt hoa/thường. Khoa phải có trạng thái `active`.

Phản hồi `201 Created`:

```json
{
  "id": "d3c41ad8-2a81-4e0d-b93c-1d5593a8e681",
  "facultyId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01",
  "name": "Học kỳ 1 năm học 2026-2027",
  "status": "active",
  "periodCount": 0,
  "createdAt": "2026-11-10T00:00:00.000Z"
}
```

| HTTP | Ý nghĩa |
| --- | --- |
| 400 | Tên không hợp lệ, UUID sai định dạng hoặc khoa ngừng hoạt động |
| 401 | Thiếu token, token sai hoặc hết hạn |
| 403 | Không có quyền `library_intake` hoặc `configure_system` |
| 404 | Không tìm thấy khoa |
| 409 | Tên học kỳ đã tồn tại trong khoa |

## Tạo học kỳ cho tất cả khoa

`POST /archive-config/semesters/for-all-faculties`

Cùng header và body với API tạo cho một khoa. Chỉ tạo cho các khoa `active`; bỏ qua khoa đã có tên học kỳ đó. Phản hồi `201 Created`:

```json
{
  "createdCount": 1,
  "skippedCount": 0,
  "created": [
    {
      "facultyId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01",
      "facultyName": "Khoa Khoa học và Kỹ thuật Máy tính",
      "semesterId": "d3c41ad8-2a81-4e0d-b93c-1d5593a8e681"
    }
  ],
  "skipped": []
}
```

Phần tử `skipped` gồm `facultyId`, `facultyName`, `reason: "already exists"`. Không có khoa đang hoạt động thì trả về hai mảng rỗng và hai số đếm bằng 0.

## Đọc, sửa và xóa

| Method | Endpoint | Dữ liệu |
| --- | --- | --- |
| GET | `/archive-config/faculties/:facultyId/semesters` | Danh sách học kỳ của khoa |
| GET | `/archive-config/semesters/:semesterId` | Chi tiết, thêm `submissionCount` |
| PATCH | `/archive-config/semesters/:semesterId` | Body có `name` và/hoặc `status` (`active`, `inactive`) |
| DELETE | `/archive-config/semesters/:semesterId` | Xóa học kỳ và các đợt nộp bên trong; gỡ liên kết đợt nộp khỏi các bản nộp |

Các API đọc yêu cầu một trong các quyền `library_intake`, `configure_system`, `director_approval`, `view_all_submissions`. Sửa và xóa yêu cầu `library_intake` hoặc `configure_system`.
