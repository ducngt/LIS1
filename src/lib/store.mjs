import fs from 'node:fs';
import path from 'node:path';

const EMPTY = {
  meta: { initialized: false, createdAt: null, schemaVersion: 9 },
  users: [], roles: [], sessions: [], organizations: [], researchTypes: [], workflows: [], research: [],
  evidence: [], reviews: [], councils: [], recognitions: [], aiProviders: [], aiWorkItems: [], aiRecommendations: [], humanDecisions: [], researcherProfiles: [], knowledgeDocuments: [], intelligenceSnapshots: [], researchMilestones: [], researchSources: [], researchNotes: [], researchDocuments: [], academicAnalyses: [], workflowDecisions: [], personnel: [], scientificProfiles: [], audit: []
};

export class JsonStore {
  constructor(rootDir) {
    this.file = path.join(rootDir, 'data', 'db.json');
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    if (!fs.existsSync(this.file)) this.write(structuredClone(EMPTY));
  }
  read() {
    try { return { ...structuredClone(EMPTY), ...JSON.parse(fs.readFileSync(this.file, 'utf8')) }; }
    catch { return structuredClone(EMPTY); }
  }
  write(db) {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, this.file);
  }
  tx(mutator) {
    const db = this.read();
    const result = mutator(db);
    this.write(db);
    return result;
  }
}

export function audit(db, actorId, action, entityType, entityId, details = {}) {
  db.audit.unshift({
    id: `audit_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(), actorId, action, entityType, entityId, details
  });
  db.audit = db.audit.slice(0, 5000);
}
