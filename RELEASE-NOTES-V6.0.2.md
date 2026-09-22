# NUTE RIS V6.0.2 — Real AI Registry Hotfix

- AI Model Registry no longer uses mock `/api/ai/providers/test`, `/models`, or `/probe` responses.
- Real browser-side provider testing/model discovery for OpenAI, Gemini, Anthropic, OpenRouter, Groq, Ollama and OpenAI-compatible custom endpoints.
- Registry API keys are kept only in `sessionStorage` for the current browser session; they are not written to mock/localStorage state.
- Saved-provider test refuses to claim success when no session key is available.
- Removes false-positive `demo-model` connection success.
- Keeps V6.0.1 Continuous AI fixes.
