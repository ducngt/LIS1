import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonStore, audit } from './lib/store.mjs';
import { randomId, hashPassword, verifyPassword, createSecretCipher, newSessionToken, hashToken } from './lib/security.mjs';
import { can } from './core/permissions.mjs';
import { validateTransition, missingEvidence } from './core/workflow.mjs';
import { invokeAI, listProviderModels, probeModelCapabilities, normalizeModelCapabilities, normalizeGenerationSettings } from './wires/ai.mjs';
import { saveAndExtractDocument, saveAndExtractDocuments, documentCapabilities, storedDocumentToAIFile, uploadedDocumentToAIFile } from './wires/document.mjs';
import { enqueueAIWork, buildResearchContext, parseAIRecommendation } from './core/ai-decision.mjs';
import { semanticResearchSearch, findSimilarResearch, matchReviewers, portfolioSignals, buildInstitutionalKnowledge, policyFindings } from './core/intelligence.mjs';
import { ACADEMIC_CAPABILITIES, buildParticipantWorkspace, buildAcademicTaskPrompt } from './core/academic.mjs';
import { invokeAIWithFallback } from './core/ai-router.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const UPLOADS = path.join(ROOT, 'data', 'uploads');
const store = new JsonStore(ROOT);
const cipher = createSecretCipher(ROOT);
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
fs.mkdirSync(UPLOADS, { recursive: true });


const GOVERNANCE_ROLES = [
  {
    code: 'RESEARCH_PARTICIPANT', name: 'Cá nhân tham gia nghiên cứu', level: 1, scope: 'SELF', system: true,
    permissions: ['research.create','research.read.self','research.update.self','research.submit','research.document.upload','evidence.upload','academic.ai.use','ai.use','profile.manage','research.source.manage','research.note.manage','research.milestone.manage','scientific.profile.export']
  },
  {
    code: 'APPROVER_LEVEL_2', name: 'Duyệt cấp 2 · Bộ môn/Khoa/Hội đồng', level: 2, scope: 'UNIT', system: true,
    permissions: ['research.read.unit','research.approve','research.approve.level2','evidence.verify','review.perform','council.manage','ai.use','ai.decision.read','intelligence.read','reviewer.match','scientific.profile.export','scientific.profile.approve']
  },
  {
    code: 'APPROVER_LEVEL_3', name: 'Duyệt cấp 3 · Phòng/Trung tâm', level: 3, scope: 'INSTITUTION', system: true,
    permissions: ['research.read.all','research.approve','research.approve.level3','evidence.verify','review.perform','ai.use','ai.decision.read','ai.portfolio','intelligence.read','knowledge.manage','reviewer.match','scientific.profile.export','scientific.profile.approve']
  },
  {
    code: 'APPROVER_LEVEL_4', name: 'Duyệt cấp 4 · Hiệu trưởng/Ban Giám hiệu', level: 4, scope: 'INSTITUTION', system: true,
    permissions: ['research.read.all','research.approve','research.approve.level4','recognition.approve','ai.use','ai.decision.read','ai.portfolio','intelligence.read','scientific.profile.export','scientific.profile.approve']
  }
];

function ensureGovernanceRoles(db) {
  db.roles = db.roles || [];
  for (const role of GOVERNANCE_ROLES) {
    const existing = db.roles.find(r => r.code === role.code);
    if (!existing) db.roles.push(structuredClone(role));
    else if (existing.system) Object.assign(existing, structuredClone(role));
  }
}

// V5.4 fixes native file input, adds approval governance roles, scientific-profile export and dashboard workflow trace.
try {
  const current = store.read();
  if (current.meta?.initialized) {
    store.tx(x => { ensureGovernanceRoles(x); if (Number(x.meta.schemaVersion || 0) < 9) { x.meta.schemaVersion = 9; x.meta.upgradedAt = new Date().toISOString(); } });
  }
} catch {}

