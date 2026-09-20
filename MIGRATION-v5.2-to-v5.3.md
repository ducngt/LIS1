# Migration V5.2 -> V5.3

1. Dừng V5.2.
2. Sao lưu toàn bộ thư mục `data/` và khóa `NUTE_MASTER_ENCRYPTION_KEY` nếu đang dùng biến môi trường.
3. Giải nén V5.3 và chạy `npm install` vì V5.3 bổ sung `pdfjs-dist` và `mammoth`.
4. Chép/mount lại thư mục `data/` cũ.
5. Chạy `npm start`.
6. Hệ thống tự nâng `schemaVersion` lên 8.
7. Các PDF cũ có trạng thái `FAILED` không cần tải lại; V5.3 có thể chuyển trực tiếp PDF cho AI provider hỗ trợ document understanding.
8. Vào Hồ sơ khoa học và bấm `Đồng bộ dữ liệu RIS` một lần để ghi snapshot mới.

Không xóa `system.key` hoặc thay master encryption key nếu muốn tiếp tục giải mã API key đã lưu.
