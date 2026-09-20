# Migration V5 -> V5.1

V5.1 là migration cộng thêm, không xóa dữ liệu V5.

1. Dừng V5.
2. Sao lưu toàn bộ `data/` và biến `NUTE_MASTER_ENCRYPTION_KEY` nếu đang dùng.
3. Cài source V5.1 và chạy `npm install`.
4. Chép/mount `data/` cũ vào V5.1.
5. Chạy `npm start`. Schema sẽ nâng lên `6`.
6. Vào **Đơn vị** để tạo Khoa/Bộ môn/Phòng/Trung tâm; gán đơn vị cho tài khoản mới và các hồ sơ mới.
7. Vào **AI Model Registry & Router**:
   - mở từng provider cũ;
   - bật `Cho phép Router sử dụng`;
   - đặt `priority` và `routes`;
   - dùng **Kiểm tra key & lấy model** rồi chủ động chọn model phù hợp;
   - không dùng `babbage-002`/model legacy cho phân tích.
8. Workflow V5 cũ vẫn chạy. Để dùng nhánh trả lại và Human+AI decision gate, cập nhật transitions theo mẫu trong giao diện V5.1 hoặc tạo workflow mới.

Provider cũ không có `enabled/routes/priority` sẽ được hiểu theo mặc định tương thích: enabled, route `*`, priority 100; provider `active` cũ vẫn được ưu tiên trước.