const server = http.createServer(async (req, res) => {
  try {
    setSecurityHeaders(res);
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (url.pathname.startsWith('/uploads/')) return serveUploadSecure(req, res, url.pathname.slice('/uploads/'.length));
    return serveStatic(res, url.pathname);
  } catch (err) {
    const status = Number(err?.status || 500);
    if (status >= 500) console.error(err);
    json(res, status, { error: status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR', message: err?.message || 'Lỗi hệ thống.' });
  }
});

async function handleApi(req, res, url) {
  const db = store.read();
  const session = resolveSession(req, db);
  const user = session ? db.users.find(u => u.id === session.userId && u.status === 'ACTIVE') : null;
  const method = req.method || 'GET';
  const p = url.pathname;

  if (method === 'GET' && p === '/api/health') return json(res, 200, { ok: true, initialized: db.meta.initialized, version: '5.4.1', aiNative: true, participantIntelligence: true, modelCapabilityRegistry: true, documentIntelligence: true, schemaVersion: db.meta.schemaVersion || 9 });
  if (method === 'GET' && p === '/api/bootstrap/status') return json(res, 200, { initialized: db.meta.initialized });

  if (method === 'POST' && p === '/api/bootstrap') {
    if (db.meta.initialized) return json(res, 409, { message: 'Hệ thống đã được khởi tạo.' });
    const body = await bodyJson(req);
    if (!body.username || !body.password || !body.displayName) return json(res, 400, { message: 'Thiếu thông tin quản trị.' });
    const admin = {
      id: randomId('usr'), username: String(body.username).trim(), displayName: String(body.displayName).trim(),
      passwordHash: hashPassword(body.password), status: 'ACTIVE', mustChangePassword: false,
      roles: ['SYSTEM_ADMIN'], createdAt: new Date().toISOString()
    };
    store.tx(x => {
      if (x.meta.initialized) throw new Error('Hệ thống đã được khởi tạo.');
      x.meta = { initialized: true, createdAt: new Date().toISOString(), schemaVersion: 9 };
      x.roles.push({ code: 'SYSTEM_ADMIN', name: 'Admin · toàn hệ thống', level: 99, scope: 'ALL', permissions: ['*'], system: true });
      ensureGovernanceRoles(x);
      x.users.push(admin);
      audit(x, admin.id, 'system.bootstrap', 'system', 'root');
    });
    return json(res, 201, { ok: true });
  }

  if (!db.meta.initialized) return json(res, 503, { message: 'Hệ thống chưa được khởi tạo.' });

  if (method === 'POST' && p === '/api/auth/login') {
    const body = await bodyJson(req);
    const current = store.read();
    const found = current.users.find(u => u.username.toLowerCase() === String(body.username || '').trim().toLowerCase());
    if (!found || found.status !== 'ACTIVE' || !verifyPassword(String(body.password || ''), found.passwordHash)) {
      return json(res, 401, { message: 'Tài khoản hoặc mật khẩu không đúng.' });
    }
    const token = newSessionToken();
    const csrf = newSessionToken();
    store.tx(x => {
      x.sessions = x.sessions.filter(s => new Date(s.expiresAt) > new Date());
      x.sessions.push({ id: randomId('ses'), userId: found.id, tokenHash: hashToken(token), csrf, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 8 * 3600e3).toISOString() });
      audit(x, found.id, 'auth.login', 'user', found.id);
    });
    res.setHeader('Set-Cookie', cookie('nute_session', token, 8 * 3600));
    return json(res, 200, { user: publicUser(found), csrf });
  }

  if (!user || !session) return json(res, 401, { message: 'Cần đăng nhập.' });
  if (method !== 'GET' && method !== 'HEAD' && req.headers['x-csrf-token'] !== session.csrf) return json(res, 403, { message: 'CSRF token không hợp lệ.' });

  if (method === 'GET' && p === '/api/me') return json(res, 200, { user: publicUser(user), permissions: permissionsOf(db, user), csrf: session.csrf });
  if (method === 'POST' && p === '/api/auth/logout') {
    store.tx(x => { x.sessions = x.sessions.filter(s => s.id !== session.id); audit(x, user.id, 'auth.logout', 'user', user.id); });
    res.setHeader('Set-Cookie', cookie('nute_session', '', 0));
    return json(res, 200, { ok: true });
  }

  if (method === 'GET' && p === '/api/dashboard') {
    const mine = db.research.filter(r => r.ownerId === user.id);
    const all = can(db,user,'research.read.all') ? db.research : db.research.filter(r=>canReadResearch(db,user,r));
    return json(res, 200, {
      counts: {
        total: all.length,
        active: all.filter(r => !['COMPLETED','RECOGNIZED','REJECTED'].includes(r.status)).length,
        recognized: all.filter(r => r.status === 'RECOGNIZED').length,
        needsAction: mine.filter(r => ['DRAFT','REVISION_REQUIRED'].includes(r.status)).length
      },
      recent: all.slice().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8),
      flows: all.slice().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 12).map(r => buildWorkflowTrace(db, user, r))
    });
  }

  if (p === '/api/users' && method === 'GET') {
    requirePerm(db, user, 'user.manage');
    return json(res, 200, db.users.map(publicUser));
  }
  if (p === '/api/users' && method === 'POST') {
    requirePerm(db, user, 'user.manage');
    const b = await bodyJson(req);
    const created = store.tx(x => {
      if (x.users.some(u => u.username.toLowerCase() === String(b.username).toLowerCase())) throw bad('Tên đăng nhập đã tồn tại.');
      const orgId=String(b.organizationId||''); if(orgId && !x.organizations.some(o=>o.id===orgId)) throw bad('Đơn vị không tồn tại.'); const roles=Array.isArray(b.roles)?b.roles.filter(Boolean):[]; if(!roles.length) throw bad('Cần gán ít nhất một vai trò.'); if(!orgId&&!roles.includes('SYSTEM_ADMIN')) throw bad('Tài khoản nghiệp vụ phải gắn với một đơn vị.'); const u = { id: randomId('usr'), username: String(b.username).trim(), displayName: String(b.displayName).trim(), passwordHash: hashPassword(String(b.password)), status: 'ACTIVE', mustChangePassword: true, roles, organizationId: orgId || null, createdAt: new Date().toISOString() };
      x.users.push(u); audit(x, user.id, 'user.create', 'user', u.id); return publicUser(u);
    });
    return json(res, 201, created);
  }


  if (p === '/api/organizations' && method === 'GET') {
    return json(res,200,(db.organizations||[]).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),'vi')));
  }
  if (p === '/api/organizations' && method === 'POST') {
    requirePerm(db,user,'organization.manage'); const b=await bodyJson(req);
    const org=store.tx(x=>{x.organizations=x.organizations||[];let o=b.id?x.organizations.find(v=>v.id===b.id):null;if(!o){o={id:randomId('org'),createdAt:new Date().toISOString()};x.organizations.push(o);}o.code=String(b.code||'').trim();o.name=String(b.name||'').trim();o.type=String(b.type||'UNIT');o.parentId=String(b.parentId||'')||null;o.active=b.active!==false;o.updatedAt=new Date().toISOString();if(!o.code||!o.name)throw bad('Cần mã và tên đơn vị.');if(x.organizations.some(v=>v.id!==o.id&&v.code.toLowerCase()===o.code.toLowerCase()))throw bad('Mã đơn vị đã tồn tại.');if(o.parentId&&!x.organizations.some(v=>v.id===o.parentId))throw bad('Đơn vị cấp trên không tồn tại.');audit(x,user.id,'organization.save','organization',o.id,{code:o.code,parentId:o.parentId});return o;});
    return json(res,201,org);
  }

  if (p === '/api/roles' && method === 'GET') return json(res, 200, db.roles);
  if (p === '/api/roles' && method === 'POST') {
    requirePerm(db, user, 'role.manage'); const b = await bodyJson(req);
    const role = store.tx(x => { if (x.roles.some(r => r.code === b.code)) throw bad('Mã vai trò đã tồn tại.'); const r = { code: String(b.code).trim(), name: String(b.name).trim(), permissions: Array.isArray(b.permissions) ? b.permissions : [], system: false }; x.roles.push(r); audit(x,user.id,'role.create','role',r.code); return r; });
    return json(res, 201, role);
  }

  if (p === '/api/research-types' && method === 'GET') return json(res, 200, db.researchTypes);
  if (p === '/api/research-types' && method === 'POST') {
    requirePerm(db,user,'config.manage'); const b=await bodyJson(req);
    const type=store.tx(x=>{const t={id:randomId('rtype'),code:String(b.code).trim(),name:String(b.name).trim(),description:String(b.description||''),fields:Array.isArray(b.fields)?b.fields:[],createdAt:new Date().toISOString()};x.researchTypes.push(t);audit(x,user.id,'researchType.create','researchType',t.id);return t;});
    return json(res,201,type);
  }

  if (p === '/api/workflows' && method === 'GET') return json(res,200,db.workflows.map(publicWorkflow));
  if (p === '/api/workflows' && method === 'POST') {
    requirePerm(db,user,'config.manage'); const b=await bodyJson(req);
    const incomingFiles=Array.isArray(b.sourceFiles)?b.sourceFiles:(b.sourceFile?[b.sourceFile]:[]);
    if(incomingFiles.length>10)throw bad('Mỗi lần chỉ tải tối đa 10 tệp.');
    const sourceDocs=await saveAndExtractDocuments({uploadsDir:UPLOADS,files:incomingFiles,prefix:'workflow'});
    const wf=store.tx(x=>{const previous=x.workflows.find(v=>v.researchTypeId===b.researchTypeId);const prevDocs=Array.isArray(previous?.sourceDocuments)?previous.sourceDocuments:(previous?.sourceDocument?[previous.sourceDocument]:[]);const added=sourceDocs.map(d=>({...d,id:randomId('wdoc'),extractedText:String(d.extractedText||'').slice(0,500000)}));const w={id:previous?.id||randomId('wf'),researchTypeId:b.researchTypeId,name:String(b.name||'Quy trình'),initialStatus:String(b.initialStatus||'DRAFT'),transitions:Array.isArray(b.transitions)?b.transitions:[],createdAt:previous?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),sourceDocuments:[...prevDocs,...added],sourceDocument:null,aiAnalysis:previous?.aiAnalysis||null};x.workflows=x.workflows.filter(v=>v.researchTypeId!==w.researchTypeId);x.workflows.push(w);audit(x,user.id,'workflow.upsert','workflow',w.id,{sourceDocumentCount:w.sourceDocuments.length});return w;});
    return json(res,201,wf);
  }

  const workflowSourceDeleteMatch=p.match(/^\/api\/workflows\/([^/]+)\/source-documents\/([^/]+)$/);
  if(workflowSourceDeleteMatch && method==='DELETE'){
    requirePerm(db,user,'config.manage');const removed=store.tx(x=>{const w=x.workflows.find(v=>v.id===workflowSourceDeleteMatch[1]);if(!w)throw notFound('Không tìm thấy quy trình.');const docs=Array.isArray(w.sourceDocuments)?w.sourceDocuments:(w.sourceDocument?[w.sourceDocument]:[]);const i=docs.findIndex(d=>(d.id||d.storedName)===workflowSourceDeleteMatch[2]);if(i<0)throw notFound('Không tìm thấy tệp nguồn.');const [d]=docs.splice(i,1);w.sourceDocuments=docs;w.sourceDocument=null;w.updatedAt=new Date().toISOString();audit(x,user.id,'workflow.source.delete','workflow',w.id,{documentId:d.id||d.storedName});return d;});removeUploadFile(removed.fileUrl);return json(res,200,{ok:true});
  }

  const workflowAnalyzeMatch = p.match(/^\/api\/workflows\/([^/]+)\/analyze$/);
  if (workflowAnalyzeMatch && method === 'POST') {
    requirePerm(db,user,'config.manage'); const current=store.read(); const wf=current.workflows.find(w=>w.id===workflowAnalyzeMatch[1]); if(!wf)throw notFound('Không tìm thấy quy trình.');
    const docs=workflowSourceDocuments(wf); const readable=docs.filter(d=>d.extractedText);
    const type=current.researchTypes.find(t=>t.id===wf.researchTypeId)||null;
    const documentText=combineDocuments(readable,220000);
    const nativeAttachments=docs.map(d=>storedDocumentToAIFile(UPLOADS,d)).filter(Boolean);
    if(!documentText.trim()&&!nativeAttachments.length){const statuses=docs.map(d=>`${d.originalName}: ${d.extractionStatus}${d.extractionMessage?' - '+d.extractionMessage:''}`).join('; ');throw bad(`Tài liệu chưa sẵn sàng cho AI. ${statuses||'Hãy tải PDF/DOC/DOCX/TXT hợp lệ.'}`);}
    const routed=await runAI(current,'workflow',{task:'Phân tích toàn bộ tài liệu quy trình/quy định được tải lên và hỗ trợ quản trị viên cấu hình workflow. Không tự phê duyệt. Hãy chỉ ra: các bước, vai trò/thẩm quyền, hồ sơ/minh chứng đầu vào, điều kiện chuyển bước, các nhánh trả lại/chỉnh sửa khi không đạt, điểm quyết định cần con người, và các điểm AI có thể hỗ trợ. Nếu các tài liệu mâu thuẫn, phải nêu rõ mâu thuẫn và tên tài liệu. Sau đó đề xuất JSON transitions tham khảo.',content:documentText,attachments:nativeAttachments,context:{researchType:type,existingTransitions:wf.transitions,documents:docs.map(d=>({name:d.originalName,status:d.extractionStatus,engine:d.extractionEngine,checksum:d.checksumSha256,nativeAiReadable:!!d.nativeAiReadable}))}});
    const result=routed.result,pvd=routed.provider;
    store.tx(x=>{const w=x.workflows.find(v=>v.id===wf.id);w.aiAnalysis={result:String(result||''),providerId:pvd.id,model:pvd.model,at:new Date().toISOString(),by:user.id,attempts:routed.attempts};audit(x,user.id,'workflow.ai.analyze','workflow',wf.id,{providerId:pvd.id,model:pvd.model,attempts:routed.attempts.length});});
    return json(res,200,{result,provider:{name:pvd.name,model:pvd.model},attempts:routed.attempts});
  }

  if (p === '/api/research' && method === 'GET') {
    const list = can(db,user,'research.read.all') ? db.research : db.research.filter(r=>canReadResearch(db,user,r));
    return json(res,200,list.map(r=>enrichResearch(db,r)));
  }
  if (p === '/api/research' && method === 'POST') {
    requirePerm(db,user,'research.create'); const b=await bodyJson(req);
    const registrationFiles=Array.isArray(b.registrationFiles)?b.registrationFiles:(b.registrationFile?[b.registrationFile]:[]); if(registrationFiles.length>10)throw bad('Mỗi lần chỉ tải tối đa 10 tệp.');
    const registrationDocs=await saveAndExtractDocuments({uploadsDir:UPLOADS,files:registrationFiles,prefix:'registration'});
    const created=store.tx(x=>{const wf=x.workflows.find(w=>w.researchTypeId===b.typeId);const organizationId=String(b.organizationId||user.organizationId||'')||null;if(organizationId&&!x.organizations.some(o=>o.id===organizationId))throw bad('Đơn vị không tồn tại.');const r={id:randomId('res'),typeId:b.typeId,title:String(b.title||'').trim(),summary:String(b.summary||''),ownerId:user.id,organizationId,participantIds:Array.isArray(b.participantIds)?b.participantIds:[],status:wf?.initialStatus||'DRAFT',metadata:b.metadata&&typeof b.metadata==='object'?b.metadata:{},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};if(!r.title)throw bad('Tên hoạt động không được để trống.');x.research.unshift(r);x.researchDocuments=x.researchDocuments||[];for(const registrationDoc of registrationDocs){const d={id:randomId('rdoc'),researchId:r.id,purpose:'REGISTRATION',title:registrationDoc.originalName,uploadedBy:user.id,createdAt:new Date().toISOString(),...registrationDoc};x.researchDocuments.unshift(d);}enqueueAIWork(x,{researchId:r.id,event:'RESEARCH_CREATED',actorId:user.id,payload:{status:r.status,registrationDocumentCount:registrationDocs.length}});audit(x,user.id,'research.create','research',r.id,{registrationDocumentCount:registrationDocs.length});return r;});
    return json(res,201,enrichResearch(store.read(),created));
  }

  const researchMatch = p.match(/^\/api\/research\/([^/]+)$/);
  if (researchMatch && method === 'GET') {
    const r=db.research.find(x=>x.id===researchMatch[1]); if(!r)return json(res,404,{message:'Không tìm thấy hồ sơ.'});
    if(!canReadResearch(db,user,r))return json(res,403,{message:'Không có quyền truy cập hồ sơ.'});
    return json(res,200,{...enrichResearch(db,r),evidence:db.evidence.filter(e=>e.researchId===r.id),reviews:db.reviews.filter(e=>e.researchId===r.id),councils:db.councils.filter(e=>e.researchId===r.id),recognitions:db.recognitions.filter(e=>e.researchId===r.id),aiRecommendations:(db.aiRecommendations||[]).filter(e=>e.researchId===r.id),humanDecisions:(db.humanDecisions||[]).filter(e=>e.researchId===r.id),workflowDecisions:(db.workflowDecisions||[]).filter(e=>e.researchId===r.id).slice(0,50),documents:(db.researchDocuments||[]).filter(e=>e.researchId===r.id).map(publicDocument),availableTransitions:transitionOptions(db,user,r)});
  }

  const researchDocumentMatch = p.match(/^\/api\/research\/([^/]+)\/documents$/);
  if (researchDocumentMatch && method === 'POST') {
    requirePerm(db,user,'research.document.upload'); const b=await bodyJson(req); const rid=researchDocumentMatch[1];
    const current=db.research.find(r=>r.id===rid); if(!current||!canReadResearch(db,user,current))throw forbidden();
    const files=Array.isArray(b.files)?b.files:(b.file?[b.file]:[]); if(!files.length)throw bad('Chưa chọn tệp.'); if(files.length>10)throw bad('Mỗi lần chỉ tải tối đa 10 tệp.');
    const docs=await saveAndExtractDocuments({uploadsDir:UPLOADS,files,prefix:'research'});
    const items=store.tx(x=>{x.researchDocuments=x.researchDocuments||[];const created=[];for(const doc of docs){const d={id:randomId('rdoc'),researchId:rid,purpose:String(b.purpose||'SUPPORTING'),title:String((docs.length===1&&b.title)||doc.originalName),uploadedBy:user.id,createdAt:new Date().toISOString(),...doc};x.researchDocuments.unshift(d);created.push(d);enqueueAIWork(x,{researchId:rid,event:'DOCUMENT_UPLOADED',actorId:user.id,payload:{documentId:d.id,purpose:d.purpose,title:d.title,extractionStatus:d.extractionStatus}});audit(x,user.id,'research.document.upload','researchDocument',d.id,{researchId:rid,purpose:d.purpose,extractionStatus:d.extractionStatus});}return created;});
    return json(res,201,items.map(publicDocument));
  }

  const transitionAdviceMatch = p.match(/^\/api\/research\/([^/]+)\/transition-advice$/);
  if (transitionAdviceMatch && method === 'POST') {
    const b=await bodyJson(req); const rid=transitionAdviceMatch[1]; const current=store.read(); const r=current.research.find(v=>v.id===rid); if(!r)throw notFound('Không tìm thấy hồ sơ.'); if(!canReadResearch(current,user,r))throw forbidden();
    const wf=current.workflows.find(w=>w.researchTypeId===r.typeId); const val=validateTransition(wf,r.status,String(b.to)); if(!val.ok)throw bad(val.error);
    const isParticipant=r.ownerId===user.id||(r.participantIds||[]).includes(user.id); const hasGlobal=can(current,user,'research.transition'); if(val.transition.permission){if(!can(current,user,val.transition.permission)&&!hasGlobal)throw forbidden();}else if(!isParticipant&&!hasGlobal)throw forbidden();
    const context=buildResearchContext(current,rid); context.requestedTransition={from:r.status,to:String(b.to),actionType:val.transition.actionType||null,requiredEvidence:val.transition.requiredEvidence||[],humanAuthority:user.id}; context.organization=(current.organizations||[]).find(o=>o.id===r.organizationId)||null;
    const routed=await runAI(current,'workflow',{task:'Hỗ trợ người có thẩm quyền trước một quyết định workflow. Phân tích hồ sơ, tài liệu, minh chứng, quy chế và trạng thái. Nêu rõ dữ kiện, thiếu hụt, rủi ro và khuyến nghị APPROVE / RETURN / REJECT / CONTINUE phù hợp. Đây chỉ là tư vấn; con người quyết định cuối cùng.',content:`Đang xem xét chuyển ${r.status} -> ${String(b.to)}. Ghi chú người dùng: ${String(b.note||'')}`,context}); const pvd=routed.provider;
    const advice=store.tx(x=>{x.workflowDecisions=x.workflowDecisions||[];const a={id:randomId('wfa'),kind:'AI_ADVICE',researchId:rid,from:r.status,to:String(b.to),actionType:val.transition.actionType||null,result:String(routed.result||''),providerId:pvd.id,providerName:pvd.name,model:pvd.model,requestedBy:user.id,createdAt:new Date().toISOString(),attempts:routed.attempts};x.workflowDecisions.unshift(a);audit(x,user.id,'workflow.ai.advice','research',rid,{adviceId:a.id,from:a.from,to:a.to,providerId:pvd.id,model:pvd.model});return a;});
    return json(res,201,advice);
  }

  const transitionMatch = p.match(/^\/api\/research\/([^/]+)\/transition$/);
  if (transitionMatch && method === 'POST') {
    const b=await bodyJson(req); const rid=transitionMatch[1];
    const result=store.tx(x=>{const r=x.research.find(v=>v.id===rid);if(!r)throw notFound('Không tìm thấy hồ sơ.');if(!canReadResearch(x,user,r))throw forbidden();const wf=x.workflows.find(w=>w.researchTypeId===r.typeId);const val=validateTransition(wf,r.status,String(b.to));if(!val.ok)throw bad(val.error);const isParticipant=r.ownerId===user.id||(r.participantIds||[]).includes(user.id);const hasGlobal=can(x,user,'research.transition');if(val.transition.permission){if(!can(x,user,val.transition.permission)&&!hasGlobal)throw forbidden();}else if(!isParticipant&&!hasGlobal)throw forbidden();const missing=missingEvidence(x,r.id,val.transition);if(missing.length)throw bad(`Thiếu minh chứng bắt buộc: ${missing.join(', ')}`);const rationale=String(b.rationale||'').trim();if((val.transition.decisionGate||['RETURN','REJECT'].includes(String(val.transition.actionType||'').toUpperCase()))&&!rationale)throw bad('Điểm quyết định này yêu cầu người có thẩm quyền ghi căn cứ/lý do.');const before=r.status;r.status=String(b.to);r.updatedAt=new Date().toISOString();x.workflowDecisions=x.workflowDecisions||[];const hd={id:randomId('wfd'),kind:'HUMAN_DECISION',researchId:r.id,from:before,to:r.status,actionType:val.transition.actionType||null,rationale,adviceId:String(b.adviceId||'')||null,decidedBy:user.id,createdAt:new Date().toISOString()};x.workflowDecisions.unshift(hd);enqueueAIWork(x,{researchId:r.id,event:'WORKFLOW_TRANSITION',actorId:user.id,payload:{from:before,to:r.status,permission:val.transition.permission||null,actionType:val.transition.actionType||null,rationale,adviceId:hd.adviceId}});audit(x,user.id,'research.transition','research',r.id,{from:before,to:r.status,permission:val.transition.permission||null,actionType:val.transition.actionType||null,decisionId:hd.id,adviceId:hd.adviceId});return r;});
    return json(res,200,enrichResearch(store.read(),result));
  }

  const evidenceMatch = p.match(/^\/api\/research\/([^/]+)\/evidence$/);
  if (evidenceMatch && method === 'POST') {
    requirePerm(db,user,'evidence.upload'); const b=await bodyJson(req); const rid=evidenceMatch[1];
    const current=db.research.find(r=>r.id===rid); if(!current||!canReadResearch(db,user,current))return json(res,403,{message:'Không có quyền.'});
    const files=Array.isArray(b.files)?b.files:(b.file?[b.file]:[]); if(files.length>10)throw bad('Mỗi lần chỉ tải tối đa 10 tệp minh chứng.');
    const saved=[]; for(const f of files){const raw=Buffer.from(String(f.base64||''),'base64');if(!raw.length)continue;if(raw.length>25*1024*1024)throw bad('Tệp vượt quá 25 MB.');const originalName=safeName(f.name||'evidence.bin');const fname=`${Date.now()}_${randomId('f')}_${originalName}`;fs.writeFileSync(path.join(UPLOADS,fname),raw);saved.push({originalName,fileUrl:`/uploads/${fname}`,size:raw.length});}
    const items=store.tx(x=>{const made=[];const sources=saved.length?saved:[{originalName:null,fileUrl:null,size:0}];for(const sf of sources){const e={id:randomId('ev'),researchId:rid,code:String(b.code||'GENERAL'),title:String((sources.length===1&&b.title)||sf.originalName||b.title||'Minh chứng'),url:b.url?String(b.url):null,fileUrl:sf.fileUrl,originalName:sf.originalName,size:sf.size,status:'SUBMITTED',submittedBy:user.id,createdAt:new Date().toISOString()};x.evidence.unshift(e);made.push(e);enqueueAIWork(x,{researchId:rid,event:'EVIDENCE_SUBMITTED',actorId:user.id,payload:{evidenceId:e.id,code:e.code,title:e.title}});audit(x,user.id,'evidence.submit','evidence',e.id);}return made;});
    return json(res,201,items);
  }

  const researchDocDeleteMatch=p.match(/^\/api\/research-documents\/([^/]+)$/);
  if(researchDocDeleteMatch && method==='DELETE'){
    const id=researchDocDeleteMatch[1]; const result=store.tx(x=>{const i=(x.researchDocuments||[]).findIndex(d=>d.id===id);if(i<0)throw notFound('Không tìm thấy tài liệu.');const d=x.researchDocuments[i];const r=x.research.find(z=>z.id===d.researchId);if(!r||(!canReadResearch(x,user,r)))throw forbidden();if(d.uploadedBy!==user.id&&!can(x,user,'research.document.upload')&&!can(x,user,'research.read.all'))throw forbidden();x.researchDocuments.splice(i,1);audit(x,user.id,'research.document.delete','researchDocument',id,{researchId:d.researchId});return d;});removeUploadFile(result.fileUrl);return json(res,200,{ok:true});
  }
  const evidenceDeleteMatch=p.match(/^\/api\/evidence\/([^/]+)$/);
  if(evidenceDeleteMatch && method==='DELETE'){
    const id=evidenceDeleteMatch[1];const result=store.tx(x=>{const i=x.evidence.findIndex(e=>e.id===id);if(i<0)throw notFound('Không tìm thấy minh chứng.');const e=x.evidence[i];const r=x.research.find(z=>z.id===e.researchId);if(!r||!canReadResearch(x,user,r))throw forbidden();if(e.submittedBy!==user.id&&!can(x,user,'evidence.verify')&&!can(x,user,'research.read.all'))throw forbidden();x.evidence.splice(i,1);audit(x,user.id,'evidence.delete','evidence',id,{researchId:e.researchId});return e;});removeUploadFile(result.fileUrl);return json(res,200,{ok:true});
  }

  const verifyMatch = p.match(/^\/api\/evidence\/([^/]+)\/verify$/);
  if (verifyMatch && method === 'POST') {
    requirePerm(db,user,'evidence.verify'); const b=await bodyJson(req);
    const e=store.tx(x=>{const item=x.evidence.find(v=>v.id===verifyMatch[1]);if(!item)throw notFound('Không tìm thấy minh chứng.');item.status=b.approved?'VERIFIED':'REJECTED';item.verifiedBy=user.id;item.verifiedAt=new Date().toISOString();item.note=String(b.note||'');enqueueAIWork(x,{researchId:item.researchId,event:'EVIDENCE_VERIFIED',actorId:user.id,payload:{evidenceId:item.id,approved:!!b.approved}});audit(x,user.id,'evidence.verify','evidence',item.id,{approved:!!b.approved});return item;});
    return json(res,200,e);
  }

  const councilMatch = p.match(/^\/api\/research\/([^/]+)\/council$/);
  if (councilMatch && method === 'POST') {
    requirePerm(db,user,'council.manage'); const b=await bodyJson(req); const rid=councilMatch[1];
    const council=store.tx(x=>{const r=x.research.find(v=>v.id===rid);if(!r)throw notFound('Không tìm thấy hồ sơ.');const c={id:randomId('council'),researchId:rid,meetingDate:String(b.meetingDate||new Date().toISOString().slice(0,10)),result:String(b.result||'Đạt'),score:b.score===''||b.score==null?null:Number(b.score),minutes:String(b.minutes||''),memberIds:Array.isArray(b.memberIds)?b.memberIds:[],createdBy:user.id,createdAt:new Date().toISOString()};x.councils.unshift(c);enqueueAIWork(x,{researchId:rid,event:'COUNCIL_RESULT',actorId:user.id,payload:{councilId:c.id,result:c.result,score:c.score}});audit(x,user.id,'council.result','council',c.id,{researchId:rid,result:c.result});return c;});
    return json(res,201,council);
  }

  const recognizeMatch = p.match(/^\/api\/research\/([^/]+)\/recognize$/);
  if (recognizeMatch && method === 'POST') {
    requirePerm(db,user,'recognition.approve'); const b=await bodyJson(req); const rid=recognizeMatch[1];
    const rec=store.tx(x=>{const r=x.research.find(v=>v.id===rid);if(!r)throw notFound('Không tìm thấy hồ sơ.');if(!x.councils.some(c=>c.researchId===rid))throw bad('Cần ghi nhận kết quả hội đồng trước khi công nhận hoàn thành.');const v={id:randomId('rec'),researchId:rid,decisionNo:String(b.decisionNo||''),decisionDate:String(b.decisionDate||new Date().toISOString().slice(0,10)),note:String(b.note||''),approvedBy:user.id,createdAt:new Date().toISOString()};x.recognitions.unshift(v);const before=r.status;r.status='RECOGNIZED';r.updatedAt=new Date().toISOString();enqueueAIWork(x,{researchId:rid,event:'RECOGNITION',actorId:user.id,payload:{recognitionId:v.id,decisionNo:v.decisionNo}});audit(x,user.id,'recognition.approve','recognition',v.id,{researchId:rid,from:before,to:'RECOGNIZED'});return v;});
    return json(res,201,rec);
  }

  const workspaceMatch = p.match(/^\/api\/research\/([^/]+)\/workspace$/);
  if (workspaceMatch && method === 'GET') {
    const rid=workspaceMatch[1]; const r=db.research.find(x=>x.id===rid);
    if(!r)return json(res,404,{message:'Không tìm thấy hồ sơ.'});
    if(!canReadResearch(db,user,r))return json(res,403,{message:'Không có quyền truy cập hồ sơ.'});
    const ws=buildParticipantWorkspace(db,rid,user.id);
    if(ws?.workflow)ws.workflow=publicWorkflow(ws.workflow);
    if(Array.isArray(ws?.documents))ws.documents=ws.documents.map(publicDocument);
    return json(res,200,ws);
  }

  const academicAnalyzeMatch = p.match(/^\/api\/research\/([^/]+)\/academic\/analyze$/);
  if (academicAnalyzeMatch && method === 'POST') {
    if(!can(db,user,'academic.ai.use')&&!can(db,user,'ai.use'))throw forbidden();
    const rid=academicAnalyzeMatch[1]; const b=await bodyJson(req); const current=store.read();
    const r=current.research.find(x=>x.id===rid); if(!r)throw notFound('Không tìm thấy hồ sơ.');
    if(!canReadResearch(current,user,r))throw forbidden();
    const capability=String(b.capability||'research.coach');
    if(!ACADEMIC_CAPABILITIES[capability])throw bad('Academic capability không hợp lệ.');
    const context=buildResearchContext(current,rid);
    context.participantWorkspace=buildParticipantWorkspace(current,rid,user.id);
    context.registeredSources=(current.researchSources||[]).filter(x=>x.researchId===rid);
    context.researchNotes=(current.researchNotes||[]).filter(x=>x.researchId===rid).slice(0,30);
    const incomingAcademicFiles=Array.isArray(b.files)?b.files:[];
    const attachments=await saveAndExtractDocuments({uploadsDir:UPLOADS,files:incomingAcademicFiles,prefix:'academic'});context.userAttachments=attachments.map(publicDocument);
    const nativeAttachments=incomingAcademicFiles.map(uploadedDocumentToAIFile).filter(Boolean);
    const attachmentText=combineDocuments(attachments.filter(d=>d.extractedText),150000); const combined=[String(b.content||''),attachmentText].filter(Boolean).join('\n\n');
    const task=buildAcademicTaskPrompt(capability,String(b.task||''));
    const routed=await runAI(current,'academic',{task,content:combined,attachments:nativeAttachments,context}); const result=routed.result,pvd=routed.provider;
    const analysis=store.tx(x=>{const a={id:randomId('aca'),researchId:rid,userId:user.id,capability,task:String(b.task||''),input:String(b.content||''),attachments:attachments.map(d=>({...publicDocument(d),extractedText:String(d.extractedText||'').slice(0,100000)})),result:String(result||''),providerId:pvd.id,providerName:pvd.name,model:pvd.model,route:'academic',attempts:routed.attempts,createdAt:new Date().toISOString()};x.academicAnalyses=x.academicAnalyses||[];x.academicAnalyses.unshift(a);x.academicAnalyses=x.academicAnalyses.slice(0,5000);audit(x,user.id,'academic.ai.analyze','research',rid,{analysisId:a.id,capability,attachmentCount:attachments.length,providerId:pvd.id,model:pvd.model,attempts:routed.attempts.length});return a;});
    return json(res,201,analysis);
  }

  const sourcesMatch = p.match(/^\/api\/research\/([^/]+)\/sources$/);
  if (sourcesMatch && method === 'GET') {
    const r=db.research.find(x=>x.id===sourcesMatch[1]); if(!r||!canReadResearch(db,user,r))throw forbidden();
    return json(res,200,(db.researchSources||[]).filter(x=>x.researchId===r.id));
  }
  if (sourcesMatch && method === 'POST') {
    if(!can(db,user,'research.source.manage')&&!can(db,user,'research.update.self')&&!can(db,user,'research.create'))throw forbidden();
    const rid=sourcesMatch[1], b=await bodyJson(req); const r=db.research.find(x=>x.id===rid); if(!r||!canReadResearch(db,user,r))throw forbidden();
    const item=store.tx(x=>{x.researchSources=x.researchSources||[];const v={id:randomId('src'),researchId:rid,title:String(b.title||'').trim(),authors:String(b.authors||''),year:String(b.year||''),doi:String(b.doi||''),url:String(b.url||''),sourceType:String(b.sourceType||'article'),notes:String(b.notes||''),verified:!!b.verified,createdBy:user.id,createdAt:new Date().toISOString()};if(!v.title)throw bad('Tên tài liệu không được để trống.');x.researchSources.unshift(v);audit(x,user.id,'research.source.create','researchSource',v.id,{researchId:rid});return v;});
    return json(res,201,item);
  }

  const notesMatch = p.match(/^\/api\/research\/([^/]+)\/notes$/);
  if (notesMatch && method === 'GET') {
    const r=db.research.find(x=>x.id===notesMatch[1]); if(!r||!canReadResearch(db,user,r))throw forbidden();
    return json(res,200,(db.researchNotes||[]).filter(x=>x.researchId===r.id));
  }
  if (notesMatch && method === 'POST') {
    if(!can(db,user,'research.note.manage')&&!can(db,user,'research.update.self')&&!can(db,user,'research.create'))throw forbidden();
    const rid=notesMatch[1], b=await bodyJson(req); const r=db.research.find(x=>x.id===rid); if(!r||!canReadResearch(db,user,r))throw forbidden();
    const item=store.tx(x=>{x.researchNotes=x.researchNotes||[];const v={id:randomId('note'),researchId:rid,title:String(b.title||'Ghi chú').trim(),content:String(b.content||'').trim(),kind:String(b.kind||'research-note'),createdBy:user.id,createdAt:new Date().toISOString()};if(!v.content)throw bad('Nội dung ghi chú không được để trống.');x.researchNotes.unshift(v);audit(x,user.id,'research.note.create','researchNote',v.id,{researchId:rid});return v;});
    return json(res,201,item);
  }

  const milestonesMatch = p.match(/^\/api\/research\/([^/]+)\/milestones$/);
  if (milestonesMatch && method === 'GET') {
    const r=db.research.find(x=>x.id===milestonesMatch[1]); if(!r||!canReadResearch(db,user,r))throw forbidden();
    return json(res,200,(db.researchMilestones||[]).filter(x=>x.researchId===r.id));
  }
  if (milestonesMatch && method === 'POST') {
    if(!can(db,user,'research.milestone.manage')&&!can(db,user,'research.update.self')&&!can(db,user,'research.create'))throw forbidden();
    const rid=milestonesMatch[1], b=await bodyJson(req); const r=db.research.find(x=>x.id===rid); if(!r||!canReadResearch(db,user,r))throw forbidden();
    const item=store.tx(x=>{x.researchMilestones=x.researchMilestones||[];const v={id:randomId('ms'),researchId:rid,title:String(b.title||'').trim(),dueDate:String(b.dueDate||''),status:String(b.status||'TODO'),ownerId:String(b.ownerId||user.id),note:String(b.note||''),createdBy:user.id,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};if(!v.title)throw bad('Tên mốc không được để trống.');x.researchMilestones.push(v);audit(x,user.id,'research.milestone.create','researchMilestone',v.id,{researchId:rid});return v;});
    return json(res,201,item);
  }

  const milestoneStatusMatch = p.match(/^\/api\/milestones\/([^/]+)\/status$/);
  if (milestoneStatusMatch && method === 'POST') {
    const b=await bodyJson(req); const item=store.tx(x=>{const v=(x.researchMilestones||[]).find(m=>m.id===milestoneStatusMatch[1]);if(!v)throw notFound('Không tìm thấy mốc công việc.');const r=x.research.find(z=>z.id===v.researchId);if(!r||!canReadResearch(x,user,r))throw forbidden();v.status=String(b.status||'TODO');v.updatedAt=new Date().toISOString();audit(x,user.id,'research.milestone.status','researchMilestone',v.id,{status:v.status});return v;});
    return json(res,200,item);
  }

  if (p === '/api/ai/decision-center' && method === 'GET') {
    requirePerm(db,user,'ai.decision.read');
    const visible = can(db,user,'research.read.all') ? db.research : db.research.filter(r=>canReadResearch(db,user,r));
    const ids = new Set(visible.map(r=>r.id));
    const items = (db.aiWorkItems||[]).filter(w=>ids.has(w.researchId)).slice(0,250).map(w=>({ ...w, research: enrichResearch(db, db.research.find(r=>r.id===w.researchId)) }));
    const recs = (db.aiRecommendations||[]).filter(r=>ids.has(r.researchId)).slice(0,250);
    const decisions = (db.humanDecisions||[]).filter(r=>ids.has(r.researchId)).slice(0,250);
    return json(res,200,{counts:{pending:items.filter(x=>x.status==='PENDING').length,analyzed:items.filter(x=>x.status==='ANALYZED').length,awaitingHuman:recs.filter(x=>!decisions.some(d=>d.recommendationId===x.id)).length},workItems:items,recommendations:recs,decisions});
  }

  const processAIMatch = p.match(/^\/api\/ai\/work-items\/([^/]+)\/process$/);
  if (processAIMatch && method === 'POST') {
    requirePerm(db,user,'ai.decision.manage');
    const current=store.read(); const item=current.aiWorkItems.find(x=>x.id===processAIMatch[1]); if(!item)throw notFound('Không tìm thấy nhiệm vụ AI.');
    const research=current.research.find(r=>r.id===item.researchId); if(!research||!canReadResearch(current,user,research))throw forbidden();
    const context=buildResearchContext(current,item.researchId);
    const task=`${item.label}. Hãy đóng vai trò AI Decision Support trong RIS. Phân tích theo các trọng tâm: ${(item.focus||[]).join(', ')}. Trả về JSON trong một khối duy nhất với các khóa: summary, facts[], risks[], missing[], options[], recommendation, confidence (0-1), human_questions[]. Không đưa ra quyết định hành chính thay con người.`;
    const routed=await runAI(current,'decision',{task,content:JSON.stringify(item.payload||{},null,2),context}); const result=routed.result,pvd=routed.provider;
    const parsed=parseAIRecommendation(result);
    const rec=store.tx(x=>{const wi=x.aiWorkItems.find(v=>v.id===item.id);const r={id:randomId('air'),workItemId:item.id,researchId:item.researchId,decisionPoint:item.decisionPoint,providerId:pvd.id,providerName:pvd.name,model:pvd.model,raw:parsed.raw,structured:parsed.structured,createdBy:user.id,createdAt:new Date().toISOString(),status:'AWAITING_HUMAN',attempts:routed.attempts};x.aiRecommendations.unshift(r);wi.status='ANALYZED';wi.processedAt=r.createdAt;wi.recommendationId=r.id;audit(x,user.id,'ai.decision.analyze','research',item.researchId,{workItemId:item.id,recommendationId:r.id,decisionPoint:item.decisionPoint});return r;});
    return json(res,201,rec);
  }

  const aiDecisionMatch = p.match(/^\/api\/ai\/recommendations\/([^/]+)\/decision$/);
  if (aiDecisionMatch && method === 'POST') {
    requirePerm(db,user,'ai.decision.manage'); const b=await bodyJson(req);
    const outcome=String(b.outcome||'').toUpperCase(); if(!['ACCEPT','REJECT','OVERRIDE','NOTE'].includes(outcome))throw bad('Kết quả quyết định không hợp lệ.');
    const d=store.tx(x=>{const rec=x.aiRecommendations.find(v=>v.id===aiDecisionMatch[1]);if(!rec)throw notFound('Không tìm thấy khuyến nghị AI.');const research=x.research.find(r=>r.id===rec.researchId);if(!research||!canReadResearch(x,user,research))throw forbidden();const item={id:randomId('hd'),recommendationId:rec.id,researchId:rec.researchId,outcome,rationale:String(b.rationale||''),decidedBy:user.id,createdAt:new Date().toISOString()};x.humanDecisions.unshift(item);rec.status='HUMAN_REVIEWED';rec.humanDecisionId=item.id;audit(x,user.id,'ai.decision.human','research',rec.researchId,{recommendationId:rec.id,outcome});return item;});
    return json(res,201,d);
  }

  const aiResearchMatch = p.match(/^\/api\/ai\/research\/([^/]+)\/analyze$/);
  if (aiResearchMatch && method === 'POST') {
    requirePerm(db,user,'ai.decision.manage'); const rid=aiResearchMatch[1]; const current=store.read(); const research=current.research.find(r=>r.id===rid); if(!research||!canReadResearch(current,user,research))throw forbidden();
    const b=await bodyJson(req); const queued=store.tx(x=>enqueueAIWork(x,{researchId:rid,event:String(b.event||'WORKFLOW_TRANSITION'),actorId:user.id,payload:{manual:true,focus:b.focus||null,note:b.note||''}})); return json(res,201,queued);
  }

  if (p === '/api/ai/portfolio/analyze' && method === 'POST') {
    requirePerm(db,user,'ai.portfolio'); const current=store.read();
    const portfolio=current.research.map(r=>({id:r.id,title:r.title,status:r.status,organizationId:r.organizationId||null,type:current.researchTypes.find(t=>t.id===r.typeId)?.name||'',updatedAt:r.updatedAt,evidence:current.evidence.filter(e=>e.researchId===r.id).map(e=>({code:e.code,status:e.status}))})); const signals=portfolioSignals(current); const knowledge=buildInstitutionalKnowledge(current,'all').slice(0,20);
    const routed=await runAI(current,'portfolio',{task:'Phân tích danh mục nghiên cứu cấp trường để hỗ trợ nhà quản lý ra quyết định. Xác định điểm nghẽn, rủi ro, hồ sơ cần ưu tiên, cơ hội phối hợp và các câu hỏi quản trị cần con người xem xét. Không tự ra quyết định phân bổ nguồn lực.',content:JSON.stringify({portfolio,signals},null,2),context:{scope:'NUTE RIS portfolio',researchCount:portfolio.length,institutionalKnowledge:knowledge}}); const result=routed.result,pvd=routed.provider;
    store.tx(x=>audit(x,user.id,'ai.portfolio.analyze','portfolio','university',{researchCount:portfolio.length,providerId:pvd.id,model:pvd.model,attempts:routed.attempts.length})); return json(res,200,{result,provider:{name:pvd.name,model:pvd.model},attempts:routed.attempts});
  }

  if (p === '/api/ai/providers' && method === 'GET') {
    requirePerm(db,user,'ai.configure'); return json(res,200,db.aiProviders.map(maskProvider));
  }
  if (p === '/api/ai/providers/models' && method === 'POST') {
    requirePerm(db,user,'ai.configure'); const b=await bodyJson(req); let pvd=b.id?db.aiProviders.find(v=>v.id===b.id):null;
    if(!pvd)pvd={kind:b.kind,endpoint:b.endpoint,modelsEndpoint:b.modelsEndpoint,model:b.model,capabilities:b.capabilities,generation:b.generation,secret:b.apiKey?cipher.encrypt(String(b.apiKey)):null};
    else pvd={...pvd,kind:b.kind||pvd.kind,endpoint:b.endpoint??pvd.endpoint,modelsEndpoint:b.modelsEndpoint??pvd.modelsEndpoint,model:b.model||pvd.model};
    const key=b.apiKey?String(b.apiKey):(pvd?.secret?cipher.decrypt(pvd.secret):'');
    const models=await listProviderModels(pvd,key);
    return json(res,200,{models,count:models.length});
  }
  if (p === '/api/ai/providers/probe' && method === 'POST') {
    requirePerm(db,user,'ai.configure'); const b=await bodyJson(req); let pvd=b.id?db.aiProviders.find(v=>v.id===b.id):null;
    if(!pvd)pvd={kind:b.kind,endpoint:b.endpoint,modelsEndpoint:b.modelsEndpoint,model:b.model,capabilities:b.capabilities,generation:b.generation,secret:b.apiKey?cipher.encrypt(String(b.apiKey)):null};
    else pvd={...pvd,kind:b.kind||pvd.kind,endpoint:b.endpoint??pvd.endpoint,modelsEndpoint:b.modelsEndpoint??pvd.modelsEndpoint,model:b.model||pvd.model,capabilities:b.capabilities||pvd.capabilities,generation:b.generation||pvd.generation};
    const key=b.apiKey?String(b.apiKey):(pvd?.secret?cipher.decrypt(pvd.secret):''); if(!key&&pvd.kind!=='ollama')return json(res,400,{message:'Chưa có API key.'});
    const result=await probeModelCapabilities(pvd,key);
    if(b.id&&result.reachable){store.tx(x=>{const target=x.aiProviders.find(v=>v.id===b.id);if(target){target.capabilities=result.capabilities;target.modelMetadata={...(target.modelMetadata||{}),probe:result.probes,probedAt:result.probedAt};target.updatedAt=new Date().toISOString();audit(x,user.id,'aiProvider.probe','aiProvider',target.id,{model:target.model,capabilities:result.capabilities});}})}
    return json(res,200,result);
  }
  if (p === '/api/ai/providers' && method === 'POST') {
    requirePerm(db,user,'ai.configure'); const b=await bodyJson(req);
    const provider=store.tx(x=>{const now=new Date().toISOString();let pvd=b.id?x.aiProviders.find(v=>v.id===b.id):null;if(!pvd){pvd={id:randomId('aip'),createdAt:now};x.aiProviders.push(pvd);}pvd.name=String(b.name||'AI Provider');pvd.kind=String(b.kind||'openai');pvd.endpoint=String(b.endpoint||'');pvd.modelsEndpoint=String(b.modelsEndpoint||pvd.modelsEndpoint||'');pvd.model=String(b.model||'');pvd.enabled=b.enabled!==false;pvd.primary=b.primary===true||b.active===true;pvd.active=pvd.primary;pvd.priority=Math.max(1,Math.min(999,Number(b.priority??pvd.priority??100)||100));pvd.routes=Array.isArray(b.routes)&&b.routes.length?b.routes.map(String):Array.isArray(pvd.routes)&&pvd.routes.length?pvd.routes:['*'];pvd.capabilities=normalizeModelCapabilities(b.capabilities||pvd.capabilities||{});pvd.generation=normalizeGenerationSettings(b.generation||pvd.generation||{});pvd.modelMetadata={...(pvd.modelMetadata||{}),...(b.modelMetadata&&typeof b.modelMetadata==='object'?b.modelMetadata:{}),updatedAt:now};pvd.updatedAt=now;if(b.apiKey)pvd.secret=cipher.encrypt(String(b.apiKey));if(pvd.primary)for(const other of x.aiProviders)if(other.id!==pvd.id){other.primary=false;other.active=false;}audit(x,user.id,'aiProvider.save','aiProvider',pvd.id,{kind:pvd.kind,model:pvd.model,enabled:pvd.enabled,primary:pvd.primary,priority:pvd.priority,routes:pvd.routes,capabilities:pvd.capabilities});return maskProvider(pvd);});
    return json(res,201,provider);
  }
  if (p === '/api/ai/providers/test' && method === 'POST') {
    requirePerm(db,user,'ai.configure'); const b=await bodyJson(req); let pvd=b.id?db.aiProviders.find(v=>v.id===b.id):null;
    if(!pvd)pvd={kind:b.kind,endpoint:b.endpoint,modelsEndpoint:b.modelsEndpoint,model:b.model,capabilities:normalizeModelCapabilities(b.capabilities||{}),generation:normalizeGenerationSettings(b.generation||{}),secret:b.apiKey?cipher.encrypt(String(b.apiKey)):null};
    else pvd={...pvd,kind:b.kind||pvd.kind,endpoint:b.endpoint??pvd.endpoint,model:b.model||pvd.model,capabilities:normalizeModelCapabilities(b.capabilities||pvd.capabilities||{}),generation:normalizeGenerationSettings(b.generation||pvd.generation||{})};
    const key=b.apiKey?String(b.apiKey):(pvd?.secret?cipher.decrypt(pvd.secret):''); if(!key&&pvd.kind!=='ollama')return json(res,400,{message:'Chưa có API key.'});
    if(!pvd.model){const models=await listProviderModels(pvd,key);return json(res,200,{ok:true,keyValid:true,response:`API key hợp lệ. Provider trả về ${models.length} model.`,models:models.slice(0,20)});}
    const text=await invokeAI(pvd,key,{task:'Kiểm tra kết nối',content:'Chỉ trả lời đúng một từ: OK'}); return json(res,200,{ok:true,keyValid:true,response:String(text).slice(0,300),provider:pvd.kind,model:pvd.model});
  }
  if (p === '/api/ai/assist' && method === 'POST') {
    requirePerm(db,user,'ai.use'); const b=await bodyJson(req); const current=store.read();
    const contextual=b.context?.researchId?{...buildResearchContext(current,b.context.researchId),...(b.context||{})}:(b.context||{});
    const incomingFiles=Array.isArray(b.files)?b.files:[];
    const attachments=await saveAndExtractDocuments({uploadsDir:UPLOADS,files:incomingFiles,prefix:'copilot'}); contextual.userAttachments=attachments.map(publicDocument);
    const nativeAttachments=incomingFiles.map(uploadedDocumentToAIFile).filter(Boolean);
    const attachmentText=combineDocuments(attachments.filter(d=>d.extractedText),160000); const combined=[String(b.content||''),attachmentText].filter(Boolean).join('\n\n');
    if(!combined.trim()&&!nativeAttachments.length)throw bad('Cần nhập nội dung hoặc tải ít nhất một tệp PDF/DOC/DOCX/TXT có thể đọc.');
    const routed=await runAI(current,String(b.route||'general'),{task:b.task,content:combined,attachments:nativeAttachments,context:contextual}); const result=routed.result,pvd=routed.provider;
    store.tx(x=>audit(x,user.id,'ai.invoke','aiProvider',pvd.id,{task:b.task,route:String(b.route||'general'),attachmentCount:attachments.length,attempts:routed.attempts.length})); return json(res,200,{result,provider:{name:pvd.name,kind:pvd.kind,model:pvd.model},attachments:attachments.map(publicDocument),attempts:routed.attempts});
  }


  if (p === '/api/researcher-profiles' && method === 'GET') {
    requirePerm(db,user,'intelligence.read');
    return json(res,200,(db.researcherProfiles||[]).map(p=>({...p,user:publicUser(db.users.find(u=>u.id===p.userId)||{id:p.userId,username:'',displayName:p.displayName||'Không rõ',roles:[]})})));
  }
  if (p === '/api/researcher-profiles/me' && method === 'GET') {
    const profile=(db.researcherProfiles||[]).find(x=>x.userId===user.id)||null; const organization=(db.organizations||[]).find(o=>o.id===(profile?.organizationId||user.organizationId))||null; return json(res,200,{...(profile||{}),organizationId:profile?.organizationId||user.organizationId||null,organization});
  }
  if (p === '/api/researcher-profiles/me' && method === 'POST') {
    const b=await bodyJson(req); const profile=store.tx(x=>{x.researcherProfiles=x.researcherProfiles||[];let p=x.researcherProfiles.find(v=>v.userId===user.id);if(!p){p={id:randomId('rpf'),userId:user.id,createdAt:new Date().toISOString()};x.researcherProfiles.push(p);}const organizationId=String(user.organizationId||'')||null;if(organizationId&&!x.organizations.some(o=>o.id===organizationId))throw bad('Đơn vị không tồn tại.');p.displayName=user.displayName;p.organizationId=organizationId;p.department=(x.organizations||[]).find(o=>o.id===organizationId)?.name||'';p.bio=String(b.bio||'');p.expertise=Array.isArray(b.expertise)?b.expertise.map(String):[];p.keywords=Array.isArray(b.keywords)?b.keywords.map(String):[];p.orcid=String(b.orcid||'');p.active=b.active!==false;p.updatedAt=new Date().toISOString();audit(x,user.id,'researcherProfile.save','researcherProfile',p.id,{organizationId});return p;});return json(res,200,profile);
  }

  if (p === '/api/personnel' && method === 'GET') {
    requirePerm(db,user,'user.manage'); const orgId=String(url.searchParams.get('organizationId')||''); const category=String(url.searchParams.get('category')||''); let rows=(db.personnel||[]);if(orgId)rows=rows.filter(v=>v.organizationId===orgId);if(category)rows=rows.filter(v=>v.category===category);return json(res,200,rows.map(v=>({...v,organization:(db.organizations||[]).find(o=>o.id===v.organizationId)||null,user:v.userId?publicUser(db.users.find(u=>u.id===v.userId)||{id:v.userId,username:'',displayName:v.fullName,roles:[]}):null})));
  }
  if (p === '/api/personnel' && method === 'POST') {
    requirePerm(db,user,'user.manage');const b=await bodyJson(req);const item=store.tx(x=>{x.personnel=x.personnel||[];let v=b.id?x.personnel.find(z=>z.id===b.id):null;if(!v){v={id:randomId('person'),createdAt:new Date().toISOString()};x.personnel.push(v);}const orgId=String(b.organizationId||'');if(!orgId||!x.organizations.some(o=>o.id===orgId))throw bad('Cần chọn đơn vị hợp lệ.');v.code=String(b.code||'').trim();v.fullName=String(b.fullName||'').trim();v.category=String(b.category||'LECTURER').toUpperCase();v.organizationId=orgId;v.email=String(b.email||'').trim();v.phone=String(b.phone||'').trim();v.title=String(b.title||'').trim();v.studentClass=String(b.studentClass||'').trim();v.active=b.active!==false;v.updatedAt=new Date().toISOString();if(!v.fullName)throw bad('Họ tên không được để trống.');if(!['STAFF','LECTURER','STUDENT','RESEARCHER','EXTERNAL'].includes(v.category))throw bad('Nhóm nhân sự không hợp lệ.');audit(x,user.id,'personnel.save','personnel',v.id,{organizationId:orgId,category:v.category});return v;});return json(res,201,item);
  }
  const personnelAccountMatch=p.match(/^\/api\/personnel\/([^/]+)\/account$/);
  if(personnelAccountMatch && method==='POST'){
    requirePerm(db,user,'user.manage');const b=await bodyJson(req);const out=store.tx(x=>{const person=(x.personnel||[]).find(v=>v.id===personnelAccountMatch[1]);if(!person)throw notFound('Không tìm thấy nhân sự.');if(person.userId)throw bad('Nhân sự này đã được cấp tài khoản.');const username=String(b.username||person.email?.split('@')[0]||person.code||'').trim();if(!username)throw bad('Cần tên đăng nhập.');if(x.users.some(u=>u.username.toLowerCase()===username.toLowerCase()))throw bad('Tên đăng nhập đã tồn tại.');const password=String(b.password||'');if(password.length<10)throw bad('Mật khẩu khởi tạo cần tối thiểu 10 ký tự.');const roles=Array.isArray(b.roles)?b.roles.filter(Boolean):[];if(!roles.length)throw bad('Cần chọn vai trò truy cập.');if(!person.organizationId&&!roles.includes('SYSTEM_ADMIN'))throw bad('Nhân sự phải được gán đơn vị trước khi cấp tài khoản nghiệp vụ.');const u={id:randomId('usr'),username,displayName:person.fullName,passwordHash:hashPassword(password),status:'ACTIVE',mustChangePassword:true,roles,organizationId:person.organizationId,personnelId:person.id,createdAt:new Date().toISOString()};x.users.push(u);person.userId=u.id;person.updatedAt=new Date().toISOString();audit(x,user.id,'personnel.account.create','user',u.id,{personnelId:person.id,organizationId:person.organizationId});return publicUser(u);});return json(res,201,out);
  }

  if(p==='/api/scientific-profile/me/export' && method==='GET'){
    if(!can(db,user,'scientific.profile.export')&&!can(db,user,'profile.manage')&&!can(db,user,'*'))throw forbidden();
    return sendHtml(res,200,buildScientificProfileExportHtml(db,user.id));
  }
  const scientificExportMatch=p.match(/^\/api\/scientific-profile\/([^/]+)\/export$/);
  if(scientificExportMatch && method==='GET'){
    const targetId=scientificExportMatch[1];
    if(targetId!==user.id&&!can(db,user,'scientific.profile.approve')&&!can(db,user,'user.manage'))throw forbidden();
    if(!(db.users||[]).some(u=>u.id===targetId))throw notFound('Không tìm thấy người dùng.');
    return sendHtml(res,200,buildScientificProfileExportHtml(db,targetId));
  }
  if(p==='/api/scientific-profile/me' && method==='GET'){
    const sp=(db.scientificProfiles||[]).find(v=>v.userId===user.id)||null;const org=(db.organizations||[]).find(o=>o.id===user.organizationId)||null;const snapshot=buildScientificSnapshot(db,user.id);return json(res,200,{...(sp||{}),user:publicUser(user),organization:org,systemSnapshot:snapshot,documents:(sp?.documents||[]).map(publicDocument)});
  }
  if(p==='/api/scientific-profile/me' && method==='POST'){
    const b=await bodyJson(req);const item=store.tx(x=>{x.scientificProfiles=x.scientificProfiles||[];let sp=x.scientificProfiles.find(v=>v.userId===user.id);if(!sp){sp={id:randomId('sci'),userId:user.id,createdAt:new Date().toISOString(),documents:[]};x.scientificProfiles.push(sp);}for(const key of ['academicTitle','degree','orcid','scopusId','wosId','googleScholarUrl','researcherId','bio','education','awards','technologyTransfer'])sp[key]=String(b[key]||'');sp.expertise=Array.isArray(b.expertise)?b.expertise.map(String):[];sp.keywords=Array.isArray(b.keywords)?b.keywords.map(String):[];sp.updatedAt=new Date().toISOString();audit(x,user.id,'scientificProfile.save','scientificProfile',sp.id);return sp;});return json(res,200,item);
  }
  if(p==='/api/scientific-profile/me/sync' && method==='POST'){
    const snapshot=buildScientificSnapshot(store.read(),user.id);const item=store.tx(x=>{x.scientificProfiles=x.scientificProfiles||[];let sp=x.scientificProfiles.find(v=>v.userId===user.id);if(!sp){sp={id:randomId('sci'),userId:user.id,createdAt:new Date().toISOString(),documents:[]};x.scientificProfiles.push(sp);}const rp=(x.researcherProfiles||[]).find(v=>v.userId===user.id)||{};const person=(x.personnel||[]).find(v=>v.userId===user.id||v.id===user.personnelId)||{};sp.organizationId=user.organizationId||sp.organizationId||null;sp.personnelId=user.personnelId||person.id||sp.personnelId||null;sp.positionTitle=sp.positionTitle||person.title||'';sp.orcid=sp.orcid||rp.orcid||'';if(!(sp.expertise||[]).length)sp.expertise=Array.isArray(rp.expertise)?rp.expertise:[];if(!(sp.keywords||[]).length)sp.keywords=Array.isArray(rp.keywords)?rp.keywords:[];sp.bio=sp.bio||rp.bio||'';sp.systemSnapshot=snapshot;sp.lastSyncedAt=new Date().toISOString();sp.updatedAt=sp.lastSyncedAt;audit(x,user.id,'scientificProfile.sync','scientificProfile',sp.id,{researchCount:snapshot.researchCount,recognizedCount:snapshot.recognizedCount,publicationCount:snapshot.publicationCount});return sp;});return json(res,200,{...item,systemSnapshot:snapshot,documents:(item.documents||[]).map(publicDocument)});
  }
  if(p==='/api/scientific-profile/me/documents' && method==='POST'){
    const b=await bodyJson(req);const files=Array.isArray(b.files)?b.files:[];if(!files.length)throw bad('Chưa chọn tệp.');if(files.length>10)throw bad('Mỗi lần chỉ tải tối đa 10 tệp.');const docs=await saveAndExtractDocuments({uploadsDir:UPLOADS,files,prefix:'scientific'});const item=store.tx(x=>{x.scientificProfiles=x.scientificProfiles||[];let sp=x.scientificProfiles.find(v=>v.userId===user.id);if(!sp){sp={id:randomId('sci'),userId:user.id,createdAt:new Date().toISOString(),documents:[]};x.scientificProfiles.push(sp);}sp.documents=sp.documents||[];for(const d of docs)sp.documents.push({...d,id:randomId('scidoc'),category:String(b.category||'OTHER'),title:d.originalName,uploadedAt:new Date().toISOString()});sp.updatedAt=new Date().toISOString();audit(x,user.id,'scientificProfile.documents.upload','scientificProfile',sp.id,{count:docs.length});return sp;});return json(res,201,{...item,documents:(item.documents||[]).map(publicDocument)});
  }
  const scientificDocDeleteMatch=p.match(/^\/api\/scientific-profile\/me\/documents\/([^/]+)$/);
  if(scientificDocDeleteMatch && method==='DELETE'){
    const removed=store.tx(x=>{const sp=(x.scientificProfiles||[]).find(v=>v.userId===user.id);if(!sp)throw notFound('Chưa có hồ sơ khoa học.');const i=(sp.documents||[]).findIndex(d=>d.id===scientificDocDeleteMatch[1]);if(i<0)throw notFound('Không tìm thấy tệp.');const [d]=sp.documents.splice(i,1);sp.updatedAt=new Date().toISOString();audit(x,user.id,'scientificProfile.document.delete','scientificProfile',sp.id,{documentId:d.id});return d;});removeUploadFile(removed.fileUrl);return json(res,200,{ok:true});
  }

  if (p === '/api/knowledge' && method === 'GET') {
    requirePerm(db,user,'intelligence.read'); return json(res,200,(db.knowledgeDocuments||[]).map(publicKnowledge));
  }
  if (p === '/api/knowledge' && method === 'POST') {
    requirePerm(db,user,'knowledge.manage'); const b=await bodyJson(req);
    const files=Array.isArray(b.files)?b.files:(b.file?[b.file]:[]);if(files.length>10)throw bad('Mỗi lần chỉ tải tối đa 10 tệp.');const uploaded=await saveAndExtractDocuments({uploadsDir:UPLOADS,files,prefix:'knowledge'});
    const doc=store.tx(x=>{x.knowledgeDocuments=x.knowledgeDocuments||[];let d=b.id?x.knowledgeDocuments.find(v=>v.id===b.id):null;if(!d){d={id:randomId('kdoc'),createdAt:new Date().toISOString(),createdBy:user.id,sourceDocuments:[]};x.knowledgeDocuments.unshift(d);}const prev=Array.isArray(d.sourceDocuments)?d.sourceDocuments:(d.sourceDocument?[d.sourceDocument]:[]);d.title=String(b.title||'').trim();d.kind=String(b.kind||'policy');d.scope=String(b.scope||'all');d.sourceDocuments=[...prev,...uploaded.map(v=>({...v,id:randomId('kfile'),extractedText:String(v.extractedText||'').slice(0,500000)}))];d.sourceDocument=null;const extracted=combineDocuments(d.sourceDocuments.filter(v=>v.extractedText),500000);d.content=String(b.content||'').trim()||extracted||d.content||'';d.active=b.active!==false;d.updatedAt=new Date().toISOString();if(!d.title)throw bad('Tên tài liệu tri thức không được để trống.');if(!d.content&&!d.sourceDocuments.length)throw bad('Cần nhập nội dung hoặc tải lên tệp tài liệu.');audit(x,user.id,'knowledge.save','knowledgeDocument',d.id,{kind:d.kind,scope:d.scope,sourceDocumentCount:d.sourceDocuments.length});return d;}); return json(res,201,publicKnowledge(doc));
  }
  const knowledgeSourceDeleteMatch=p.match(/^\/api\/knowledge\/([^/]+)\/source-documents\/([^/]+)$/);
  if(knowledgeSourceDeleteMatch && method==='DELETE'){
    requirePerm(db,user,'knowledge.manage');const removed=store.tx(x=>{const d=(x.knowledgeDocuments||[]).find(v=>v.id===knowledgeSourceDeleteMatch[1]);if(!d)throw notFound('Không tìm thấy tài liệu tri thức.');const docs=Array.isArray(d.sourceDocuments)?d.sourceDocuments:(d.sourceDocument?[d.sourceDocument]:[]);const i=docs.findIndex(v=>(v.id||v.storedName)===knowledgeSourceDeleteMatch[2]);if(i<0)throw notFound('Không tìm thấy tệp nguồn.');const [file]=docs.splice(i,1);d.sourceDocuments=docs;d.sourceDocument=null;d.content=String(d.content||'');d.updatedAt=new Date().toISOString();audit(x,user.id,'knowledge.source.delete','knowledgeDocument',d.id,{documentId:file.id||file.storedName});return file;});removeUploadFile(removed.fileUrl);return json(res,200,{ok:true});
  }

  const knowledgeAnalyzeMatch=p.match(/^\/api\/knowledge\/([^/]+)\/analyze$/);
  if(knowledgeAnalyzeMatch && method==='POST'){
    requirePerm(db,user,'knowledge.manage');const current=store.read();const d=(current.knowledgeDocuments||[]).find(v=>v.id===knowledgeAnalyzeMatch[1]);if(!d)throw notFound('Không tìm thấy tài liệu tri thức.');const docs=knowledgeSourceDocuments(d);const extracted=combineDocuments(docs.filter(v=>v.extractedText),220000);const content=[String(d.content||''),extracted].filter(Boolean).join('\n\n');const nativeAttachments=docs.map(v=>storedDocumentToAIFile(UPLOADS,v)).filter(Boolean);if(!content.trim()&&!nativeAttachments.length)throw bad('Tài liệu chưa có nội dung mà hệ thống hoặc AI có thể đọc. Hãy kiểm tra tệp nguồn.');const routed=await runAI(current,'workflow',{task:'Phân tích tài liệu quy định/quy chế/tri thức thể chế cho NUTE RIS. Tóm tắt phạm vi áp dụng; đối tượng; trách nhiệm; quy trình; điều kiện; hồ sơ/minh chứng; thẩm quyền; thời hạn; các nhánh không đạt/trả lại; rủi ro diễn giải; và những điều khoản cần con người xác nhận. Không tự tạo quy định mới. Khi có nhiều tệp, nêu mâu thuẫn giữa các tệp nếu có.',content,attachments:nativeAttachments,context:{knowledge:{id:d.id,title:d.title,kind:d.kind,scope:d.scope},documents:docs.map(x=>({name:x.originalName,status:x.extractionStatus,engine:x.extractionEngine,checksum:x.checksumSha256,nativeAiReadable:!!x.nativeAiReadable}))}});const result=routed.result,pvd=routed.provider;store.tx(x=>{const k=x.knowledgeDocuments.find(v=>v.id===d.id);k.aiAnalysis={result:String(result||''),providerId:pvd.id,model:pvd.model,at:new Date().toISOString(),by:user.id,attempts:routed.attempts};audit(x,user.id,'knowledge.ai.analyze','knowledgeDocument',d.id,{providerId:pvd.id,model:pvd.model});});return json(res,200,{result,provider:{name:pvd.name,model:pvd.model},attempts:routed.attempts});
  }

  if (p === '/api/intelligence/portfolio' && method === 'GET') {
    requirePerm(db,user,'intelligence.read'); return json(res,200,portfolioSignals(db));
  }
  if (p === '/api/intelligence/search' && method === 'GET') {
    requirePerm(db,user,'intelligence.read'); const q=String(url.searchParams.get('q')||'').trim(); if(!q)return json(res,200,[]);
    const rows=semanticResearchSearch(db,q,30).map(x=>({score:x.score,research:enrichResearch(db,x.research)})); return json(res,200,rows);
  }
  const similarMatch=p.match(/^\/api\/intelligence\/research\/([^/]+)\/similar$/);
  if (similarMatch && method === 'GET') {
    requirePerm(db,user,'intelligence.read'); const r=db.research.find(v=>v.id===similarMatch[1]);if(!r||!canReadResearch(db,user,r))throw forbidden();return json(res,200,findSimilarResearch(db,r.id,12).map(x=>({score:x.score,research:enrichResearch(db,x.research)})));
  }
  const reviewerMatch=p.match(/^\/api\/intelligence\/research\/([^/]+)\/reviewers$/);
  if (reviewerMatch && method === 'GET') {
    requirePerm(db,user,'reviewer.match'); const r=db.research.find(v=>v.id===reviewerMatch[1]);if(!r||!canReadResearch(db,user,r))throw forbidden();return json(res,200,matchReviewers(db,r.id,12));
  }
  const policyMatch=p.match(/^\/api\/intelligence\/research\/([^/]+)\/policies$/);
  if (policyMatch && method === 'GET') {
    requirePerm(db,user,'intelligence.read'); const r=db.research.find(v=>v.id===policyMatch[1]);if(!r||!canReadResearch(db,user,r))throw forbidden();return json(res,200,policyFindings(db,r.id));
  }

  if (p === '/api/ai/autopilot' && method === 'GET') {
    requirePerm(db,user,'ai.decision.read'); return json(res,200,{enabled:!!db.meta.aiAutopilot,pending:(db.aiWorkItems||[]).filter(x=>x.status==='PENDING').length});
  }
  if (p === '/api/ai/autopilot' && method === 'POST') {
    requirePerm(db,user,'ai.decision.manage'); const b=await bodyJson(req); store.tx(x=>{x.meta.aiAutopilot=!!b.enabled;audit(x,user.id,'ai.autopilot.set','system','ai',{enabled:!!b.enabled});});return json(res,200,{enabled:!!b.enabled});
  }

  if (p === '/api/audit' && method === 'GET') { requirePerm(db,user,'audit.read'); return json(res,200,db.audit.slice(0,500)); }

  return json(res,404,{message:'API không tồn tại.'});
}

