# Security Notes

## Không commit bí mật

Không commit các file sau:

- `.env`
- `data/system.key`
- `data/db.json`
- `data/uploads/*`

## Production checklist

1. HTTPS bắt buộc.
2. `COOKIE_SECURE=1`.
3. Cấp `NUTE_MASTER_ENCRYPTION_KEY` bằng secret manager.
4. Backup dữ liệu định kỳ.
5. Chuyển storage sang database transaction-safe nếu có nhiều người dùng đồng thời.
6. Đặt reverse proxy giới hạn kích thước request và rate limit đăng nhập.
7. Không chia sẻ tài khoản quản trị.
8. Rotate API key AI định kỳ.

## Báo lỗi bảo mật

Khi public repository, nên bổ sung địa chỉ email phụ trách an toàn thông tin của đơn vị trước khi công bố rộng rãi.
