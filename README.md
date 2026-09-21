# NUTE AI-Native Research Intelligence System — GitHub Test V5.5.1

Bản V5.5.1 kế thừa đầy đủ V5.5 và bổ sung Digital Signature Capability/Adapter độc lập theo SBBS.

## Tài khoản demo
- `admin / admin123`
- `researcher / demo123`
- `level2 / demo123`
- `level3 / demo123`
- `level4 / demo123`

## Kiểm thử chữ ký
1. Đăng nhập tài khoản approver hoặc admin.
2. Vào **Chữ ký & chứng thư số**.
3. Chọn `WebCrypto Test Adapter` để test ngay, hoặc đăng ký chứng thư `.cer/.crt/.pem` và chọn `Government Specialized CA Adapter`.
4. Người nghiên cứu tạo biểu mẫu và **Gửi kiểm duyệt**.
5. Đăng nhập `level2`, ký cấp 2; tiếp tục `level3`, rồi `level4`.
6. Sau khi đủ ba cấp, trạng thái là `FULLY_SIGNED`.
7. Tải Word/HTML hoặc In/Lưu PDF để kiểm tra dữ liệu và thông tin ký.

## Lưu ý
`Government Specialized CA Adapter` là adapter production-ready về mặt contract nhưng trên GitHub Pages cần một **Signature Bridge/PKI service** để thực sự truy cập USB Token/remote signing và xác minh chain/OCSP/CRL. Không lưu private key trong trình duyệt/RIS.
