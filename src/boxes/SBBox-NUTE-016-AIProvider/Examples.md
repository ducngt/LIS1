# Examples

Provider A có model X với `temperature=false`; AI Wire bỏ trường temperature dù task yêu cầu tạo nội dung.

Provider B có model Y với `temperature=true` và `generation.useTemperature=true`; AI Wire mới thêm trường temperature vào payload.
