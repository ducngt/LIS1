# Deploy RIS V7.1 to GitHub Pages

1. Create branch `backup-before-v7.1` from the current live `main`.
2. Return to `main`.
3. Extract the V7.1 ZIP locally.
4. Upload all files inside the package root to repository root in one commit.
5. Commit message: `Upgrade NUTE RIS to V7.1 Domain Workspaces`.
6. Wait for GitHub Actions / Pages deployment to succeed.
7. Open the Pages URL in Incognito or hard refresh.

## Smoke test by account
- `admin / admin123` -> Quản trị hệ thống.
- `researcher / demo123` -> Không gian nhà nghiên cứu.
- `level2 / demo123` -> Không gian quản lý đơn vị.
- `level3 / demo123` -> Không gian quản lý cấp trường/phòng.
- `level4 / demo123` -> Executive Intelligence.

Check that sidebar, dashboard, Agent Dock and visible data differ by workspace.
