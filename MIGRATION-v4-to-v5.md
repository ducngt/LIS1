# Nâng cấp RIS V4 -> V5

1. Dừng V4 và sao lưu toàn bộ thư mục `data/`.
2. Giữ nguyên `data/system.key` hoặc biến môi trường `NUTE_MASTER_ENCRYPTION_KEY` đang dùng.
3. Cài V5 và chạy `npm install` để cài các parser tài liệu.
4. Chép/mount thư mục `data/` cũ vào V5.
5. Chạy `npm start`.

Schema V5 chỉ bổ sung `researchDocuments`; các collection V4 được giữ nguyên.

AI Provider OpenAI trong V5 dùng Responses API theo mặc định. Endpoint để trống để dùng endpoint chính thức. Trong AI Model Registry, nhập API key -> `Kiểm tra key & lấy model` -> chọn model -> `Kiểm tra kết nối` -> Lưu.
