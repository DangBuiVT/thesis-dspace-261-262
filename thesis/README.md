# Hướng Dẫn Sử Dụng & Kiểm Thử: Hệ Thống Nộp & Kiểm Duyệt Luận Văn Thạc Sĩ (BKlib DSpace)

**Đơn vị phát triển:** Thư viện Trường Đại học Bách khoa — ĐHQG-HCM (BKlib)  
**Tên Bộ sưu tập:** Bài luận văn Thạc sĩ  
**Mã định danh bộ sưu tập (Collection ID):** `99c8f87a-a3a8-45bb-9ee7-1992d0ece528`  
**Cổng lưu chiểu:** `https://dspace.tv.hcmut.edu.vn`  

---

## 1. Cách Khởi Chạy Ứng Dụng

Ứng dụng được đóng gói độc lập theo tiêu chuẩn Web hiện đại, không cần cài đặt phức tạp.

### Cách 1: Chạy trực tiếp bằng Node.js / npx serve
Mở Terminal/PowerShell tại thư mục `thesis`:
```bash
cd thesis
npx serve .
```
Truy cập trình duyệt theo địa chỉ: `http://localhost:3000` (hoặc cổng mà `serve` thông báo).

### Cách 2: Chạy bằng VS Code Live Server / Vite
Nhấp chuột phải vào file [index.html](file:///c:/Users/Duc/Documents/GitHub/thesis-submission-system/thesis/index.html) và chọn **Open with Live Server**.

---

## 2. Tài Khoản & Phân Quyền Vai Trò Thử Nghiệm

Hệ thống tích hợp sẵn thanh công cụ **Role Switcher** ở đầu trang giúp bạn chuyển đổi nhanh giữa các tài khoản mà không cần đăng xuất/đăng nhập lại:

| STT | Vai trò nghiệp vụ | Tài khoản thử nghiệm | Nhóm quyền DSpace (EPersonGroup) | Nhiệm vụ & Quyền hạn |
| :--- | :--- | :--- | :--- | :--- |
| **0** | **Quản trị viên (Collection Admin)** | `BKlib Admin` | `COLLECTION_99c8f87a-a3a8-45bb-9ee7-1992d0ece528_ADMIN` | Quản lý bộ sưu tập, phân quyền tài khoản, chỉnh sửa thông tin, di chuyển, xuất bản và giám sát toàn hệ thống. |
| **1** | **Người nộp bài (Submitter - Học viên)** | `nthieu@hcmut.edu.vn` | `COLLECTION_99c8f87a-a3a8-45bb-9ee7-1992d0ece528_SUBMIT` | Nhập mô tả metadata (Dublin Core), tải file PDF và nhấn **[Tải lên / Nộp bài]**. Nếu bài bị từ chối, bài quay về dạng bản nháp để chỉnh sửa và nộp lại. |
| **2** | **Bước 1: Người kiểm duyệt (Reviewer - CBHD)** | `nth309@gmail.com` | `COLLECTION_99c8f87a-a3a8-45bb-9ee7-1992d0ece528_WORKFLOW_ROLE_reviewer` | Lớp phòng thủ đầu tiên: Sơ duyệt chất lượng và định dạng file PDF. **Chấp nhận (Accept)** để chuyển sang Bước 2, hoặc **Từ chối (Reject)** để trả về cho học viên kèm lý do. *(Không thể sửa metadata)*. |
| **3** | **Bước 2: Người biên tập (Editor - Chủ tịch HĐ)** | `hieugalaxya07@gmail.com` / `BKlib Admin` | `COLLECTION_99c8f87a-a3a8-45bb-9ee7-1992d0ece528_WORKFLOW_ROLE_editor` | Kiểm tra tính chính xác và chuẩn hóa trích dẫn. **Chỉnh sửa Metadata** (tiêu đề, tác giả, tóm tắt, từ khóa...). **Chấp nhận (Accept)** chuyển sang Bước 3, hoặc **Từ chối (Reject)** trả về cho học viên kèm lý do. *(Không thể sửa file PDF)*. |
| **4** | **Bước 3: Người biên tập cuối (Final Editor - Thủ thư)** | `lehoang.13291@gmail.com` / `BKlib Admin` | `COLLECTION_99c8f87a-a3a8-45bb-9ee7-1992d0ece528_WORKFLOW_ROLE_finaleditor` | "Người gác cổng" cuối cùng: Rà soát pháp lý, bản quyền, chuẩn hóa DSpace. **Chỉnh sửa Metadata**, **KÝ SỐ ĐIỆN TỬ BKLIB** và **Duyệt xuất bản (Commit to Archive)** để đưa bài nộp lên kho công khai, tự động sinh mã định danh Handle vĩnh viễn và tự động gửi email thông báo. *(Không thể từ chối về cho học viên ban đầu)*. |

---

## 3. Kịch Bản Kiểm Thử Toàn Trình (End-to-End Workflow Test)

1. **Học viên nộp bài:**
   - Trên thanh Role Switcher, chọn `nthieu@hcmut.edu.vn (Học viên nộp bài)`.
   - Vào mục **"Nộp Luận văn mới"**, nhập đầy đủ thông tin hoặc giữ dữ liệu mẫu, đính kèm file PDF rồi nhấn **[Tải lên / Nộp bài chính thức]**.
   - Bài nộp chuyển sang trạng thái: `Bước 1: Chờ CBHD sơ duyệt`.

2. **Cán bộ hướng dẫn sơ duyệt (Bước 1):**
   - Trên thanh Role Switcher, chuyển sang `nth309@gmail.com (Reviewer - CBHD)`.
   - Vào mục **"Hàng đợi kiểm duyệt"**, nhấp **"Sơ duyệt (B1)"**.
   - Nhấn **"Chấp nhận (Accept sang Bước 2)"** (hoặc thử nghiệm tính năng Từ chối kèm lý do).
   - Trạng thái bài nộp chuyển sang: `Bước 2: Chờ Chủ tịch HĐ duyệt`.

3. **Chủ tịch Hội đồng biên tập (Bước 2):**
   - Trên thanh Role Switcher, chuyển sang `hieugalaxya07@gmail.com (Editor - Chủ tịch HĐ)`.
   - Vào **"Hàng đợi kiểm duyệt"**, nhấp **"Biên tập (B2)"**.
   - Có thể chỉnh sửa tiêu đề, từ khóa, tóm tắt trực tiếp trên form.
   - Nhấn **"Lưu Metadata & Chấp nhận (Accept sang Bước 3)"**.
   - Trạng thái bài nộp chuyển sang: `Bước 3: Chờ Thư viện duyệt & Ký số`.

4. **Cán bộ Thư viện Ký số & Duyệt xuất bản (Bước 3):**
   - Chuyển sang `lehoang.13291@gmail.com (Final Editor - Thủ thư)`.
   - Vào **"Hàng đợi kiểm duyệt"**, nhấp **"Ký số & Xuất bản (B3)"**.
   - Rà soát thông tin lần cuối, xem thông tin chữ ký số và nhấn nút xanh: **[Ký số & Duyệt xuất bản (Commit to Archive)]**.
   - Hệ thống tự động:
     - Tạo hàm băm toàn vẹn SHA-256 và đóng dấu chứng thực số của Thư viện ĐH Bách Khoa TP.HCM (BKlib CA).
     - Sinh mã Handle vĩnh viễn: `https://dspace.tv.hcmut.edu.vn/handle/123456789/[MÃ_ID]`.
     - Chuyển trạng thái tài liệu sang **Đã công bố (Archived)**.
     - **Tự động gửi email thông báo** tới `nthieu@hcmut.edu.vn`.

5. **Kiểm tra Email và Kho công khai:**
   - Màn hình tự động bật popup xem nội dung Email mô phỏng hiển thị trên điện thoại (đúng theo hình ảnh và nội dung quy định).
   - Bạn cũng có thể vào mục **"Hộp thư DSpace (nthieu)"** hoặc **"Kho lưu chiểu (DSpace)"** để tra cứu biểu ghi đã lưu chiểu vĩnh viễn.

6. **Màn hình Quản trị Admin:**
   - Chuyển sang `BKlib Admin (Quản trị viên)`.
   - Vào tab **"Quản trị Bộ sưu tập"** để xem cấu hình EPersonGroup, thống kê bài nộp qua các giai đoạn và tùy chọn khôi phục dữ liệu mẫu ban đầu.
