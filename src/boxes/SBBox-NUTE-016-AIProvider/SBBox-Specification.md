# SBBox-NUTE-016-AIProvider — AI Model Registry

## Mục đích

Quản lý provider, API key mã hóa, Model ID và metadata capability của từng model.

## Contract chính

- đăng ký / cập nhật provider;
- khám phá danh sách model qua provider API;
- lưu model metadata;
- probe tương thích tham số;
- cung cấp metadata cho `ai.inference` Wire.

## Ranh giới

Smart Box không hard-code SDK hay payload của OpenAI/Gemini/Anthropic. Chi tiết giao tiếp thuộc Wire Adapter.
