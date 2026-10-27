# Danh Mục 20 Test Cases Kiểm Thử Ký Số & Quy Trình Nộp Luận Văn (Đức)
**Dự án:** Cổng Nộp Luận Văn Tốt Nghiệp DSpace 261-262 (BKlib DSpace)  
**Phân hệ phụ trách:** Chữ ký số điện tử (E-Signature) & Xuất bản PDF  
**Người thực hiện:** Nguyễn Trần Hữu Đức  
**Thời điểm mốc:** Tuần 5 (27/10/2026)  

---

## Danh sách 20 Test Cases Đơn Lẻ (Single-Responsibility)

| Mã TC | Tên Test Case | Phạm vi kiểm tra | File chi tiết | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **TC01** | Khởi tạo cặp khóa RSA-2048 cho hệ thống | Sinh khóa & định dạng PEM | [TC01](TC01_generate_rsa_keypair.md) |  Pass |
| **TC02** | Hiển thị Public Key cho tất cả người dùng | Xem & sao chép Public Key | [TC02](TC02_view_public_key_all_users.md) |  Pass |
| **TC03** | Hiển thị Private Key cho kỹ thuật viên sau mã hóa | Đối chiếu & kiểm tra mã hóa | [TC03](TC03_view_private_key_after_encryption.md) |  Pass |
| **TC04** | Admin chọn kiểu chữ ký 2 bên lề trang | Cấu hình kiểu ký lề | [TC04](TC04_admin_select_margin_signature.md) |  Pass |
| **TC05** | Admin chọn kiểu chữ ký số chéo trang | Cấu hình kiểu ký chéo | [TC05](TC05_admin_select_diagonal_signature.md) |  Pass |
| **TC06** | Admin chọn kiểu không chữ ký số (Vô hình) | Cấu hình ký số ẩn | [TC06](TC06_admin_select_no_signature.md) |  Pass |
| **TC07** | Đóng dấu chữ ký 2 bên lề lên TẤT CẢ các trang | Ký 2 bên trên toàn bộ trang | [TC07](TC07_sign_all_pages_margin_strips.md) |  Pass |
| **TC08** | Đóng dấu chữ ký chéo lên TẤT CẢ các trang | Ký chéo trên toàn bộ trang | [TC08](TC08_sign_all_pages_diagonal_watermark.md) |  Pass |
| **TC09** | Áp dụng ký số vô hình lên TẤT CẢ các trang | Ký ẩn trên toàn bộ trang | [TC09](TC09_sign_all_pages_invisible.md) |  Pass |
| **TC10** | Hiển thị chuỗi tên trường chuẩn trên con dấu | Kiểm tra text 'ĐH Bách Khoa TP.HCM - HCMUT' | [TC10](TC10_verify_institution_text_all_pages.md) |  Pass |
| **TC11** | Tính toán mã băm SHA-256 toàn vẹn tệp PDF | Băm SHA-256 tài liệu | [TC11](TC11_sha256_hash_calculation.md) |  Pass |
| **TC12** | Xác thực chữ ký số hợp lệ cho tệp nguyên gốc | Kiểm tra tính hợp lệ | [TC12](TC12_verify_valid_signature.md) |  Pass |
| **TC13** | Phát hiện tệp PDF bị can thiệp sau khi ký | Phát hiện sửa đổi tài liệu | [TC13](TC13_detect_tampered_pdf.md) |  Pass |
| **TC14** | Xử lý lỗi khi chứng thư số hết hạn | Báo lỗi chứng thư hết hạn | [TC14](TC14_expired_certificate_error.md) |  Pass |
| **TC15** | Lưu cấu hình kiểu ký bền vững trong Admin Panel | Lưu cấu hình hệ thống | [TC15](TC15_admin_save_signature_style_config.md) |  Pass |
| **TC16** | Chặn người dùng thường sửa cấu hình ký số | Phân quyền Admin | [TC16](TC16_non_admin_cannot_change_signature_config.md) |  Pass |
| **TC17** | Tự động kích hoạt ký số khi duyệt lưu chiểu | Ký tự động tại Bước 3 | [TC17](TC17_auto_sign_on_director_archive.md) |  Pass |
| **TC18** | Tính nhất quán con dấu trên file nhiều trang | Kiểm tra đa trang (Multi-page) | [TC18](TC18_multipage_pdf_sign_consistency.md) |  Pass |
| **TC19** | Tải xuống file PDF đã ký số hoàn chỉnh | Tải về tệp có con dấu | [TC19](TC19_download_signed_pdf_file.md) |  Pass |
| **TC20** | Ghi nhận lịch sử ký số và serial chứng thư | Ghi vết kiểm toán (Audit Log) | [TC20](TC20_audit_log_signature_serial.md) |  Pass |
