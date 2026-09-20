export const BASE_PERMISSIONS = [
  'research.create','research.read.self','research.read.unit','research.read.all','research.update.self','research.submit','research.approve','research.approve.level2','research.approve.level3','research.approve.level4','research.transition','research.document.upload',
  'evidence.upload','evidence.verify','review.perform','council.manage','recognition.approve',
  'user.manage','role.manage','organization.manage','config.manage','ai.use','ai.configure','ai.decision.read','ai.decision.manage','ai.portfolio','intelligence.read','knowledge.manage','profile.manage','reviewer.match','academic.ai.use','research.source.manage','research.note.manage','research.milestone.manage','scientific.profile.export','scientific.profile.approve','audit.read'
];

export function permissionsFor(db, user) {
  const names = new Set(user?.roles || []);
  const permissions = new Set();
  for (const role of db.roles || []) if (names.has(role.code)) for (const p of role.permissions || []) permissions.add(p);
  return permissions;
}

export function can(db, user, permission) {
  return permissionsFor(db, user).has('*') || permissionsFor(db, user).has(permission);
}
