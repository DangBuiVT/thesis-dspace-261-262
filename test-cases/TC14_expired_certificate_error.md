# Test Case: TC14 - Xử lý khi chứng thư số hết hạn (Expired Certificate Handling)

## 1. Mục tiêu kiểm thử (Objective)
Đảm bảo hệ thống từ chối ký và hiển thị thông báo lỗi rõ ràng nếu chứng thư số đã quá hạn.

## 2. Tiền điều kiện (Preconditions)
Cấu hình ngày hết hạn của chứng thư thử nghiệm về thời điểm trong quá khứ.

## 3. Các bước thực hiện (Test Steps)
1. Thực hiện lệnh ký số cho một tài liệu.
2. Quan sát phản hồi của hệ thống ký số.

## 4. Kết quả mong đợi (Expected Result)
Hệ thống từ chối ký, giữ nguyên trạng thái tài liệu và báo lỗi 'Chứng thư số của Thư viện đã hết hạn'.

## 5. Trạng thái kiểm thử (Status)
- **Mức độ ưu tiên:** High
- **Phân loại:** Functional / E-Signature Test
- **Người thực hiện:** Nguyễn Trần Hữu Đức
- **Kết quả:** Pass
