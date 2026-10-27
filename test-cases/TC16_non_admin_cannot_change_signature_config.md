# Test Case: TC16 - Kiểm tra phân quyền: Người dùng thông thường không được sửa cấu hình ký số

## 1. Mục tiêu kiểm thử (Objective)
Đảm bảo chỉ có Administrator mới có quyền truy cập và thay đổi tùy chọn hiển thị chữ ký số.

## 2. Tiền điều kiện (Preconditions)
Đăng nhập với vai trò Học viên (Submitter) hoặc Giảng viên (Reviewer).

## 3. Các bước thực hiện (Test Steps)
1. Quan sát thanh menu và các tùy chọn trên giao diện.
2. Thử truy cập mục Quản trị cấu hình ký số.

## 4. Kết quả mong đợi (Expected Result)
Người dùng thường không nhìn thấy tab cấu hình ký số của Admin; chỉ xem được Public Key để xác thực.

## 5. Trạng thái kiểm thử (Status)
- **Mức độ ưu tiên:** High
- **Phân loại:** Functional / E-Signature Test
- **Người thực hiện:** Nguyễn Trần Hữu Đức
- **Kết quả:** Pass
