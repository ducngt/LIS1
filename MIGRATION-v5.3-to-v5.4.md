# Nâng cấp V5.3 → V5.4

1. Dừng server V5.3.
2. Sao lưu toàn bộ thư mục `data/` và biến `NUTE_MASTER_ENCRYPTION_KEY` nếu đang dùng.
3. Giải nén V5.4.
4. Chép/mount lại `data/` cũ.
5. Chạy `npm install` rồi `npm start`.
6. V5.4 tự nâng `schemaVersion` lên 9 và thêm các role hệ thống còn thiếu.

Dữ liệu hồ sơ, tài khoản, API key mã hóa, tài liệu và minh chứng không bị thay đổi.
