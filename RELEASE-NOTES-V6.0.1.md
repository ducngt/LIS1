# NUTE RIS V6.0.1 — Continuous AI hotfix

- Fix OpenAI Responses REST text extraction (`output[].content[].text`).
- Improve OpenRouter/array content extraction.
- Await AI Activity orchestration after the 7 Phase-1 API events so UI/state is consistent.
- Add `window.NuteAIActivityOrchestrator` alias for diagnostics.
- Replace greedy JSON extraction with balanced-object parsing.
- Migrate Browser BYOK settings key from legacy V5.4.2 naming to V6.0 while preserving current session settings.
- UI no longer labels BYOK configuration as proof that real AI actually answered; actual provider remains attached to each recommendation.

Note: GitHub Pages remains a browser-only test/deployment surface. Backend security boundaries, shared persistence, server-side secrets and authoritative automation require the production backend.
