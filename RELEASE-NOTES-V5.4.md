# NUTE RIS V5.4.0

## Mục tiêu
V5.4 khắc phục lỗi gửi tệp PDF tới OpenAI Responses API, chuẩn hóa phân quyền 4 cấp và bổ sung theo dõi luồng hồ sơ trên Dashboard.

## Thay đổi chính

### 1. Native file input đã sửa đúng chuẩn OpenAI
`file_data` dùng Data URI: `data:<mime>;base64,<payload>`. PDF có `detail: auto`.

### 2. Phân quyền quản trị nghiên cứu 4 cấp
- `SYSTEM_ADMIN`: toàn hệ thống.
- `RESEARCH_PARTICIPANT`: cá nhân đăng ký/thực hiện, AI hỗ trợ.
- `APPROVER_LEVEL_2`: Bộ môn/Khoa/Hội đồng, phạm vi đơn vị.
- `APPROVER_LEVEL_3`: Phòng/Trung tâm, phạm vi toàn trường.
- `APPROVER_LEVEL_4`: Hiệu trưởng/Ban Giám hiệu, phê duyệt/công nhận cấp cuối.

Workflow mẫu dùng các quyền `research.approve.level2`, `research.approve.level3`, `research.approve.level4`, có nhánh trả lại chỉnh sửa và `aiAssist: true` ở các điểm quyết định.

### 3. Dashboard luồng hồ sơ
Mỗi người dùng nhìn thấy trạng thái hiện tại, bước tiếp theo, AI+Human gate và quyết định gần nhất đối với hồ sơ mà họ được phép truy cập.

### 4. Lý lịch khoa học
Cá nhân có thể xuất Lý lịch khoa học dạng A4 để in/lưu PDF. Người có quyền `scientific.profile.approve` hoặc `user.manage` có thể xuất hồ sơ khoa học của nhân sự được liên kết tài khoản.

> Lưu ý: mẫu xuất V5.4 là mẫu RIS/NUTE cấu trúc chuẩn. Nếu Nhà trường có biểu mẫu Lý lịch khoa học chính thức riêng, cần đưa file mẫu DOCX/PDF để ánh xạ trường và định dạng chính xác 1:1.
