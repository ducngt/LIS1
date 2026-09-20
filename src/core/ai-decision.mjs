export const AI_DECISION_POINTS = {
  RESEARCH_CREATED: { code: 'RESEARCH_INTAKE', label: 'Sàng lọc hồ sơ ban đầu', focus: ['completeness','scope','risk','next_actions'] },
  WORKFLOW_TRANSITION: { code: 'WORKFLOW_GATE', label: 'Kiểm tra trước chuyển bước', focus: ['requirements','evidence','consistency','risk'] },
  EVIDENCE_SUBMITTED: { code: 'EVIDENCE_CHECK', label: 'Kiểm tra minh chứng', focus: ['relevance','completeness','traceability','anomaly'] },
  DOCUMENT_UPLOADED: { code: 'DOCUMENT_ANALYSIS', label: 'Phân tích tài liệu hồ sơ', focus: ['content','requirements','consistency','risk','decision_support'] },
  EVIDENCE_VERIFIED: { code: 'EVIDENCE_DECISION_SUPPORT', label: 'Hỗ trợ quyết định xác minh', focus: ['conflicts','missing_items','risk'] },
  COUNCIL_RESULT: { code: 'COUNCIL_SYNTHESIS', label: 'Tổng hợp kết quả hội đồng', focus: ['consensus','deviations','conditions','follow_up'] },
  RECOGNITION: { code: 'RECOGNITION_GATE', label: 'Kiểm tra trước công nhận', focus: ['completion','evidence','council_alignment','residual_risk'] }
};

export function enqueueAIWork(db, { researchId, event, actorId, payload = {} }) {
  const point = AI_DECISION_POINTS[event] || { code: event, label: event, focus: [] };
  const item = {
    id: `aiw_${Date.now()}_${Math.random().toString(16).slice(2)}`, researchId, event,
    decisionPoint: point.code, label: point.label, focus: point.focus, payload,
    status: 'PENDING', createdBy: actorId, createdAt: new Date().toISOString(), processedAt: null, recommendationId: null
  };
  db.aiWorkItems.unshift(item);
  db.aiWorkItems = db.aiWorkItems.slice(0, 5000);
  return item;
}

export function buildResearchContext(db, researchId) {
  const r = db.research.find(x => x.id === researchId);
  if (!r) return null;
  const type = db.researchTypes.find(x => x.id === r.typeId) || null;
  const workflow = db.workflows.find(x => x.researchTypeId === r.typeId) || null;
  return {
    research: r, type, organization:(db.organizations||[]).find(o=>o.id===r.organizationId)||null, workflow,
    evidence: db.evidence.filter(x => x.researchId === researchId),
    reviews: db.reviews.filter(x => x.researchId === researchId),
    councils: db.councils.filter(x => x.researchId === researchId),
    recognitions: db.recognitions.filter(x => x.researchId === researchId),
    priorAI: db.aiRecommendations.filter(x => x.researchId === researchId).slice(0, 10),
    humanDecisions: db.humanDecisions.filter(x => x.researchId === researchId).slice(0, 10),
    workflowDecisions: (db.workflowDecisions||[]).filter(x => x.researchId === researchId).slice(0, 20),
    ownerProfile: (db.researcherProfiles || []).find(x => x.userId === r.ownerId) || null,
    institutionalKnowledge: (db.knowledgeDocuments || []).filter(x => x.active !== false).slice(0, 20),
    registeredSources: (db.researchSources || []).filter(x => x.researchId === researchId).slice(0, 50),
    researchNotes: (db.researchNotes || []).filter(x => x.researchId === researchId).slice(0, 30),
    milestones: (db.researchMilestones || []).filter(x => x.researchId === researchId).slice(0, 50),
    documents: (db.researchDocuments || []).filter(x => x.researchId === researchId).slice(0, 30).map(x => ({ id:x.id, purpose:x.purpose, title:x.title, originalName:x.originalName, extractionStatus:x.extractionStatus, extractedText:String(x.extractedText||'').slice(0,120000), createdAt:x.createdAt })),
    recentAcademicAnalyses: (db.academicAnalyses || []).filter(x => x.researchId === researchId).slice(0, 10)
  };
}

export function parseAIRecommendation(text) {
  const raw = String(text || '').trim();
  let structured = null;
  try {
    const first = raw.indexOf('{'), last = raw.lastIndexOf('}');
    if (first >= 0 && last > first) structured = JSON.parse(raw.slice(first, last + 1));
  } catch {}
  return { raw, structured };
}
