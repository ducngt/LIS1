# Release Notes — V5.1.0

## Fixed
- Không còn tự chọn phần tử đầu tiên của `/models`; tránh trường hợp `babbage-002` bị dùng cho AI analysis.
- Model discovery lọc model legacy và endpoint không phù hợp text generation.
- AI invocation không còn phụ thuộc một `active provider` duy nhất.

## Added
- Multi-AI Router với route, priority, primary và automatic fallback.
- Organization management, `organizationId` cho user/research, và quyền `research.read.unit`.
- Human+AI workflow decision support.
- `transition-advice` để AI phân tích trước khi người có thẩm quyền quyết định.
- Nhánh `REVISION_REQUIRED` và return-to-execution mẫu trong workflow.
- Workflow decision audit tách `AI_ADVICE` và `HUMAN_DECISION`.
- `SBBox-NUTE-034-Organization`.
- `SBBox-NUTE-035-AIRouting`.

## Governance
AI advice không thực hiện transition. Chỉ human action có permission mới thay đổi trạng thái nghiệp vụ.
