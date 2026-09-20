export function validateTransition(workflow, from, to) {
  if (!workflow) return { ok: false, error: 'Chưa cấu hình quy trình cho loại hoạt động này.' };
  const t = (workflow.transitions || []).find(x => x.from === from && x.to === to);
  if (!t) return { ok: false, error: `Không có luồng chuyển từ ${from} sang ${to}.` };
  return { ok: true, transition: t };
}

export function missingEvidence(db, researchId, transition) {
  const reqs = transition?.requiredEvidence || [];
  const existing = db.evidence.filter(e => e.researchId === researchId && e.status !== 'REJECTED');
  return reqs.filter(code => !existing.some(e => e.code === code));
}
