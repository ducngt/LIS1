# NUTE RIS V5.4.1 Hotfix

Sửa lỗi giao diện V5.4 khiến Dashboard dừng ở “Đang tải...” và trang “Hồ sơ nghiên cứu” báo `research is not defined`.

Nguyên nhân: trong quá trình hợp nhất V5.4, các hàm giao diện `researchRows`, `research`, `researchModal` và `openResearch` bị bỏ sót khỏi `public/app.js`, trong khi router và Dashboard vẫn gọi các hàm này.

V5.4.1 khôi phục đầy đủ:
- danh sách hồ sơ nghiên cứu;
- tạo hồ sơ / đăng ký hoạt động;
- mở chi tiết hồ sơ;
- tài liệu, minh chứng, hội đồng;
- thao tác workflow theo vai trò;
- AI hỗ trợ hồ sơ;
- Research Intelligence trong hồ sơ.

Không thay đổi schema dữ liệu. Có thể dùng nguyên thư mục `data/` của V5.4.
