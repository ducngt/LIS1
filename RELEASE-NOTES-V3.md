# NUTE RIS V3.0.0

## Trọng tâm

V3 đưa AI Model Registry từ cấu hình provider đơn giản lên registry có metadata capability theo từng model.

## Thay đổi chính

- Model discovery từ provider API.
- Capability metadata: streaming, temperature, vision, JSON mode, reasoning, tool calling, embeddings.
- Capability probe cho kết nối + temperature.
- Safe-by-default: không gửi temperature nếu chưa xác nhận hỗ trợ.
- Generation policy tách riêng capability metadata.
- Giao diện sidebar, form, bảng và registry tăng cỡ chữ, khoảng trắng và nhịp thị giác.
- Health API: `version=3.0.0`, `modelCapabilityRegistry=true`, `schemaVersion=3`.
- 13 automated tests PASS.

## Tương thích

Dữ liệu V2 có thể chuyển sang V3 theo `MIGRATION-v2-to-v3.md`.
