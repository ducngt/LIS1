# NUTE AI-Native RIS V5.0.0

- Tăng cỡ chữ toàn hệ thống theo hướng accessibility-first.
- Upload PDF/DOC/DOCX/TXT/MD/RTF cho kho tri thức, workflow và hồ sơ nghiên cứu.
- Trích xuất văn bản qua capability `document.text.extract` và đưa vào AI context.
- AI phân tích tài liệu quy trình để hỗ trợ quản trị viên cấu hình workflow.
- Hồ sơ đăng ký có thể đính kèm file ngay khi tạo.
- Người dùng chỉ thấy/kích hoạt thao tác workflow phù hợp với quyền: đăng ký, phê duyệt, nộp kết quả, hội đồng, công nhận.
- AI Model Registry kiểm tra API key trước khi cần Model ID và lấy model trực tiếp từ provider.
- OpenAI adapter chuyển sang Responses API mặc định; không hard-code `temperature`.
- Thông báo lỗi API key/model/quota rõ hơn.