function resolveSession(req, db) { const token=parseCookies(req.headers.cookie||'').nute_session; if(!token)return null; return db.sessions.find(s=>s.tokenHash===hashToken(token)&&new Date(s.expiresAt)>new Date())||null; }
function permissionsOf(db,user){const s=new Set();for(const code of user.roles||[]){const r=db.roles.find(x=>x.code===code);for(const p of r?.permissions||[])s.add(p)}return [...s]}
function publicUser(u){return {id:u.id,username:u.username,displayName:u.displayName,status:u.status,mustChangePassword:!!u.mustChangePassword,roles:u.roles||[],organizationId:u.organizationId||null,createdAt:u.createdAt}}
function canReadResearch(db,user,r){return r.ownerId===user.id||(r.participantIds||[]).includes(user.id)||can(db,user,'research.read.all')||(can(db,user,'research.read.unit')&&!!user.organizationId&&user.organizationId===r.organizationId)}
function enrichResearch(db,r){return {...r,type:db.researchTypes.find(t=>t.id===r.typeId)||null,organization:(db.organizations||[]).find(o=>o.id===r.organizationId)||null,owner:publicUser(db.users.find(u=>u.id===r.ownerId)||{id:r.ownerId,username:'',displayName:'Không rõ',roles:[]})}}
function transitionOptions(db,user,r){const wf=db.workflows.find(w=>w.researchTypeId===r.typeId);const transitions=(wf?.transitions||[]).filter(t=>t.from===r.status);const isParticipant=r.ownerId===user.id||(r.participantIds||[]).includes(user.id);return transitions.map(t=>{const missing=missingEvidence(db,r.id,t);const permission=t.permission||null;const allowedByRole=permission?can(db,user,permission)||can(db,user,'research.transition'):isParticipant||can(db,user,'research.transition');return {...t,missingEvidence:missing,allowed:allowedByRole&&missing.length===0,allowedByRole,reason:!allowedByRole?(permission?`Cần quyền ${permission}`:'Chỉ chủ trì/thành viên hoặc người có quyền chuyển bước được thực hiện'):missing.length?`Thiếu minh chứng: ${missing.join(', ')}`:''};});}
function maskProvider(p){return {id:p.id,name:p.name,kind:p.kind,endpoint:p.endpoint,modelsEndpoint:p.modelsEndpoint||'',model:p.model,active:!!p.active,primary:!!(p.primary||p.active),enabled:p.enabled!==false,priority:Number(p.priority??100),routes:Array.isArray(p.routes)&&p.routes.length?p.routes:['*'],capabilities:normalizeModelCapabilities(p.capabilities||{}),generation:normalizeGenerationSettings(p.generation||{}),modelMetadata:p.modelMetadata||{},hasApiKey:!!p.secret,maskedKey:p.secret?'••••••••••••••••':null,createdAt:p.createdAt,updatedAt:p.updatedAt}}
function publicDocument(d){if(!d)return null;const {extractedText,...rest}=d;const ext=String(d.extension||path.extname(d.originalName||d.fileUrl||'')).toLowerCase();const nativeAiReadable=!!d.nativeAiReadable||ext==='.pdf';return {...rest,nativeAiReadable,analysisReady:!!extractedText||nativeAiReadable,extractedPreview:String(extractedText||'').slice(0,1200),hasExtractedText:!!extractedText}}
function workflowSourceDocuments(w){if(!w)return [];return Array.isArray(w.sourceDocuments)?w.sourceDocuments:(w.sourceDocument?[w.sourceDocument]:[])}
function knowledgeSourceDocuments(d){if(!d)return [];return Array.isArray(d.sourceDocuments)?d.sourceDocuments:(d.sourceDocument?[d.sourceDocument]:[])}
function publicWorkflow(w){if(!w)return null;return {...w,sourceDocument:null,sourceDocuments:workflowSourceDocuments(w).map(publicDocument)}}
function publicKnowledge(d){if(!d)return null;return {...d,sourceDocument:null,sourceDocuments:knowledgeSourceDocuments(d).map(publicDocument),contentPreview:String(d.content||'').slice(0,500)}}
function combineDocuments(docs,max=200000){let out='';for(const d of docs||[]){const t=String(d.extractedText||'').trim();if(!t)continue;const block=`\n\n===== ${d.originalName||'Tài liệu'} =====\n${t}`;if(out.length+block.length>max){out+=block.slice(0,Math.max(0,max-out.length));break;}out+=block;}return out.trim()}
function removeUploadFile(fileUrl){if(!fileUrl||!String(fileUrl).startsWith('/uploads/'))return;const f=path.join(UPLOADS,safeName(String(fileUrl).slice('/uploads/'.length)));try{if(f.startsWith(UPLOADS)&&fs.existsSync(f))fs.unlinkSync(f)}catch{}}
function buildScientificSnapshot(db,userId){
  const user=(db.users||[]).find(u=>u.id===userId)||{};
  const person=(db.personnel||[]).find(v=>v.userId===userId||v.id===user.personnelId)||null;
  const researcherProfile=(db.researcherProfiles||[]).find(v=>v.userId===userId)||null;
  const rows=(db.research||[]).filter(r=>r.ownerId===userId||(r.participantIds||[]).includes(userId));
  const recognized=rows.filter(r=>r.status==='RECOGNIZED');
  const byType={};
  const publications=[]; const intellectualProperty=[]; const projects=[]; const other=[];
  for(const r of rows){
    const type=(db.researchTypes||[]).find(t=>t.id===r.typeId);const name=type?.name||'Khác';byType[name]=(byType[name]||0)+1;
    const item={id:r.id,title:r.title,status:r.status,type:name,organization:(db.organizations||[]).find(o=>o.id===r.organizationId)?.name||'',ownerId:r.ownerId,updatedAt:r.updatedAt};
    const key=`${name} ${type?.code||''}`.toLowerCase();
    if(/công bố|bài báo|publication|journal|conference|kỷ yếu/.test(key))publications.push(item);
    else if(/sở hữu|sáng chế|giải pháp hữu ích|patent|intellectual|kiểu dáng/.test(key))intellectualProperty.push(item);
    else if(/đề tài|project|nhiệm vụ khoa học/.test(key))projects.push(item);
    else other.push(item);
  }
  const ids=new Set(rows.map(r=>r.id));
  const evidence=(db.evidence||[]).filter(e=>ids.has(e.researchId));
  const councils=(db.councils||[]).filter(c=>ids.has(c.researchId));
  const recognitions=(db.recognitions||[]).filter(r=>ids.has(r.researchId));
  const organization=(db.organizations||[]).find(o=>o.id===user.organizationId)||null;
  return {
    researchCount:rows.length,
    recognizedCount:recognized.length,
    publicationCount:publications.length,
    intellectualPropertyCount:intellectualProperty.length,
    projectCount:projects.length,
    evidenceCount:evidence.length,
    verifiedEvidenceCount:evidence.filter(e=>e.status==='VERIFIED').length,
    councilCount:councils.length,
    recognitionCount:recognitions.length,
    byType,
    research:rows.slice(0,100).map(r=>({id:r.id,title:r.title,status:r.status,type:(db.researchTypes||[]).find(t=>t.id===r.typeId)?.name||'',organization:(db.organizations||[]).find(o=>o.id===r.organizationId)?.name||'',updatedAt:r.updatedAt})),
    publications:publications.slice(0,100),
    intellectualProperty:intellectualProperty.slice(0,100),
    projects:projects.slice(0,100),
    other:other.slice(0,100),
    identity:{displayName:user.displayName||'',organizationId:user.organizationId||null,organizationName:organization?.name||'',personnelCode:person?.code||'',category:person?.category||'',positionTitle:person?.title||'',email:person?.email||'',orcid:researcherProfile?.orcid||'',expertise:researcherProfile?.expertise||[],keywords:researcherProfile?.keywords||[]},
    generatedAt:new Date().toISOString()
  };
}

