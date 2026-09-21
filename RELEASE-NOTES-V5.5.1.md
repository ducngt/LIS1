# NUTE Research RIS V5.5.1 — Digital Signature Capability/Adapter

## Mục tiêu
V5.5.1 tách logic chữ ký số khỏi biểu mẫu/workflow thành capability độc lập theo SBBS và tích hợp trở lại quy trình kiểm duyệt biểu mẫu.

## Thành phần mới
- `digital-signature-capability.js`
  - Contract/registry cho `digital.signature.sign`, `digital.signature.verify`, `certificate.inspect`, `certificate.classify`.
  - Quản lý SignatureProfile theo người dùng.
  - Adapter mặc định `browser_demo` dùng WebCrypto ECDSA P-256 để kiểm thử tính toàn vẹn.
  - Parser X.509 tối thiểu cho `.cer/.crt/.pem`: subject, issuer, serial, validity và SHA-256 fingerprint.
- `government-specialized-ca-adapter.js`
  - Adapter riêng `government_specialized_ca`.
  - Không lưu private key trong RIS.
  - Ký/xác minh qua `Signature Bridge` bên ngoài theo contract `/sign` và `/verify`.
  - Khi chưa có bridge, hệ thống không giả vờ rằng chữ ký công vụ đã được xác minh.

## Tích hợp kiểm duyệt
- Biểu mẫu mặc định yêu cầu chữ ký theo thứ tự cấp 2 → cấp 3 → cấp 4.
- Trạng thái sau khi gửi: `PENDING_LEVEL_2_SIGNATURE`.
- Sau mỗi chữ ký chuyển tiếp sang cấp kế tiếp; đủ chữ ký thành `FULLY_SIGNED`.
- Chữ ký gắn với `documentVersion`.
- Sửa dữ liệu làm tăng `documentVersion`, xóa chữ ký cũ và đưa biểu mẫu về `DRAFT`.
- Bản Word/HTML/PDF hiển thị cấp ký, adapter, thuật toán, hash và metadata chứng thư nếu có.

## Màn hình mới
`Chữ ký & chứng thư số`
- Chọn adapter cho tài khoản.
- Đăng ký chứng thư công khai `.cer/.crt/.pem`.
- Xem subject/issuer/serial/thời hạn/fingerprint.
- Admin cấu hình Signature Bridge URL và các issuer pattern hỗ trợ nhận diện chứng thư chuyên dùng công vụ.

## Giới hạn của GitHub Pages
GitHub Pages không thể trực tiếp sử dụng private key trong USB Token/CSP/PKCS#11 và không tự thực hiện đầy đủ chain validation/OCSP/CRL. Vì vậy adapter công vụ chỉ trở thành production khi kết nối Signature Bridge/PKI service do Nhà trường kiểm soát. WebCrypto adapter chỉ là adapter kiểm thử.
