# NUTE RIS V7.1 — Domain Workspaces

V7.1 adds role/scoped workspaces on top of the V7.0 Agentic runtime. See `ARCHITECTURE-V7.1-DOMAIN-WORKSPACES.md` and `RELEASE-NOTES-V7.1.md`.

# NUTE Research Intelligence System — V7.0 Agentic Research Intelligence System

Bản GitHub Pages V7.0 kế thừa V6.0.3 Real AI Unified Router và bổ sung kiến trúc Agentic AI cho toàn bộ RIS.

## Điểm mới
- 9 AI Agent chuyên trách + Agent Supervisor.
- AI Agent Center, Tool Registry, Agent Task Monitor và Decision Memory.
- Executive Intelligence cho Ban giám hiệu.
- Context-aware Agent Dock trên toàn hệ thống.
- Multimodal: text, document, image/camera, audio/recording, voice và video (khả năng phân tích phụ thuộc model/provider).
- Event-driven agents cho 7 decision point hiện hữu.
- Scheduled Workflow/Portfolio monitoring.
- Model-directed tool calls với permission checks.
- Human-AI Governance giữ quyền quyết định chính thức cho con người.

## Real AI
Vào **AI Model Registry**, nhập API key thật, chọn model, kiểm tra kết nối và lưu Registry. Agent Runtime dùng Unified Router này; không dùng `gpt-demo`.

## Demo accounts
- `admin / admin123`
- `researcher / demo123`
- `level2 / demo123`
- `level3 / demo123`
- `level4 / demo123`

## GitHub Pages
Upload toàn bộ file của package vào root `main`, giữ Pages = Deploy from branch / main / root. Mở Incognito hoặc Ctrl+F5 sau deploy.

## Production warning
Đây là browser pilot. Không dùng demo credentials, localStorage/sessionStorage hoặc browser BYOK làm security boundary production. Production cần backend Agent Runtime, database, secrets, queue, object storage và audit server-side.
