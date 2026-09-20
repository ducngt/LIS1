# Rules

1. AI phải phân biệt dữ kiện, suy luận, rủi ro và khuyến nghị.
2. Quyết định hành chính/học thuật cuối cùng thuộc người có thẩm quyền.
3. Mọi khuyến nghị AI quan trọng và phản hồi của con người phải được lưu vết.
4. AI không được tự chuyển trạng thái phê duyệt hoặc tự công nhận hoàn thành.

## V5.4 — Phân cấp phê duyệt Human Authority
- Cấp 1 (`RESEARCH_PARTICIPANT`): cá nhân đăng ký, thực hiện, bổ sung và nộp kết quả; AI hỗ trợ nhưng không phê duyệt.
- Cấp 2 (`APPROVER_LEVEL_2`): Bộ môn/Khoa/Hội đồng, mặc định theo phạm vi đơn vị, dùng `research.approve.level2`.
- Cấp 3 (`APPROVER_LEVEL_3`): Phòng/Trung tâm chức năng, phạm vi toàn trường, dùng `research.approve.level3`.
- Cấp 4 (`APPROVER_LEVEL_4`): Hiệu trưởng/Ban Giám hiệu, dùng `research.approve.level4` và có thể công nhận theo thẩm quyền.
- Mọi decision gate có `aiAssist=true`: AI chỉ đưa khuyến nghị; Human có quyền mới được quyết định và phải ghi căn cứ khi workflow yêu cầu.
- Nhánh `RETURN` phải tồn tại tại các cấp xét duyệt để trả hồ sơ về người thực hiện chỉnh sửa.
