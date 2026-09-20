# Rules

1. API key phải được mã hóa server-side và không trả key gốc về frontend.
2. Model capability phải được lưu độc lập theo từng provider/model.
3. Optional parameter không được gửi nếu capability chưa xác nhận.
4. `temperature` mặc định không gửi (safe-by-default).
5. Capability probe là hỗ trợ kỹ thuật; không được hiểu là chứng nhận chất lượng model.
6. Mọi thay đổi cấu hình và probe phải ghi audit.
