# NUTE RIS V6.0.3 — Real AI Unified Router

Hotfix hợp nhất AI Model Registry với AI Research Copilot/Continuous AI. Các nút mang nhãn AI thật không còn rơi xuống gpt-demo/OpenAI Demo. API key chỉ ở sessionStorage.

# NUTE RIS GitHub Pages V6.0.1

> Continuous AI Activity Orchestration — Phase 1. AI tự quan sát và phân tích 7 decision point quan trọng; Human + AI governance vẫn giữ quyền quyết định có thẩm quyền cho con người.

## Kế thừa từ V5.5.1

V6.0 giữ nguyên AI Form Studio và Digital Signature Capability/Adapter của V5.5.1, đồng thời bổ sung Continuous AI Activity Orchestration Phase 1.

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


## V6.0.2 Registry hotfix
AI Model Registry tests providers directly from the browser. API keys are session-only and are never persisted to repository/localStorage.
