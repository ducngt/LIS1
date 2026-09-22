# NUTE RIS V7.0 — Agentic Research Intelligence System

V7.0 chuyển RIS từ Continuous AI orchestration sang kiến trúc Agentic AI đa tác nhân, vẫn giữ Human-AI Governance và SBBS capability-first.

## Agent Foundation
- `agentic-runtime.js` với Agent Supervisor, Agent Registry, Tool Registry, Context Broker, Agent Task, Decision Memory và audit.
- 9 agent nghiệp vụ: Data Intake, Research Copilot, Workflow, Evidence & Document, Governance & Compliance, Administration, Council & Review, Portfolio Intelligence, Executive Intelligence.
- Agent Supervisor tự định tuyến theo intent và có thể phối hợp tối đa 3 agent cho một yêu cầu phức tạp.
- Model không đồng nhất với Agent: Agent sử dụng Unified Real AI Router hiện có.

## Agent Tools & Governance
- Tool permission theo từng agent.
- Tool calls từ model được kiểm tra quyền trước khi thực hiện.
- Read tools có thể tự chạy; reversible-write tools trong GitHub Pages chỉ chuẩn bị draft/chờ xác nhận.
- Critical actions tiếp tục thuộc Human Mandatory: approve, recognize, sign, grant role, change policy, allocate budget, disciplinary decision, delete official evidence.

## Continuous Agent Monitoring
- 7 event Phase 1 tiếp tục được quan sát, đồng thời phát sinh Agent Task theo chuyên môn.
- Workflow Agent và Portfolio Intelligence Agent có scheduler 30 phút khi Continuous Monitoring bật và AI thật đã cấu hình.
- V6 AI Activity state được giữ cho tương thích nhưng không gọi AI thật trùng lặp.

## Executive Intelligence
- Dashboard riêng cho lãnh đạo.
- Strategic health, portfolio summary, scenario planning và Decision Memory.
- Executive Agent phối hợp Portfolio/Governance Agent khi câu hỏi yêu cầu.
- AI chỉ tạo Decision Intelligence; quyết định cuối cùng vẫn thuộc người có thẩm quyền.

## Multimodal Agent Dock
- Text, tài liệu, ảnh, camera, audio, ghi âm, video.
- SpeechRecognition cho lệnh giọng nói nếu browser hỗ trợ.
- SpeechSynthesis để đọc câu trả lời.
- MediaRecorder để ghi âm trực tiếp.
- OpenAI/Anthropic/OpenRouter/custom bổ sung image input; Gemini có thể nhận inlineData cho media được model hỗ trợ.
- Khả năng audio/video thực tế phụ thuộc provider/model và giới hạn browser/CORS.

## New UI
- `AI Agent Center`: Agent Registry, enable/disable agent, task monitor, Tool Registry.
- Agent Dock nổi trên toàn hệ thống, context-aware theo hồ sơ đang mở.
- `Executive Intelligence` cho các role có `intelligence.read`.
- Hồ sơ nghiên cứu hiển thị Agentic Continuous Monitoring.

## Security boundary
V7.0 GitHub Pages vẫn là pilot/browser test. Authentication demo, localStorage, sessionStorage và BYOK không phải security boundary production. Bản production phải chuyển Agent Runtime, secrets, RBAC enforcement, persistence, audit và tool execution về backend.
