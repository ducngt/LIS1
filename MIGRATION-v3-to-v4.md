# Nâng cấp V3 -> V4

V4 dùng migration cộng thêm, không đổi cấu trúc các collection V3 hiện có.

## Nếu đang dùng dữ liệu V3
1. Dừng server V3.
2. Sao lưu toàn bộ thư mục `data/` và biến `NUTE_MASTER_ENCRYPTION_KEY` nếu đang dùng.
3. Giải nén V4 vào thư mục mới.
4. Chép `data/` cũ vào V4 hoặc mount volume cũ.
5. Giữ nguyên encryption key cũ.
6. Chạy `npm start`.

V4 tự nâng `schemaVersion` lên 4 và bổ sung các collection rỗng khi cần:
- `researchMilestones`
- `researchSources`
- `researchNotes`
- `academicAnalyses`

Không cần seed dữ liệu nghiệp vụ.
