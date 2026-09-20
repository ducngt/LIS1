# Rules
- Giữ provenance giữa manual data và system snapshot.
- Tệp hồ sơ khoa học phải có checksum và metadata.
- Xóa tệp phải được audit.

## V5.4 — Export governance
- Cá nhân được xuất hồ sơ khoa học của chính mình khi có capability `scientific.profile.export`.
- Người phê duyệt/Quản trị được xuất hồ sơ khoa học của người khác khi có `scientific.profile.approve` hoặc `user.manage`.
- Đơn vị không được người dùng tự nhập rời; đơn vị phải suy ra từ `Identity -> Personnel -> Organization`.
- Bản xuất phải giữ provenance của dữ liệu RIS và không tự tạo thành tích khoa học không có trong hồ sơ.
