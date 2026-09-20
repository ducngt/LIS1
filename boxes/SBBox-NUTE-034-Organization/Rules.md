# Rules

1. Mã đơn vị là duy nhất.
2. Đơn vị cấp trên phải tồn tại nếu được khai báo.
3. `organizationId` là tham chiếu capability, không hard-code tên Khoa/Phòng vào Research Box.
4. Phạm vi đọc theo đơn vị chỉ được cấp khi role có `research.read.unit`.
