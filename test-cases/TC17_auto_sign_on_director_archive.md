# Test Case: TC17 - Tự động kích hoạt ký số khi Director/Thủ thư duyệt lưu chiểu

## 1. Mục tiêu kiểm thử (Objective)
Kiểm tra luồng tự động ký số ngay khi hoàn thành Bước 3 mà không cần thao tác thủ công rời rạc.

## 2. Tiền điều kiện (Preconditions)
Tài liệu đang ở trạng thái Chờ Bước 3 (step3). Đăng nhập vai trò Final Editor.

## 3. Các bước thực hiện (Test Steps)
1. Bấm nút 'Ký số & Duyệt xuất bản (Commit to Archive)'.
2. Chờ hệ thống thực thi.
3. Kiểm tra trạng thái bài nộp.

## 4. Kết quả mong đợi (Expected Result)
Bài nộp chuyển sang 'Đã xuất bản (archived)', tự động sinh mã Handle DSpace và có đầy đủ con dấu chữ ký số.

## 5. Trạng thái kiểm thử (Status)
- **Mức độ ưu tiên:** High
- **Phân loại:** Functional / E-Signature Test
- **Người thực hiện:** Nguyễn Trần Hữu Đức
- **Kết quả:** Pass
