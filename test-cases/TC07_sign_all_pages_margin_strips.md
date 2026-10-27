# Test Case: TC07 - Đóng dấu chữ ký số 2 bên lề lên TẤT CẢ các trang của file PDF

## 1. Mục tiêu kiểm thử (Objective)
Đảm bảo khi chọn kiểu 2 bên lề, mọi trang trong file tài liệu đều có dải chữ ký ở 2 bên mép lề.

## 2. Tiền điều kiện (Preconditions)
Cấu hình kiểu ký đang là 'Chữ ký số 2 bên lề'. Có bài nộp đang chờ duyệt ở Bước 3.

## 3. Các bước thực hiện (Test Steps)
1. Đăng nhập với vai trò Final Editor (Thủ thư).
2. Chọn bài nộp và nhấn 'Ký số & Duyệt lưu chiểu'.
3. Mở xem file tài liệu đã ký qua từng trang (Trang 1, 2, 3...).

## 4. Kết quả mong đợi (Expected Result)
Tất cả các trang của tài liệu đều xuất hiện dải chữ ký 2 bên lề, không trang nào bị bỏ sót.

## 5. Trạng thái kiểm thử (Status)
- **Mức độ ưu tiên:** High
- **Phân loại:** Functional / E-Signature Test
- **Người thực hiện:** Nguyễn Trần Hữu Đức
- **Kết quả:** Pass
