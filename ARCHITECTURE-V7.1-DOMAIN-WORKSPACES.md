# RIS V7.1 Domain Workspaces Architecture

## Resolution
`Identity -> Roles -> Available Workspaces -> Active Workspace -> Navigation + Dashboard + Agents + Tools + Data Scope`

## Demo mapping
| Login | Role | Workspace | Scope |
|---|---|---|---|
| admin | SYSTEM_ADMIN | ADMIN_WORKSPACE | SYSTEM |
| researcher | RESEARCH_PARTICIPANT | RESEARCHER_WORKSPACE | SELF |
| level2 | APPROVER_LEVEL_2 | MANAGEMENT_WORKSPACE | ORGANIZATION |
| level3 | APPROVER_LEVEL_3 | MANAGEMENT_WORKSPACE | INSTITUTION |
| level4 | APPROVER_LEVEL_4 | EXECUTIVE_WORKSPACE | INSTITUTION |

## Enforcement layers
1. Workspace manifest: UX/navigation/default agents.
2. Agent allow-list: agent runtime may only invoke workspace agents.
3. Tool policy: Tool Registry permission AND Workspace permission.
4. Context Broker: workspace/scope injected into every agent task.
5. RBAC/domain checks: final authority remains in domain API/Smart Box.

## Multi-role
A user with multiple mapped roles receives multiple workspaces and switches explicitly. The UI must not merge all menus into one shell.
