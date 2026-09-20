# NUTE AI-Native Research Intelligence System V5.4

V5.4 bổ sung native file input đúng chuẩn Responses API, phân quyền phê duyệt 4 cấp, Dashboard luồng hồ sơ và xuất Lý lịch khoa học. Xem `RELEASE-NOTES-V5.4.md`.

# NUTE AI-Native Research Intelligence System — SBBS V5.2

V5.2 sửa ba điểm nền tảng của V5: **Multi-AI ecosystem**, **quản lý theo đơn vị**, và **workflow Human + AI có nhánh trả lại/chỉnh sửa**. Mục tiêu không thay đổi: AI đồng hành với người nghiên cứu và người quản trị xuyên suốt vòng đời tạo ra tri thức, nhưng quyết định nghiệp vụ cuối cùng luôn thuộc con người.

## Kiến trúc SBBS

```text
Assembly-NUTE-001-Research-Intelligence-System
              |
              +-- Research / Organization / Governance Smart Boxes
              +-- Researcher Intelligence Smart Boxes
              +-- Institutional Intelligence Smart Boxes
              |
              +-- Capability Contracts
                       |
                       +-- Smart Wire Registry
                               |
                               +-- AI Router / AI Gateway / Storage / Document adapters
```

Dependency hợp lệ:

`Assembly -> Smart Box -> Capability Contract -> Wire Adapter -> Technology`

## 1. Multi-AI ecosystem

RIS không còn phụ thuộc một provider/model duy nhất.

- Hỗ trợ OpenAI, Gemini, Anthropic, OpenRouter, Groq, Ollama và custom OpenAI-compatible endpoint.
- Mỗi provider có `enabled`, `primary`, `priority`, `routes`.
- Router chọn model theo route: `general`, `academic`, `decision`, `workflow`, `portfolio`.
- Nếu provider ưu tiên lỗi/quota/không có quyền, RIS tự thử provider phù hợp tiếp theo.
- Model discovery lọc model không phù hợp với sinh nội dung như embedding/audio/moderation/image/realtime và các model legacy đã biết như `babbage-002`.
- RIS **không tự chọn model đầu tiên** sau khi lấy danh sách; quản trị viên phải chủ động chọn model.

## 2. Quản lý theo đơn vị

V5.2 có `SBBox-NUTE-034-Organization` và collection `organizations`.

- Cấu hình Trường/Khoa/Bộ môn/Phòng/Trung tâm/đơn vị khác.
- Người dùng có `organizationId`.
- Research Object có `organizationId`.
- Role có thể được cấp `research.read.unit` để đọc hồ sơ cùng đơn vị.
- Danh mục và AI context giữ thông tin đơn vị để phân tích đúng phạm vi.

## 3. Workflow Human + AI

Workflow hỗ trợ nhánh tiến và nhánh trả lại/chỉnh sửa.

Ví dụ:

```text
DRAFT -> SUBMITTED
SUBMITTED -> APPROVED
SUBMITTED -> REVISION_REQUIRED
REVISION_REQUIRED -> SUBMITTED
APPROVED -> IN_PROGRESS
IN_PROGRESS -> RESULT_SUBMITTED
RESULT_SUBMITTED -> COUNCIL_REVIEW
RESULT_SUBMITTED -> IN_PROGRESS
COUNCIL_REVIEW -> COMPLETED
COUNCIL_REVIEW -> IN_PROGRESS
COMPLETED -> RECOGNIZED
```

Tại các `decisionGate`:

1. AI đọc hồ sơ, file, minh chứng, workflow, tri thức/quy chế và đưa khuyến nghị.
2. Người có thẩm quyền xem khuyến nghị.
3. Người đó quyết định phê duyệt/trả lại/chuyển bước.
4. Căn cứ/lý do và AI advice được lưu tách biệt để audit.

AI không tự chuyển trạng thái hồ sơ.

## 4. Document Intelligence

PDF/DOC/DOCX/TXT/MD/RTF được lưu và trích xuất qua capability `document.text.extract`. Nội dung trích xuất được đưa vào Research Context và Workflow/Knowledge Context cho AI.

## Chạy

Yêu cầu Node.js 22+.

```bash
npm install
npm start
```

Mở `http://localhost:3000`.

## Development storage

- structured state: `data/db.json`
- uploaded files/evidence: `data/uploads/`
- local encryption key: `data/system.key` nếu không cấu hình `NUTE_MASTER_ENCRYPTION_KEY`

Đây chỉ là **HOW** của development Wire. Smart Box không phụ thuộc các đường dẫn/công nghệ này.

## Test

```bash
npm run check
npm test
```

Bản phát hành V5.2 có 24 automated tests.

## Nâng cấp V5 -> V5.2

Xem `MIGRATION-v5-to-v5.1.md`.

## GitHub

```bash
git init
git add .
git commit -m "NUTE AI-Native RIS SBBS V5.2"
git branch -M main
git remote add origin https://github.com/<account>/<repo>.git
git push -u origin main
```

Không commit `data/`, `.env`, API keys hay minh chứng thật.


## V5.2 additions
- Multi-file upload with add/remove before submit across research, evidence, workflows, knowledge and AI analysis.
- AI analysis of saved policy/regulation documents.
- Personnel directory by organization with account provisioning.
- Research capability profile linked to organization.
- Scientific profile with system sync and document management.

## V5.3 - Native Document AI & Scientific Sync

V5.3 sửa hai vấn đề vận hành quan trọng:

- PDF không có lớp text hoặc parser thất bại vẫn có thể được AI đọc trực tiếp qua provider hỗ trợ PDF native (OpenAI Responses, Gemini, Anthropic).
- Hồ sơ khoa học đồng bộ trực tiếp dữ liệu định danh, đơn vị, hồ sơ năng lực, hoạt động nghiên cứu, công bố/SHTT, minh chứng, hội đồng và công nhận từ RIS.

Sau khi nâng cấp từ V5.2, chạy lại `npm install` trước `npm start`.
