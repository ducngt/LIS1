# NUTE RIS V6.0 — Continuous AI Activity Orchestration

## Mục tiêu
V6.0 nâng bản GitHub Pages V5.5.1 từ mô hình "có chức năng AI" sang mô hình AI quan sát và phân tích liên tục các hoạt động nghiệp vụ có ý nghĩa, trong khi vẫn giữ Human + AI governance.

## Phase 1 đã triển khai

### AIActivityOrchestrator
File mới: `ai-activity-orchestrator.js`.

Nhiệm vụ:
- nhận domain activity từ UI/API layer;
- tra `AIActivityPolicy`;
- xây context đã loại binary/base64;
- gọi AI thật qua BYOK khi được cấu hình;
- yêu cầu structured recommendation JSON;
- chuẩn hóa output;
- lưu event, analysis, recommendation, human decision và audit vào localStorage;
- fallback có kiểm soát khi provider/CORS/network lỗi.

### 7 activity được nối tự động
1. `RESEARCH_CREATED`
2. `WORKFLOW_TRANSITION`
3. `EVIDENCE_SUBMITTED`
4. `DOCUMENT_UPLOADED`
5. `EVIDENCE_VERIFIED`
6. `COUNCIL_RESULT`
7. `RECOGNITION`

### AIActivityPolicy
Mỗi activity có policy gồm:
- enabled;
- trigger;
- profile;
- route;
- autonomy;
- blocking;
- minimumConfidence;
- requiresHumanDecision.

Decision Center cho phép bật/tắt policy và đổi autonomy level trong bản test.

### Structured Recommendation
Schema chuẩn gồm:
- assessment/status/confidence/riskLevel;
- findings;
- recommendation/action/reasoningSummary/suggestedActions;
- citations;
- constraints;
- requiresHumanDecision.

### Human + AI Governance
Recommendation V6.0 xuất hiện trong AI Decision Center và có thể được con người:
- chấp nhận;
- điều chỉnh;
- bác bỏ;
- ghi rationale riêng.

### Continuous AI panel trên hồ sơ
Mỗi ResearchObject hiển thị các recommendation V6.0 gần nhất để người dùng thấy AI đang giám sát xuyên suốt, thay vì chỉ nhìn thấy AI khi bấm nút thủ công.

## AI thật và fallback
- Nếu Browser BYOK đã cấu hình: Orchestrator gọi provider/model thật qua `realAIInfer()`.
- Nếu chưa cấu hình: dùng structured fallback để demo pipeline.
- Nếu AI thật lỗi do CORS/network/provider: nghiệp vụ không bị chặn; hệ thống tạo controlled fallback và ghi audit `AI_PROVIDER_FALLBACK`.

## Giới hạn GitHub Pages
V6.0 này vẫn là browser-only test deployment:
- state nằm trong localStorage của từng browser;
- API key BYOK ở sessionStorage;
- không có server queue / persistent shared DB;
- không có secret vault;
- background jobs chỉ tồn tại khi trang/browser đang hoạt động.

Để triển khai production cần chuyển Orchestrator, event bus, policy store, work queue và audit persistence sang backend SBBS.
