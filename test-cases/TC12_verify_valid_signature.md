# Test Case: TC12 - Kiểm tra xác thực chữ ký số hợp lệ (Valid Signature)

## 1. Mục tiêu kiểm thử (Objective)
Kiểm tra hệ thống báo chữ ký số hợp lệ đối với file nguyên gốc sau khi ký.

## 2. Tiền điều kiện (Preconditions)
Luận văn đã được ký số thành công.

## 3. Các bước thực hiện (Test Steps)
1. Mở trang chi tiết luận văn hoặc gọi chức năng xác thực chữ ký số.
2. Hệ thống thực hiện kiểm tra mã băm và chứng thư số.
3. Quan sát trạng thái phản hồi.

## 4. Kết quả mong đợi (Expected Result)
Hệ thống hiển thị trạng thái hợp lệ (Valid - Màu xanh lá), báo tệp toàn vẹn và chứng thư tin cậy.

## 5. Trạng thái kiểm thử (Status)
- **Mức độ ưu tiên:** High
- **Phân loại:** Functional / E-Signature Test
- **Người thực hiện:** Nguyễn Trần Hữu Đức
- **Kết quả:** Pass
