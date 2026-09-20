# NUTE RIS V5.3.0

## Sửa lỗi trọng tâm

### 1. AI đọc tệp đính kèm thực sự
V5.2 chỉ phân tích phần `extractedText`. Vì vậy PDF scan hoặc PDF mà bộ parser lỗi sẽ hiển thị `FAILED` và AI không nhận được chính tệp đó.

V5.3 thêm hai tầng:
- trích xuất cục bộ mạnh hơn: `pdfjs-dist -> pdf-parse`, `mammoth -> word-extractor`;
- native document fallback: PDF được truyền trực tiếp qua `ai.inference` cho OpenAI Responses, Gemini và Anthropic khi cần.

Các PDF V5.2 cũ có trạng thái `FAILED` vẫn được nhận diện lại theo phần mở rộng và có thể dùng native AI mà không bắt buộc tải lại.

### 2. Quy trình và Kho tri thức
Nút AI phân tích không còn từ chối chỉ vì `extractedText` rỗng. Nếu tệp là PDF, AI Router có thể gửi tài liệu gốc tới provider hỗ trợ đọc PDF.

### 3. AI Research Copilot / Academic Workspace
Các PDF chọn trực tiếp được gửi kèm request AI. DOC/DOCX/TXT tiếp tục được trích xuất cục bộ thành text trước khi gọi AI.

### 4. Hồ sơ khoa học đồng bộ RIS
Đồng bộ giờ tổng hợp trực tiếp:
- định danh và đơn vị;
- mã nhân sự/chức danh;
- hồ sơ năng lực nghiên cứu;
- hoạt động tham gia;
- hoạt động đã công nhận;
- công bố;
- sở hữu trí tuệ;
- đề tài;
- minh chứng đã xác minh;
- hội đồng và quyết định công nhận.

Nút `Đồng bộ dữ liệu RIS` ghi snapshot và tự bổ sung các trường còn trống từ Personnel/Researcher Profile mà không ghi đè dữ liệu người dùng đã khai báo.

## Schema
`schemaVersion: 8`
