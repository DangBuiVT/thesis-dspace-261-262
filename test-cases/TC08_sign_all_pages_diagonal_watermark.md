# Test Case: TC08 - Đóng dấu chữ ký số chéo lên TẤT CẢ các trang của file PDF

## 1. Mục tiêu kiểm thử (Objective)
Đảm bảo khi chọn kiểu chéo, mọi trang trong file tài liệu đều có chữ ký chéo góc 45 độ.

## 2. Tiền điều kiện (Preconditions)
Cấu hình kiểu ký đang là 'Chữ ký số chéo'. Có bài nộp đang chờ duyệt ở Bước 3.

## 3. Các bước thực hiện (Test Steps)
1. Đăng nhập với vai trò Final Editor (Thủ thư).
2. Chọn bài nộp và nhấn 'Ký số & Duyệt lưu chiểu'.
3. Mở kiểm tra các trang của file PDF đã ký.

## 4. Kết quả mong đợi (Expected Result)
Tất cả các trang đều có dòng chữ ký chéo góc qua trang với độ mờ chuẩn, nội dung văn bản bên dưới vẫn đọc được rõ ràng.

## 5. Trạng thái kiểm thử (Status)
- **Mức độ ưu tiên:** High
- **Phân loại:** Functional / E-Signature Test
- **Người thực hiện:** Nguyễn Trần Hữu Đức
- **Kết quả:** Pass
