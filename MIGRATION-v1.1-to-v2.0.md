# Nâng cấp NUTE Research SBBS 1.1 → RIS 2.0

## Mục tiêu
Bản 2.0 bổ sung AI Decision Layer nhưng giữ cấu trúc dữ liệu cũ tương thích ngược. Các collection mới (`aiWorkItems`, `aiRecommendations`, `humanDecisions`) tự khởi tạo rỗng khi chưa có.

## Nếu đã có dữ liệu bản 1.1
1. Dừng server bản 1.1.
2. Sao lưu toàn bộ thư mục `data/`.
3. Giải nén bản 2.0 vào thư mục mới.
4. Chép thư mục `data/` từ bản 1.1 sang bản 2.0.
5. Chép/thiết lập lại biến môi trường `NUTE_MASTER_ENCRYPTION_KEY` nếu bạn đã cấu hình ngoài hệ thống. Nếu bản cũ dùng khóa tự sinh nằm trong data, giữ nguyên toàn bộ `data/`.
6. Chạy `npm start`.

Không xóa hoặc sửa trực tiếp `data/db.json` khi chưa có bản sao lưu.
