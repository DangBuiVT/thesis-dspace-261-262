# Test Case: TC01 - Kiểm tra khởi tạo cặp khóa RSA-2048 cho hệ thống lưu chiểu

## 1. Mục tiêu kiểm thử (Objective)
Đảm bảo cặp khóa Public Key và Private Key chuẩn RSA 2048-bit được sinh hợp lệ.

## 2. Tiền điều kiện (Preconditions)
Hệ thống đang chạy, module mã hóa DigitalSignatureService đã được nạp.

## 3. Các bước thực hiện (Test Steps)
1. Truy cập module khởi tạo chữ ký số.
2. Gọi lệnh lấy thông tin cặp khóa ký số BKlib CA.
3. Kiểm tra định dạng đầu ra của Public Key và Private Key.

## 4. Kết quả mong đợi (Expected Result)
Public Key và Private Key có định dạng chuẩn PEM (chứa BEGIN/END PUBLIC KEY và BEGIN/END RSA PRIVATE KEY), độ dài khóa đạt 2048 bits.

## 5. Trạng thái kiểm thử (Status)
- **Mức độ ưu tiên:** High
- **Phân loại:** Functional / E-Signature Test
- **Người thực hiện:** Nguyễn Trần Hữu Đức
- **Kết quả:** Pass
