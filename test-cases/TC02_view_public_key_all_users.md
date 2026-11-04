# Test Case: TC02 - Kiểm tra hiển thị Public Key cho tất cả người dùng trên giao diện web

## 1. Mục tiêu kiểm thử (Objective)
Xác nhận bất kỳ người dùng nào (Học viên, Giảng viên, Thư viện, Admin) đều có thể xem Public Key.

## 2. Tiền điều kiện (Preconditions)
Đăng nhập với vai trò bất kỳ (ví dụ: Học viên nộp bài hoặc Reviewer).

## 3. Các bước thực hiện (Test Steps)
1. Nhấp vào nút 'Khóa Công Khai Thư Viện (Public Key)' trên thanh điều hướng/header.
2. Quan sát hộp thoại thông tin chứng thư số mở ra.
3. Nhấp nút 'Sao chép Public Key'.

## 4. Kết quả mong đợi (Expected Result)
Hộp thoại hiển thị đầy đủ chuỗi Public Key PEM, thông tin ĐHQG-HCM / BKlib CA ROOT và thông báo sao chép thành công.

## 5. Trạng thái kiểm thử (Status)
- **Mức độ ưu tiên:** High
- **Phân loại:** Functional / E-Signature Test
- **Người thực hiện:** Nguyễn Trần Hữu Đức
- **Kết quả:** Pass
