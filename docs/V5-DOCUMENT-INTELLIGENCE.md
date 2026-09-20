# RIS V5 — Document Intelligence

V5 đưa tài liệu PDF/DOC/DOCX/TXT/MD/RTF vào đúng cấu trúc SBBS:

`Smart Box -> document.text.extract contract -> Wire-Adapter-DocumentExtractor -> parser implementation`.

Các Smart Box không biết `pdf-parse`, `mammoth` hay `word-extractor`. Chúng chỉ yêu cầu capability `document.text.extract`.

## Luồng tài liệu

1. Người dùng tải tài liệu.
2. Binary Storage lưu tệp gốc.
3. Document Extraction Wire trích xuất văn bản máy đọc.
4. Metadata, checksum, provenance và trạng thái extraction được lưu.
5. Văn bản trích xuất đi vào Research Context / Institutional Knowledge.
6. AI phân tích tài liệu để hỗ trợ người dùng; AI không tự thay thế quyết định của người có thẩm quyền.

## Loại tài liệu V5

- hồ sơ đăng ký / thuyết minh;
- quy trình / quy chế / rubric / hướng dẫn;
- báo cáo tiến độ;
- báo cáo kết quả;
- tài liệu hội đồng;
- tài liệu hỗ trợ khác.
