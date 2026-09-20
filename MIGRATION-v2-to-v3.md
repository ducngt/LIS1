# Nâng cấp NUTE RIS V2 → V3

V3 tương thích dữ liệu V2. Các AI Provider cũ không có `capabilities` sẽ được đọc với cấu hình an toàn: `temperature=false` và các tham số tùy chọn không được gửi.

## Cách nâng cấp an toàn

1. Dừng V2 (`Ctrl+C`).
2. Sao lưu toàn bộ thư mục `data` của V2.
3. Giải nén V3 vào thư mục mới.
4. Chép thư mục `data` từ V2 sang V3.
5. Chạy `npm start`.
6. Vào **AI Model Registry** → mở từng provider → **Dò khả năng model** → lưu lại.

Không cần nhập lại API key nếu đã chép nguyên thư mục `data`, vì secret mã hóa và khóa hệ thống đi cùng dữ liệu cũ.

> Nếu production dùng `NUTE_MASTER_ENCRYPTION_KEY` từ biến môi trường, V3 phải dùng đúng khóa đã dùng ở V2.