function buildWorkflowTrace(db,user,r){
  const wf=(db.workflows||[]).find(w=>w.researchTypeId===r.typeId)||null;
  const decisions=(db.workflowDecisions||[]).filter(d=>d.researchId===r.id&&d.kind==='HUMAN_DECISION').slice(0,20);
  const outgoing=(wf?.transitions||[]).filter(t=>t.from===r.status).map(t=>({from:t.from,to:t.to,actionType:t.actionType||'',permission:t.permission||'',aiAssist:!!t.aiAssist,decisionGate:!!t.decisionGate,allowed:transitionOptions(db,user,r).some(x=>x.from===t.from&&x.to===t.to&&x.allowed)}));
  return {id:r.id,title:r.title,status:r.status,type:(db.researchTypes||[]).find(t=>t.id===r.typeId)?.name||'',organization:(db.organizations||[]).find(o=>o.id===r.organizationId)?.name||'',workflowName:wf?.name||'',next:outgoing,decisions:decisions.map(d=>({from:d.from,to:d.to,actionType:d.actionType||'',rationale:d.rationale||'',actorId:d.actorId||d.decidedBy||'',createdAt:d.createdAt})),updatedAt:r.updatedAt};
}


function buildScientificProfileExportHtml(db,userId){
  const user=(db.users||[]).find(u=>u.id===userId)||{};
  const sp=(db.scientificProfiles||[]).find(v=>v.userId===userId)||{};
  const snap=buildScientificSnapshot(db,userId);
  const ident=snap.identity||{};
  const e=escapeHtml;
  const join=(v)=>Array.isArray(v)?v.join(', '):String(v||'');
  const rows=(items,label)=>`<h2>${e(label)}</h2>${items?.length?`<table><thead><tr><th>STT</th><th>Tên hoạt động</th><th>Loại</th><th>Trạng thái</th><th>Đơn vị</th></tr></thead><tbody>${items.map((r,i)=>`<tr><td>${i+1}</td><td>${e(r.title)}</td><td>${e(r.type)}</td><td>${e(r.status)}</td><td>${e(r.organization||'')}</td></tr>`).join('')}</tbody></table>`:'<p>Chưa có dữ liệu.</p>'}`;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Lý lịch khoa học - ${e(user.displayName||'')}</title><style>@page{size:A4;margin:16mm}body{font-family:"Times New Roman",serif;color:#111;font-size:13pt;line-height:1.45;max-width:210mm;margin:auto}.head{text-align:center}.head h1{font-size:18pt;margin:12px 0 2px}.head p{margin:2px}.actions{position:fixed;right:16px;top:12px}@media print{.actions{display:none}}button{padding:8px 12px}h2{font-size:14pt;margin:18px 0 8px;border-bottom:1px solid #222;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin:8px 0 14px}th,td{border:1px solid #444;padding:6px;vertical-align:top}.info td:first-child{width:34%;font-weight:bold}.sign{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:35px;text-align:center}.small{font-size:11pt}</style></head><body><div class="actions"><button onclick="window.print()">In / Lưu PDF</button></div><div class="head"><p><b>TRƯỜNG ĐẠI HỌC SƯ PHẠM KỸ THUẬT NAM ĐỊNH</b></p><h1>LÝ LỊCH KHOA HỌC</h1><p class="small">Hồ sơ được kết xuất từ NUTE Research Intelligence System</p></div><h2>I. Thông tin cá nhân</h2><table class="info"><tr><td>Họ và tên</td><td>${e(user.displayName||'')}</td></tr><tr><td>Mã cán bộ / sinh viên</td><td>${e(ident.personnelCode||'')}</td></tr><tr><td>Đơn vị công tác</td><td>${e(ident.organizationName||'')}</td></tr><tr><td>Chức danh</td><td>${e(ident.positionTitle||'')}</td></tr><tr><td>Học hàm</td><td>${e(sp.academicTitle||'')}</td></tr><tr><td>Học vị</td><td>${e(sp.degree||'')}</td></tr><tr><td>ORCID</td><td>${e(sp.orcid||ident.orcid||'')}</td></tr><tr><td>Scopus ID</td><td>${e(sp.scopusId||'')}</td></tr><tr><td>WoS Researcher ID</td><td>${e(sp.wosId||'')}</td></tr><tr><td>Google Scholar</td><td>${e(sp.googleScholarUrl||'')}</td></tr><tr><td>Lĩnh vực chuyên môn</td><td>${e(join(sp.expertise?.length?sp.expertise:ident.expertise))}</td></tr><tr><td>Từ khóa nghiên cứu</td><td>${e(join(sp.keywords?.length?sp.keywords:ident.keywords))}</td></tr></table><h2>II. Tiểu sử và quá trình đào tạo</h2><p>${e(sp.bio||'').replace(/\n/g,'<br>')||'Chưa cập nhật.'}</p><p><b>Quá trình đào tạo:</b><br>${e(sp.education||'').replace(/\n/g,'<br>')||'Chưa cập nhật.'}</p>${rows(snap.projects,'III. Đề tài / nhiệm vụ khoa học')}${rows(snap.publications,'IV. Công trình công bố')}${rows(snap.intellectualProperty,'V. Sở hữu trí tuệ')}${rows(snap.other,'VI. Hoạt động khoa học khác')}<h2>VII. Khen thưởng và chuyển giao</h2><p><b>Khen thưởng:</b><br>${e(sp.awards||'').replace(/\n/g,'<br>')||'Chưa cập nhật.'}</p><p><b>Chuyển giao công nghệ:</b><br>${e(sp.technologyTransfer||'').replace(/\n/g,'<br>')||'Chưa cập nhật.'}</p><h2>VIII. Tổng hợp dữ liệu RIS</h2><table class="info"><tr><td>Tổng hoạt động tham gia</td><td>${snap.researchCount||0}</td></tr><tr><td>Đã công nhận</td><td>${snap.recognizedCount||0}</td></tr><tr><td>Minh chứng / đã xác minh</td><td>${snap.evidenceCount||0} / ${snap.verifiedEvidenceCount||0}</td></tr><tr><td>Hội đồng</td><td>${snap.councilCount||0}</td></tr><tr><td>Quyết định công nhận</td><td>${snap.recognitionCount||0}</td></tr></table><div class="sign"><div><b>XÁC NHẬN CỦA ĐƠN VỊ / NGƯỜI PHÊ DUYỆT</b><br><br><br><br><i>(Ký, ghi rõ họ tên)</i></div><div><b>NGƯỜI KHAI</b><br><br><br><br><b>${e(user.displayName||'')}</b></div></div></body></html>`;
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function sendHtml(res,status,body){res.statusCode=status;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Content-Disposition','inline');res.end(body)}

function requirePerm(db,user,p){if(!can(db,user,p))throw forbidden()}
function bad(message){const e=new Error(message);e.status=400;return e} function forbidden(){const e=new Error('Không có quyền thực hiện thao tác này.');e.status=403;return e} function notFound(message){const e=new Error(message);e.status=404;return e}

async function bodyJson(req){let total=0;const chunks=[];for await(const c of req){total+=c.length;if(total>180*1024*1024)throw bad('Payload quá lớn. Tải tối đa 10 tệp, mỗi tệp không quá 25 MB.');chunks.push(c)}if(!chunks.length)return {};try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw bad('JSON không hợp lệ.')}}
function parseCookies(raw){const o={};for(const part of raw.split(';')){const i=part.indexOf('=');if(i>0)o[decodeURIComponent(part.slice(0,i).trim())]=decodeURIComponent(part.slice(i+1).trim())}return o}
function cookie(name,value,maxAge){return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.COOKIE_SECURE==='1'?'; Secure':''}`}
function json(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data))}
function setSecurityHeaders(res){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")}
function safeName(n){return path.basename(String(n)).replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120)}
function serveUploadSecure(req,res,name){if(req.method!=='GET')return json(res,405,{message:'Method not allowed'});const db=store.read();const session=resolveSession(req,db);if(!session)return json(res,401,{message:'Cần đăng nhập để tải tài liệu.'});const f=path.join(UPLOADS,safeName(name));if(!f.startsWith(UPLOADS)||!fs.existsSync(f))return json(res,404,{message:'Không tìm thấy tệp.'});const ext=path.extname(f).toLowerCase();const types={'.pdf':'application/pdf','.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.txt':'text/plain; charset=utf-8','.md':'text/markdown; charset=utf-8','.rtf':'application/rtf'};res.setHeader('Content-Type',types[ext]||'application/octet-stream');res.setHeader('Content-Disposition',`attachment; filename="${safeName(name)}"`);fs.createReadStream(f).pipe(res)}
function serveStatic(res,pathname){let rel=pathname==='/'?'index.html':pathname.slice(1);if(!['index.html','app.js','styles.css','logo-nute.jpg'].includes(rel))rel='index.html';const f=path.join(PUBLIC,rel);if(!fs.existsSync(f))return json(res,404,{message:'Not found'});const ext=path.extname(f);res.setHeader('Content-Type',ext==='.html'?'text/html; charset=utf-8':ext==='.js'?'text/javascript; charset=utf-8':ext==='.css'?'text/css; charset=utf-8':'image/jpeg');fs.createReadStream(f).pipe(res)}

async function runAI(current, route, request){
  return invokeAIWithFallback({providers:current.aiProviders||[],route,request,decrypt:s=>cipher.decrypt(s),invoke:invokeAI});
}

async function autoProcessOneAIWorkItem(){
  const current=store.read(); if(!current.meta?.aiAutopilot)return;
  const item=(current.aiWorkItems||[]).find(x=>x.status==='PENDING'); if(!item)return;
  store.tx(x=>{const w=x.aiWorkItems.find(v=>v.id===item.id);if(w&&w.status==='PENDING'){w.status='PROCESSING';w.processingAt=new Date().toISOString();}});
  try{
    const context=buildResearchContext(current,item.researchId);
    context.institutionalKnowledge=buildInstitutionalKnowledge(current,'all').slice(0,25);
    context.policyRelevance=policyFindings(current,item.researchId);
    context.similarResearch=findSimilarResearch(current,item.researchId,8).map(x=>({id:x.research.id,title:x.research.title,score:x.score}));
    const task=`${item.label}. Bạn là lớp Decision Intelligence của NUTE RIS. Hãy dùng hồ sơ, quy trình, minh chứng, tri thức thể chế, tiền lệ quyết định và nghiên cứu tương tự trong context. Trả về JSON duy nhất: summary, facts[], risks[], missing[], policy_considerations[], similar_or_duplicate_signals[], options[], recommendation, confidence (0-1), human_questions[]. Không thay con người ra quyết định hành chính.`;
    const routed=await runAI(current,'decision',{task,content:JSON.stringify(item.payload||{},null,2),context}); const result=routed.result,pvd=routed.provider; const parsed=parseAIRecommendation(result);
    store.tx(x=>{const wi=x.aiWorkItems.find(v=>v.id===item.id);if(!wi)return;const r={id:randomId('air'),workItemId:item.id,researchId:item.researchId,decisionPoint:item.decisionPoint,providerId:pvd.id,providerName:pvd.name,model:pvd.model,raw:parsed.raw,structured:parsed.structured,createdBy:'SYSTEM_AI',createdAt:new Date().toISOString(),status:'AWAITING_HUMAN',autopilot:true,attempts:routed.attempts};x.aiRecommendations.unshift(r);wi.status='ANALYZED';wi.processedAt=r.createdAt;wi.recommendationId=r.id;audit(x,'SYSTEM_AI','ai.autopilot.analyze','research',item.researchId,{workItemId:item.id,recommendationId:r.id,providerId:pvd.id,model:pvd.model,attempts:routed.attempts.length});});
  }catch(err){store.tx(x=>{const wi=x.aiWorkItems.find(v=>v.id===item.id);if(wi){wi.status='PENDING';wi.lastError=String(err?.message||err);wi.failedAt=new Date().toISOString();}});console.error('AI autopilot:',err?.message||err);}
}
setInterval(()=>autoProcessOneAIWorkItem().catch(()=>{}),12000).unref();

server.on('clientError',(_err,socket)=>socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'));
server.listen(PORT,HOST,()=>console.log(`NUTE Research SBBS running at http://${HOST}:${PORT}`));

process.on('uncaughtException',err=>{if(err?.status){console.error('Request error:',err.message)}else console.error(err)});
