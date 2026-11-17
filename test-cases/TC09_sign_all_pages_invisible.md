# Test Case: TC09 - Áp dụng ký số vô hình lên TẤT CẢ các trang

## 1. Mục tiêu kiểm thử (Objective)
Xác nhận ký số vô hình áp dụng cho toàn bộ file mà không vẽ bất kỳ ký tự nào lên các trang.

## 2. Tiền điều kiện (Preconditions)
Cấu hình kiểu ký đang là 'Không chữ ký số'.

## 3. Các bước thực hiện (Test Steps)
1. Duyệt lưu chiểu bài nộp.
2. Mở file PDF kết quả kiểm tra từng trang.
3. Kiểm tra thông tin metadata chứng thư điện tử đính kèm.

## 4. Kết quả mong đợi (Expected Result)
Các trang PDF giữ nguyên vẹn 100% hình ảnh ban đầu, không có vết dấu; thông tin ký số được lưu trong chứng chỉ điện tử.

## 5. Trạng thái kiểm thử (Status)
- **Mức độ ưu tiên:** High
- **Phân loại:** Functional / E-Signature Test
- **Người thực hiện:** Nguyễn Trần Hữu Đức
- **Kết quả:** Pass
