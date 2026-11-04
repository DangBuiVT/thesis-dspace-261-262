# Test Case: TC15 - Lưu và áp dụng cấu hình kiểu chữ ký số trong Admin Panel

## 1. Mục tiêu kiểm thử (Objective)
Xác nhận cài đặt kiểu ký được lưu bền vững (Persistent) và áp dụng cho các lần ký tiếp theo.

## 2. Tiền điều kiện (Preconditions)
Đăng nhập tài khoản Admin.

## 3. Các bước thực hiện (Test Steps)
1. Đổi kiểu chữ ký sang 'Chữ ký số chéo'.
2. Nhấn 'Lưu cấu hình'.
3. Tải lại trang (F5) và kiểm tra giá trị đã lưu.

## 4. Kết quả mong đợi (Expected Result)
Cấu hình 'Chữ ký số chéo' vẫn được giữ nguyên sau khi tải lại trang và được áp dụng khi ký tài liệu mới.

## 5. Trạng thái kiểm thử (Status)
- **Mức độ ưu tiên:** High
- **Phân loại:** Functional / E-Signature Test
- **Người thực hiện:** Nguyễn Trần Hữu Đức
- **Kết quả:** Pass
