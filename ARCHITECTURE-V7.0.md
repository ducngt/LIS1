# RIS V7.0 Architecture

## Dependency direction
`User/Event -> Multimodal Layer -> Agent Supervisor -> Agents -> Context Broker / Tool Registry -> Human-AI Governance -> SBBS Capabilities -> Smart Boxes -> Wires -> Technology`

Agent không sở hữu business logic và không truy DB trực tiếp.

## Core agents
1. Data Intake Agent
2. Research Copilot Agent
3. Workflow Agent
4. Evidence & Document Agent
5. Governance & Compliance Agent
6. Administration Agent
7. Council & Review Agent
8. Portfolio Intelligence Agent
9. Executive Intelligence Agent

## Autonomy
- OBSERVE_ONLY
- ADVISORY
- RECOMMEND
- AUTO_REVERSIBLE
- HUMAN_MANDATORY

Critical actions không được hạ dưới HUMAN_MANDATORY.

## Memory
- Session memory: hội thoại hiện tại.
- Entity memory: ResearchObject/Personnel/Council/Workflow.
- Institutional knowledge: policy/regulation/strategy/decision history.

## Production migration
GitHub Pages runtime là adapter test. Production cần API Gateway, Auth/RBAC, Agent Runtime server, job queue, DB/object storage, secrets vault, semantic search, multimodal services và immutable audit.
