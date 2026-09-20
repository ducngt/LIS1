# Capability Contract: document.native.ai.read

## Intent
Cho phép một Smart Box yêu cầu AI đọc trực tiếp tệp tài liệu khi lớp trích xuất văn bản cục bộ không tồn tại hoặc không đầy đủ.

## Input
- `attachments[]`: `{ name, mimeType, base64, size? }`
- `task`: yêu cầu phân tích
- `context`: ngữ cảnh nghiệp vụ đã được phân quyền

## Output
- nội dung phân tích do `ai.inference` trả về
- provider/model thực hiện
- lịch sử fallback

## Rules
1. Box không phụ thuộc OpenAI/Gemini/Anthropic.
2. Wire AI Gateway quyết định provider có khả năng đọc PDF native.
3. Human giữ quyền quyết định hành chính/học thuật cuối cùng.
4. Nếu có text extraction thì dùng text làm context; nếu PDF không có text, hệ thống được phép chuyển PDF trực tiếp tới provider hỗ trợ document understanding.
