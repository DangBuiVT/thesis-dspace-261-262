# Test Case: TC11 - Kiểm tra tính toán mã băm SHA-256 toàn vẹn cho tệp PDF

## 1. Mục tiêu kiểm thử (Objective)
Đảm bảo hàm băm tính toán chính xác chuỗi SHA-256 đại diện cho nội dung tệp PDF.

## 2. Tiền điều kiện (Preconditions)
Có sẵn tệp PDF mẫu (ví dụ: luanvan_test.pdf).

## 3. Các bước thực hiện (Test Steps)
1. Tải tệp lên cổng nộp luận văn.
2. Quan sát kết quả tính toán SHA-256 hash của hệ thống.
3. Đối chiếu với mã băm sinh bằng công cụ chuẩn (openssl dgst -sha256).

## 4. Kết quả mong đợi (Expected Result)
Mã băm SHA-256 là chuỗi hex 64 ký tự và trùng khớp hoàn toàn với mã băm chuẩn của tệp.

## 5. Trạng thái kiểm thử (Status)
- **Mức độ ưu tiên:** High
- **Phân loại:** Functional / E-Signature Test
- **Người thực hiện:** Nguyễn Trần Hữu Đức
- **Kết quả:** Pass
