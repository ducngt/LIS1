# Agent Tool Contract V7.0

Tool là capability của RIS, không phải quyền mặc định của model. Mọi tool call phải đi qua Agent Registry + Tool Registry + Governance.

Browser pilot tools:
- research.list
- research.get
- research.create_draft (prepare only)
- workflow.inspect
- knowledge.list
- personnel.list
- organization.list
- audit.list
- intelligence.portfolio
- intelligence.search
- notification.prepare
- decision.draft

Production tool call record tối thiểu: taskId, agentId, toolId, arguments hash, permission decision, risk class, result status, actor, timestamp, latency và audit reference.
