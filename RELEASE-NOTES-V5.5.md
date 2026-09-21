# Release Notes — V5.5.0

## AI Form Studio
- Sinh bản nháp Form Specification từ một hoặc nhiều quy chế trong Kho tri thức.
- BYOK có thể yêu cầu AI thật trả JSON fields + citation; Demo AI tạo specification an toàn để kiểm thử.
- Version/status: DRAFT, PUBLISHED, RETIRED.
- Mỗi field có citation/NEEDS_REVIEW và chính sách chữ ký.

## Electronic Forms
- Tạo instance từ template, nhập/sửa dữ liệu, gửi kiểm duyệt.
- Khi dữ liệu bị sửa sau ký, chữ ký cũ bị xóa và form quay về DRAFT để tránh dùng chữ ký trên nội dung đã thay đổi.

## Digital Signature
- WebCrypto ECDSA P-256, SHA-256, khóa riêng lưu cục bộ theo trình duyệt/người kiểm duyệt.
- Chữ ký lưu public key, hash nội dung, thời gian, người ký, vai trò; UI xác minh chữ ký trên mỗi lần mở form.
- Vai trò ký: APPROVER_LEVEL_2/3/4 và SYSTEM_ADMIN.
- Đây là chữ ký mật mã cho thử nghiệm; production cần tích hợp PKI/CA để đáp ứng yêu cầu pháp lý/chứng thư số.

## Download / Export fix
- Word-compatible `.doc` chứa dữ liệu và thông tin chữ ký.
- HTML độc lập.
- In/Lưu PDF qua print dialog của trình duyệt.
