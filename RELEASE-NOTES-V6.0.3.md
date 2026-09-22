# RELEASE NOTES V6.0.3 — Real AI Unified Router

- Hợp nhất AI Model Registry và Browser AI Settings thành một nguồn cấu hình runtime.
- Provider thật đã lưu trong Registry tự động trở thành provider của Copilot/Orchestrator theo primary/priority.
- Vô hiệu hóa provider seed `gpt-demo`/`gemini-demo` khỏi routing.
- `/api/ai/assist` không còn fallback sang mock; thiếu provider thật sẽ báo lỗi.
- Chuyển transition advice, workflow analysis, knowledge analysis, AI work-item và portfolio analysis sang Real AI Router.
- Hỗ trợ OpenAI, Gemini, Anthropic, OpenRouter, Groq, Ollama, OpenAI-compatible custom.
- Giữ controlled structured fallback chỉ cho background Continuous AI event khi provider không sẵn sàng; fallback được ghi rõ là fallback, không giả danh provider thật.
