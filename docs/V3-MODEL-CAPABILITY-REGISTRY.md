# RIS V3 — Model Capability Registry

## Mục tiêu

V3 tách `AI capability` khỏi đặc tính kỹ thuật của một model cụ thể. Smart Box chỉ yêu cầu `ai.inference`; AI Wire đọc metadata trong Model Registry để dựng request phù hợp.

## Metadata lưu cho từng model

- `chat`
- `streaming`
- `temperature`
- `vision`
- `jsonMode`
- `reasoning`
- `toolCalling`
- `embeddings`
- `modelMetadata`: metadata phát hiện từ API provider (nếu có)
- `generation`: policy cho tham số sinh nội dung

## Safe-by-default

V3 không gửi `temperature` mặc định. Chỉ khi:

1. capability `temperature=true`; và
2. cấu hình `generation.useTemperature=true`

thì Wire Adapter mới đưa `temperature` vào request.

Điều này ngăn lỗi model chỉ hỗ trợ temperature mặc định.

## Model discovery

UI có nút **Lấy danh sách model**. Backend gọi endpoint models tương ứng provider và trả danh sách model key hiện tại có thể nhìn thấy.

## Capability probe

Nút **Dò khả năng model** thực hiện:

1. base connectivity probe không dùng tham số tùy chọn;
2. probe `temperature=0.2`;
3. nếu provider từ chối tham số, registry tự đánh dấu `temperature=false`.

Các capability khác được lưu metadata và có thể cấu hình/tiến hóa theo adapter riêng của provider.
