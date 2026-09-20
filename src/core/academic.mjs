export const ACADEMIC_CAPABILITIES = {
  'research.coach': {
    label: 'Phát triển ý tưởng & câu hỏi nghiên cứu',
    purpose: 'Giúp người nghiên cứu làm rõ vấn đề, khoảng trống, câu hỏi, giả thuyết và phạm vi.',
    guardrails: ['Không viết thay toàn bộ nghiên cứu', 'Nêu giả định và câu hỏi cần người nghiên cứu quyết định']
  },
  'research.literature': {
    label: 'Tổng quan tài liệu',
    purpose: 'Phân nhóm nguồn đã đăng ký, chỉ ra mạch tranh luận và khoảng trống từ các nguồn có thật trong RIS.',
    guardrails: ['Không bịa tài liệu, DOI hoặc trích dẫn', 'Nếu nguồn trong RIS chưa đủ phải nói rõ giới hạn']
  },
  'research.methodology': {
    label: 'Phương pháp nghiên cứu',
    purpose: 'Phản biện sự phù hợp giữa câu hỏi, thiết kế, mẫu, công cụ, biến và chiến lược phân tích.',
    guardrails: ['Phân biệt mô tả, liên hệ và suy luận nhân quả', 'Nêu điều kiện/giả định của phương pháp']
  },
  'research.data': {
    label: 'Dữ liệu & phân tích',
    purpose: 'Hỗ trợ lập kế hoạch dữ liệu, làm sạch, lựa chọn phân tích và diễn giải kết quả.',
    guardrails: ['Không thay đổi dữ liệu gốc', 'Không tuyên bố ý nghĩa khoa học vượt quá bằng chứng']
  },
  'research.citation': {
    label: 'Kiểm chứng trích dẫn',
    purpose: 'Đối chiếu nhận định với metadata/nội dung nguồn đã có trong RIS.',
    guardrails: ['Không xác nhận nguồn chưa có dữ liệu kiểm chứng', 'Phân biệt citation tồn tại và citation thực sự hỗ trợ nhận định']
  },
  'research.writing': {
    label: 'Viết & phản biện học thuật',
    purpose: 'Phản biện cấu trúc, lập luận, độ chính xác của phát biểu và mức độ nhất quán của bản thảo.',
    guardrails: ['Ưu tiên phản biện và gợi ý sửa', 'Không tạo bằng chứng hoặc kết quả nghiên cứu giả']
  },
  'research.integrity': {
    label: 'Liêm chính & đạo đức nghiên cứu',
    purpose: 'Phát hiện tín hiệu cần xem xét về consent, dữ liệu cá nhân, tính minh bạch, báo cáo chọn lọc và truy vết.',
    guardrails: ['Chỉ nêu tín hiệu/rủi ro, không kết luận gian lận', 'Yêu cầu con người xác minh khi bằng chứng chưa đủ']
  },
  'research.publication': {
    label: 'Công bố & phản hồi phản biện',
    purpose: 'Hỗ trợ chuẩn bị manuscript, checklist, phản hồi reviewer và chiến lược công bố dựa trên thông tin được cung cấp.',
    guardrails: ['Không khẳng định tạp chí phù hợp nếu chưa có dữ liệu scope hiện hành', 'Không bịa chỉ số/tình trạng xếp hạng']
  },
  'research.ip': {
    label: 'Sở hữu trí tuệ & chuyển giao',
    purpose: 'Sàng lọc tín hiệu về khả năng bảo hộ/chuyển giao và xung đột giữa công bố công khai với bảo hộ.',
    guardrails: ['Chỉ là sàng lọc, không phải ý kiến pháp lý', 'Không kết luận tính mới nếu chưa có tra cứu nguồn phù hợp']
  }
};

export function academicCapability(code) {
  return ACADEMIC_CAPABILITIES[code] || null;
}

