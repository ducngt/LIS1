# Kiến trúc NUTE AI-Native RIS V4 theo SBBS

## Dependency rule

`Assembly -> Smart Box -> Capability Contract -> Wire Adapter -> Technology`

## Assembly

`Assembly-NUTE-001-Research-Intelligence-System`

Assembly chỉ lắp ráp; không chứa logic nghiệp vụ, không truy cập storage trực tiếp và không gọi provider AI trực tiếp.

## Các miền quản lý

1. Con người & tổ chức: Identity, AccessControl, Participation, ResearchGroup.
2. Hoạt động nghiên cứu: ResearchObject, ResearchType.
3. Vòng đời: Workflow, Evidence, Review, Council, Recognition.
4. Tri thức & tài liệu: Document, AIKnowledge, PolicyCompliance.
5. Researcher Intelligence: ResearchCoach, LiteratureIntelligence, ResearchMethodology, ResearchDataIntelligence, CitationIntelligence, AcademicWriting, ResearchIntegrity, PublicationIntelligence.
6. Institutional Intelligence: AIOrchestrator, DecisionSupport, ResearchIntelligence, PortfolioIntelligence, HumanAIGovernance.
7. Governance: Audit, Configuration, AIModelRegistry, AIAudit.

## AI Research Workspace

Workspace là Component; không phải Smart Box. Nó lắp ghép capability của Workflow/Evidence/Milestone/Knowledge và các Academic Intelligence Boxes để tạo trải nghiệm theo ngữ cảnh người nghiên cứu.

## Storage boundary

Development package bind `storage` vào JSON Store và `binary-storage` vào local files. Hai implementation này có thể thay bằng PostgreSQL và S3/MinIO trong production mà không sửa business boxes.

## AI provider boundary

Academic/Decision boxes chỉ yêu cầu `ai.inference`. `Wire-Adapter-AI-Gateway` dùng Model Registry để tạo payload theo metadata capability của model. Box không biết OpenAI/Gemini/Anthropic.
