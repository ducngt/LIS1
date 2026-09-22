# NUTE RIS V7.1 — Domain Workspaces

V7.1 tách trải nghiệm RIS theo miền làm việc, trong khi RBAC vẫn là lớp quyền thực thi.

## Workspace Registry
- `ADMIN_WORKSPACE` — SYSTEM_ADMIN
- `RESEARCHER_WORKSPACE` — RESEARCH_PARTICIPANT
- `MANAGEMENT_WORKSPACE` — APPROVER_LEVEL_2 / APPROVER_LEVEL_3
- `EXECUTIVE_WORKSPACE` — APPROVER_LEVEL_4 và các executive role tương lai
- `REVIEW_WORKSPACE` — reviewer/council roles tương lai

## Điểm mới
- Workspace Resolver theo role sau đăng nhập.
- Workspace Switcher cho tài khoản có nhiều miền.
- Sidebar/navigation riêng cho từng miền.
- Dashboard riêng: Admin, Researcher, Management, Executive, Review.
- Agent Dock chỉ hiển thị agent được workspace cho phép.
- Agent Runtime giới hạn agent và tool theo workspace.
- Context Broker nhận `workspaceId`, `scopeMode`, `organizationId`, `userId`.
- Tool call cần đồng thời thỏa Agent permission và Workspace policy.
- Scope dữ liệu demo: Researcher=SELF; L2=ORGANIZATION; L3/L4=INSTITUTION.
- Executive workspace có Strategic Intelligence, Portfolio Intelligence, Decision Center và Executive AI.

## Nguyên tắc
`Workspace != Permission`. Workspace quyết định trải nghiệm và context; RBAC/scope quyết định quyền thực.
