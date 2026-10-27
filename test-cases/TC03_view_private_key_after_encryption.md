# Test Case: TC03 - Kiểm tra hiển thị Private Key cho kỹ thuật viên/Admin sau khi tính toán mã hóa

## 1. Mục tiêu kiểm thử (Objective)
Cho phép kỹ thuật viên (Đức) xem Private Key và Payload mã hóa để kiểm tra, đối chiếu sau khi ký file.

## 2. Tiền điều kiện (Preconditions)
Đăng nhập bằng tài khoản Quản trị viên (BKlib Admin) hoặc mở chi tiết bài nộp đã được ký số.

## 3. Các bước thực hiện (Test Steps)
1. Mở xem chi tiết một luận văn đã hoàn tất duyệt và ký số.
2. Cuộn đến khối 'Chi tiết Mật mã học & Private Key (Dành cho Kỹ thuật viên)'.
3. Kiểm tra chuỗi Private Key hiển thị sau quá trình tính toán mã hóa.

## 4. Kết quả mong đợi (Expected Result)
Giao diện hiển thị đầy đủ Private Key dạng PEM, SHA-256 hash và payload dữ liệu ký đã tính toán.

## 5. Trạng thái kiểm thử (Status)
- **Mức độ ưu tiên:** High
- **Phân loại:** Functional / E-Signature Test
- **Người thực hiện:** Nguyễn Trần Hữu Đức
- **Kết quả:** Pass
