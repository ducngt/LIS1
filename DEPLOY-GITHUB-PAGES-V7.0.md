# Deploy V7.0 lên GitHub Pages

1. Giữ branch backup hiện tại (`backup-before-v6.0` hoặc tạo `backup-before-v7.0`).
2. Chuyển về `main`.
3. Giải nén package V7.0.
4. Upload toàn bộ file bên trong thư mục package vào root repo trong một commit; không upload nguyên thư mục cha.
5. Commit: `Upgrade NUTE RIS to V7.0 Agentic Research Intelligence System`.
6. Settings > Pages: Deploy from a branch / main / (root).
7. Chờ Actions `pages build and deployment` xanh.
8. Ctrl+F5/Incognito.
9. Kiểm tra trực tiếp `/agentic-runtime.js`, `/app.js`, `/mock-api.js`.
10. Login, cấu hình Real AI Registry, mở AI Agent Center và thử Agent Dock.

Smoke test tối thiểu:
- 9 agents xuất hiện trong Agent Center.
- Agent Supervisor route câu hỏi nghiên cứu -> Research Copilot.
- Câu hỏi Ban giám hiệu -> Executive Intelligence.
- Research create -> Data Intake Agent task.
- Evidence upload -> Evidence & Document Agent task.
- Council result -> Council & Review Agent task.
- Voice input, camera/file attachment, audio recording controls hiển thị.
- Tool Registry từ chối tool không thuộc agent.
