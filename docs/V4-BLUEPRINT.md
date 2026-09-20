# NUTE AI-Native RIS V4 — SBBS Blueprint

## Mục tiêu

V4 tổ chức RIS theo đúng chuỗi SBBS:

`Intent -> Capability -> Smart Box -> Contract -> Smart Wire -> Implementation -> Component`

Không lấy màn hình, database hay hãng AI làm đơn vị kiến trúc.

## 1. Hai lớp trí tuệ

### Researcher Intelligence
- Research Coach
- Literature Intelligence
- Research Methodology
- Research Data Intelligence
- Citation Intelligence
- Academic Writing
- Research Integrity
- Publication Intelligence
- IP/Transfer screening (được orchestration gọi từ workspace)

### Institutional Intelligence
- Workflow Intelligence
- Evidence Intelligence
- Decision Support
- Policy Compliance
- Council Intelligence
- Portfolio Intelligence
- Human-AI Governance

Hai lớp dùng chung Research Knowledge Layer và Institutional Memory.

## 2. Vòng đời nghiên cứu

`Hình thành ý tưởng -> Đăng ký -> Xét duyệt -> Thực hiện -> Kết quả -> Hội đồng -> Công nhận -> Công bố/SHTT/Chuyển giao -> Tri thức thể chế`

Evidence đi xuyên suốt từng giai đoạn, không phải một thư mục upload phụ.

## 3. AI Research Workspace

Mỗi hồ sơ có workspace theo ngữ cảnh, trả lời ba câu hỏi trước tiên:
1. Tôi đang ở đâu?
2. Tôi phải làm gì tiếp theo?
3. Tôi còn thiếu gì?

Workspace gắn:
- workflow + required evidence;
- milestone;
- nguồn học thuật có provenance;
- research notes;
- academic analyses;
- institutional knowledge.

## 4. Human-AI governance

AI có thể: summarize, compare, critique, detect, recommend, explain, draft.

AI không được:
- bịa citation/evidence;
- thay đổi dữ liệu nghiên cứu gốc một cách ngầm định;
- tự phê duyệt khuyến nghị của mình;
- tự ra quyết định hành chính;
- khẳng định giá trị khoa học khi bằng chứng không đủ.

## 5. Storage là HOW

V4 development package dùng JSON/Local Files để chạy zero-dependency. Đây chỉ là Wire Adapter development. Các Smart Box chỉ yêu cầu `storage`/`binary-storage` contract. Production có thể thay PostgreSQL + S3/MinIO mà không đổi Box.
