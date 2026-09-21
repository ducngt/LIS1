# Deploy NUTE RIS V6.0 lên GitHub Pages

1. Tạo branch backup từ bản đang chạy ổn trước khi ghi đè `main`.
2. Upload toàn bộ file trong package V6.0 vào root repository trong cùng một commit.
3. Giữ Pages: `Deploy from a branch` → `main` → `/(root)`.
4. Kiểm tra các URL tải được: `index.html`, `app.js`, `mock-api.js`, `ai-activity-orchestrator.js`, `digital-signature-capability.js`, `government-specialized-ca-adapter.js`.
5. Mở Incognito để tránh cache/localStorage cũ gây nhầm lẫn.
6. Đăng nhập và vào **AI Settings** để cấu hình BYOK nếu muốn 7 decision point dùng AI thật.
7. Vào **AI Decision Center** để xác nhận 7 AI Activity Policies đang bật.

## Smoke test Phase 1
- Tạo hồ sơ → `RESEARCH_CREATED`.
- Tải tài liệu → `DOCUMENT_UPLOADED`.
- Gửi minh chứng → `EVIDENCE_SUBMITTED`.
- Xác minh/từ chối minh chứng → `EVIDENCE_VERIFIED`.
- Chuyển workflow → `WORKFLOW_TRANSITION`.
- Ghi kết quả hội đồng → `COUNCIL_RESULT`.
- Công nhận → `RECOGNITION`.

Sau mỗi hoạt động, mở hồ sơ hoặc AI Decision Center để xem structured recommendation. Nếu BYOK/provider lỗi, V6.0 phải tiếp tục nghiệp vụ và ghi recommendation fallback có kiểm soát.
