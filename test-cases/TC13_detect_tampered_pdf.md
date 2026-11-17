# Test Case: TC13 - Phát hiện tệp PDF bị chỉnh sửa trái phép sau khi ký (Tamper Detection)

## 1. Mục tiêu kiểm thử (Objective)
Xác nhận hệ thống phát hiện lỗi và cảnh báo khi nội dung file bị thay đổi dù chỉ 1 byte.

## 2. Tiền điều kiện (Preconditions)
Có tệp PDF đã ký số, tiến hành can thiệp chỉnh sửa 1 byte trong file.

## 3. Các bước thực hiện (Test Steps)
1. Tải file đã bị can thiệp vào công cụ kiểm tra chữ ký số.
2. Bấm 'Kiểm tra tính toàn vẹn'.
3. Quan sát thông báo lỗi.

## 4. Kết quả mong đợi (Expected Result)
Hệ thống cảnh báo lỗi: 'Chữ ký không hợp lệ: Nội dung tài liệu đã bị sửa đổi sau thời điểm ký số'.

## 5. Trạng thái kiểm thử (Status)
- **Mức độ ưu tiên:** High
- **Phân loại:** Functional / E-Signature Test
- **Người thực hiện:** Nguyễn Trần Hữu Đức
- **Kết quả:** Pass