export function buildParticipantWorkspace(db, researchId, userId) {
  const research = (db.research || []).find(r => r.id === researchId);
  if (!research) return null;
  const type = (db.researchTypes || []).find(t => t.id === research.typeId) || null;
  const workflow = (db.workflows || []).find(w => w.researchTypeId === research.typeId) || null;
  const organization = (db.organizations || []).find(o => o.id === research.organizationId) || null;
  const evidence = (db.evidence || []).filter(e => e.researchId === researchId);
  const transitions = (workflow?.transitions || []).filter(t => t.from === research.status);
  const nextSteps = transitions.map(t => {
    const required = Array.isArray(t.requiredEvidence) ? t.requiredEvidence : [];
    const missing = required.filter(code => !evidence.some(e => e.code === code && ['SUBMITTED','VERIFIED'].includes(e.status)));
    return { to: t.to, permission: t.permission || null, requiredEvidence: required, missingEvidence: missing, ready: missing.length === 0 };
  });
  const milestones = (db.researchMilestones || []).filter(m => m.researchId === researchId).sort((a,b)=>String(a.dueDate||'').localeCompare(String(b.dueDate||'')));
  const sources = (db.researchSources || []).filter(s => s.researchId === researchId);
  const notes = (db.researchNotes || []).filter(n => n.researchId === researchId).slice(0, 50);
  const analyses = (db.academicAnalyses || []).filter(a => a.researchId === researchId).slice(0, 30);
  const documents = (db.researchDocuments || []).filter(d => d.researchId === researchId).slice(0, 30);
  const now = Date.now();
  const overdue = milestones.filter(m => m.status !== 'DONE' && m.dueDate && new Date(m.dueDate).getTime() < now);
  const suggestedActions = [];
  if (!workflow) suggestedActions.push('Loại hoạt động này chưa có workflow; cần quản trị cấu hình quy trình trước khi vận hành chính thức.');
  if (nextSteps.length === 0 && !['RECOGNIZED','REJECTED'].includes(research.status)) suggestedActions.push('Chưa có bước chuyển tiếp được cấu hình cho trạng thái hiện tại.');
  for (const s of nextSteps) {
    if (s.missingEvidence.length) suggestedActions.push(`Bổ sung minh chứng ${s.missingEvidence.join(', ')} trước khi chuyển sang ${s.to}.`);
    else suggestedActions.push(`Hồ sơ đủ minh chứng cấu hình để xem xét chuyển sang ${s.to}.`);
  }
  if (overdue.length) suggestedActions.push(`Có ${overdue.length} mốc công việc đã quá hạn cần rà soát.`);
  if (!sources.length) suggestedActions.push('Chưa đăng ký nguồn học thuật; AI Literature/Citation chỉ có thể phân tích nội dung bạn cung cấp và không được bịa nguồn.');
  return {
    research, type, organization, workflow,
    process: { currentStatus: research.status, nextSteps, suggestedActions },
    evidenceSummary: { total: evidence.length, verified: evidence.filter(e=>e.status==='VERIFIED').length, submitted: evidence.filter(e=>e.status==='SUBMITTED').length, rejected: evidence.filter(e=>e.status==='REJECTED').length },
    milestones, overdueMilestones: overdue.length, sources, notes, documents, analyses,
    academicCapabilities: Object.entries(ACADEMIC_CAPABILITIES).map(([code, v]) => ({ code, ...v })),
    participant: { userId, isOwner: research.ownerId === userId, isParticipant: (research.participantIds || []).includes(userId) }
  };
}

export function buildAcademicTaskPrompt(capabilityCode, task='') {
  const cap = academicCapability(capabilityCode);
  if (!cap) throw new Error('Academic capability không hợp lệ.');
  return [
    `Bạn đang thực thi capability ${capabilityCode} trong NUTE AI-Native RIS.`,
    `Mục đích: ${cap.purpose}`,
    `Yêu cầu người dùng: ${String(task || '').trim() || 'Phân tích và hỗ trợ người nghiên cứu trong capability này.'}`,
    `Ràng buộc: ${cap.guardrails.join('; ')}.`,
    'Phân biệt rõ: (1) dữ kiện từ hồ sơ/nguồn, (2) suy luận, (3) khuyến nghị.',
    'Nếu thiếu dữ liệu để kết luận, phải nói rõ thiếu gì và không được tự bịa.',
    'Đầu ra bằng tiếng Việt, ưu tiên cấu trúc: Nhận định chính; Điểm cần làm rõ; Rủi ro/hạn chế; Gợi ý hành động; Câu hỏi cho người nghiên cứu.'
  ].join('\n');
}
