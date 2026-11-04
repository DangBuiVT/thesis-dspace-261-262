# Test Case: TC20 - Kiểm tra ghi vết lịch sử ký số và số serial chứng thư

## 1. Mục tiêu kiểm thử (Objective)
Đảm bảo mỗi lần ký số đều được ghi nhận vào lịch sử luồng (Audit Log) kèm số serial và thời gian.

## 2. Tiền điều kiện (Preconditions)
Ký số thành công một tài liệu.

## 3. Các bước thực hiện (Test Steps)
1. Xem phần 'Lịch sử phê duyệt' (Approval History) của bài nộp.
2. Kiểm tra dòng thông tin sự kiện ký số.

## 4. Kết quả mong đợi (Expected Result)
Lịch sử ghi rõ thời gian ký, người ký, số hiệu chứng thư (BK-VN-YYYY-XXXXXX) và mã định danh Handle DSpace.

## 5. Trạng thái kiểm thử (Status)
- **Mức độ ưu tiên:** High
- **Phân loại:** Functional / E-Signature Test
- **Người thực hiện:** Nguyễn Trần Hữu Đức
- **Kết quả:** Pass
