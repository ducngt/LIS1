(function(){
  'use strict';
  const KEY='nute-ris-v551-full-demo-state';
  const SESSION='nute-ris-v551-demo-user';
  const now=()=>new Date().toISOString();
  const uid=(p='id')=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const clone=x=>JSON.parse(JSON.stringify(x));

  const allPerms=['*'];
  const rolePerms={
    SYSTEM_ADMIN:['*'],
    RESEARCH_PARTICIPANT:['research.create','research.read.self','research.submit','research.document.upload','evidence.upload','ai.use','academic.ai.use','intelligence.read'],
    APPROVER_LEVEL_2:['research.read.all','research.approve.level2','evidence.verify','council.manage','ai.use','ai.decision.read','ai.decision.manage','intelligence.read','reviewer.match'],
    APPROVER_LEVEL_3:['research.read.all','research.approve.level3','ai.use','ai.decision.read','intelligence.read'],
    APPROVER_LEVEL_4:['research.read.all','research.approve.level4','recognition.approve','ai.use','ai.decision.read','ai.decision.manage','ai.portfolio','intelligence.read']
  };

  function initialState(){
    const orgs=[
      {id:'org-nute',code:'NUTE',name:'Trường Đại học Sư phạm Kỹ thuật Nam Định',type:'UNIVERSITY',parentId:'',active:true},
      {id:'org-cntt',code:'CNTT',name:'Khoa Công nghệ Thông tin',type:'FACULTY',parentId:'org-nute',active:true},
      {id:'org-ck',code:'CK',name:'Khoa Cơ khí',type:'FACULTY',parentId:'org-nute',active:true},
      {id:'org-khcn',code:'KHCN',name:'Phòng Khoa học Công nghệ',type:'OFFICE',parentId:'org-nute',active:true}
    ];
    const roles=[
      {code:'SYSTEM_ADMIN',name:'Quản trị hệ thống',permissions:allPerms},
      {code:'RESEARCH_PARTICIPANT',name:'Người tham gia nghiên cứu',permissions:rolePerms.RESEARCH_PARTICIPANT},
      {code:'APPROVER_LEVEL_2',name:'Duyệt cấp 2',permissions:rolePerms.APPROVER_LEVEL_2},
      {code:'APPROVER_LEVEL_3',name:'Duyệt cấp 3',permissions:rolePerms.APPROVER_LEVEL_3},
      {code:'APPROVER_LEVEL_4',name:'Duyệt cấp 4',permissions:rolePerms.APPROVER_LEVEL_4}
    ];
    const users=[
      {id:'u-admin',username:'admin',password:'admin123',displayName:'Quản trị RIS',organizationId:'org-nute',roles:['SYSTEM_ADMIN'],status:'ACTIVE',mustChangePassword:false},
      {id:'u-researcher',username:'researcher',password:'demo123',displayName:'Nguyễn Minh An',organizationId:'org-cntt',roles:['RESEARCH_PARTICIPANT'],status:'ACTIVE'},
      {id:'u-l2',username:'level2',password:'demo123',displayName:'Trưởng khoa Demo',organizationId:'org-cntt',roles:['APPROVER_LEVEL_2'],status:'ACTIVE'},
      {id:'u-l3',username:'level3',password:'demo123',displayName:'Phòng KHCN Demo',organizationId:'org-khcn',roles:['APPROVER_LEVEL_3'],status:'ACTIVE'},
      {id:'u-l4',username:'level4',password:'demo123',displayName:'Lãnh đạo Demo',organizationId:'org-nute',roles:['APPROVER_LEVEL_4'],status:'ACTIVE'}
    ];
    const personnel=[
      {id:'p-001',code:'GV001',fullName:'Nguyễn Minh An',category:'LECTURER',organizationId:'org-cntt',email:'an@nute.edu.vn',title:'Giảng viên',userId:'u-researcher'},
      {id:'p-002',code:'GV002',fullName:'Trần Thu Hà',category:'LECTURER',organizationId:'org-cntt',email:'ha@nute.edu.vn',title:'Tiến sĩ',userId:null},
      {id:'p-003',code:'CB001',fullName:'Phạm Quốc Bình',category:'STAFF',organizationId:'org-khcn',email:'binh@nute.edu.vn',title:'Chuyên viên',userId:'u-l3'},
      {id:'p-004',code:'SV001',fullName:'Lê Hoàng Nam',category:'STUDENT',organizationId:'org-cntt',email:'nam@student.nute.edu.vn',title:'Sinh viên',userId:null}
    ];
    const types=[
      {id:'rt-topic',code:'DE_TAI',name:'Đề tài nghiên cứu khoa học',description:'Đề tài các cấp'},
      {id:'rt-paper',code:'PUBLICATION',name:'Công bố khoa học',description:'Bài báo, hội nghị, sách/chương sách'},
      {id:'rt-ip',code:'IP',name:'Sở hữu trí tuệ',description:'Sáng chế, giải pháp hữu ích, bản quyền'},
      {id:'rt-innovation',code:'INNOVATION',name:'Sáng kiến / cải tiến',description:'Sáng kiến và cải tiến kỹ thuật'}
    ];
    const transitions=[
      {from:'DRAFT',to:'SUBMITTED',permission:'research.submit',actionType:'SUBMIT',requiredEvidence:['REGISTRATION']},
      {from:'SUBMITTED',to:'LEVEL2_APPROVED',permission:'research.approve.level2',actionType:'APPROVE_LEVEL_2',decisionGate:true,aiAssist:true},
      {from:'SUBMITTED',to:'REVISION_REQUIRED',permission:'research.approve.level2',actionType:'RETURN_LEVEL_2',decisionGate:true,aiAssist:true},
      {from:'REVISION_REQUIRED',to:'SUBMITTED',permission:'research.submit',actionType:'RESUBMIT',requiredEvidence:['REGISTRATION']},
      {from:'LEVEL2_APPROVED',to:'LEVEL3_APPROVED',permission:'research.approve.level3',actionType:'APPROVE_LEVEL_3',decisionGate:true,aiAssist:true},
      {from:'LEVEL2_APPROVED',to:'REVISION_REQUIRED',permission:'research.approve.level3',actionType:'RETURN_LEVEL_3',decisionGate:true,aiAssist:true},
      {from:'LEVEL3_APPROVED',to:'APPROVED',permission:'research.approve.level4',actionType:'APPROVE_LEVEL_4',decisionGate:true,aiAssist:true},
      {from:'LEVEL3_APPROVED',to:'REVISION_REQUIRED',permission:'research.approve.level4',actionType:'RETURN_LEVEL_4',decisionGate:true,aiAssist:true},
      {from:'APPROVED',to:'IN_PROGRESS',permission:'research.submit',actionType:'START'},
      {from:'IN_PROGRESS',to:'RESULT_SUBMITTED',permission:'research.submit',actionType:'SUBMIT_RESULT',requiredEvidence:['RESULT']},
      {from:'RESULT_SUBMITTED',to:'COUNCIL_REVIEW',permission:'research.approve.level2',actionType:'SEND_COUNCIL',decisionGate:true,aiAssist:true},
      {from:'COUNCIL_REVIEW',to:'COMPLETED',permission:'council.manage',actionType:'APPROVE_COUNCIL',decisionGate:true,aiAssist:true},
      {from:'COUNCIL_REVIEW',to:'IN_PROGRESS',permission:'council.manage',actionType:'RETURN',decisionGate:true,aiAssist:true},
      {from:'COMPLETED',to:'RECOGNIZED',permission:'research.approve.level4',actionType:'RECOGNIZE',decisionGate:true,aiAssist:true}
    ];
    const workflows=types.map((t,i)=>({id:`wf-${i+1}`,researchTypeId:t.id,name:`Quy trình ${t.name}`,initialStatus:'DRAFT',transitions:clone(transitions),sourceDocuments:i===0?[{id:'wfdoc-1',originalName:'Quy_dinh_quan_ly_de_tai.pdf',fileUrl:'#',extractionStatus:'EXTRACTED',hasExtractedText:true}]:[]}));
    const research=[
      {id:'r-001',typeId:'rt-topic',organizationId:'org-cntt',ownerId:'u-researcher',title:'Ứng dụng AI hỗ trợ quản trị hoạt động nghiên cứu',summary:'Nghiên cứu mô hình AI-native hỗ trợ người nghiên cứu và các cấp quản trị trong toàn bộ vòng đời nghiên cứu.',status:'SUBMITTED',createdAt:'2026-09-15T02:00:00Z',updatedAt:'2026-09-20T08:20:00Z',documents:[{id:'doc-1',title:'Thuyết minh đề tài',originalName:'thuyet-minh.pdf',purpose:'REGISTRATION',extractionStatus:'EXTRACTED',extractedPreview:'Mục tiêu, phương pháp, sản phẩm dự kiến và kế hoạch thực hiện...',createdAt:'2026-09-15T02:30:00Z',fileUrl:'#'}],evidence:[{id:'ev-1',code:'REGISTRATION',title:'Phiếu đăng ký',status:'VERIFIED',createdAt:'2026-09-15T03:00:00Z',fileUrl:'#'}],councils:[],recognitions:[],workflowDecisions:[],milestones:[{id:'ms-1',title:'Hoàn thiện tổng quan tài liệu',dueDate:'2026-10-15',status:'TODO',note:''}],sources:[{id:'src-1',title:'AI-enabled research management: internal reference',authors:'Nhóm nghiên cứu Demo',year:'2026',doi:'',url:'',notes:'Nguồn demo do người dùng đăng ký.',verified:true}],notes:[{id:'note-1',title:'Quyết định phương pháp',content:'Ưu tiên mô hình capability-first và Human + AI governance.',createdAt:'2026-09-18T04:00:00Z'}],analyses:[]},
      {id:'r-002',typeId:'rt-paper',organizationId:'org-cntt',ownerId:'u-researcher',title:'Khung SBBS cho hệ thống quản trị tri thức đại học',summary:'Mô tả kiến trúc Smart Black Box System và khả năng tái sử dụng trí tuệ.',status:'IN_PROGRESS',createdAt:'2026-08-10T02:00:00Z',updatedAt:'2026-09-19T09:10:00Z',documents:[],evidence:[{id:'ev-2',code:'REGISTRATION',title:'Đăng ký công bố',status:'SUBMITTED',createdAt:'2026-08-10T03:00:00Z',url:'https://example.org'}],councils:[],recognitions:[],workflowDecisions:[{id:'hd-1',kind:'HUMAN_DECISION',from:'APPROVED',to:'IN_PROGRESS',rationale:'Đủ điều kiện triển khai.',createdAt:'2026-08-20T03:00:00Z'}],milestones:[],sources:[],notes:[],analyses:[]},
      {id:'r-003',typeId:'rt-ip',organizationId:'org-ck',ownerId:'u-admin',title:'Giải pháp nhận dạng lỗi thiết bị bằng thị giác máy tính',summary:'Hồ sơ sở hữu trí tuệ minh họa cho kiểm thử RIS.',status:'COMPLETED',createdAt:'2026-07-01T02:00:00Z',updatedAt:'2026-09-18T07:00:00Z',documents:[],evidence:[{id:'ev-3',code:'RESULT',title:'Báo cáo kết quả',status:'VERIFIED',createdAt:'2026-09-01T03:00:00Z',fileUrl:'#'}],councils:[{id:'c-1',meetingDate:'2026-09-10',result:'Đạt',score:88.5,minutes:'Hội đồng đề nghị công nhận.'}],recognitions:[],workflowDecisions:[],milestones:[],sources:[],notes:[],analyses:[]}
    ];
    const knowledge=[
      {id:'k-1',kind:'regulation',scope:'all',title:'Quy định quản lý hoạt động nghiên cứu khoa học',content:'Quy định demo dùng để kiểm thử khả năng đọc quy chế và gắn với workflow.',contentPreview:'Quy định về đăng ký, phê duyệt, thực hiện, hội đồng và công nhận...',sourceDocuments:[{id:'kdoc-1',originalName:'quy-dinh-khcn.pdf',fileUrl:'#',extractionStatus:'EXTRACTED',hasExtractedText:true}],aiAnalysis:null}
    ];
    const providers=[
      {id:'ai-1',name:'OpenAI Demo',kind:'openai',model:'gpt-demo',enabled:true,primary:true,priority:10,routes:['*'],hasApiKey:true,capabilities:{chat:true,streaming:true,temperature:true,vision:true,jsonMode:true,reasoning:true,toolCalling:true,embeddings:false},generation:{useTemperature:false,temperature:0.2,useMaxTokens:true,maxTokens:1800}},
      {id:'ai-2',name:'Gemini Demo',kind:'gemini',model:'gemini-demo',enabled:true,primary:false,priority:20,routes:['academic','general'],hasApiKey:true,capabilities:{chat:true,streaming:true,temperature:true,vision:true,jsonMode:true,reasoning:false,toolCalling:true,embeddings:false},generation:{useTemperature:true,temperature:0.2,useMaxTokens:false,maxTokens:1800}}
    ];
    const researcherProfiles={
      'u-admin':{userId:'u-admin',organizationId:'org-nute',orcid:'',expertise:['Quản trị nghiên cứu','Hệ thống thông tin'],keywords:['RIS','AI-native','SBBS'],bio:'Hồ sơ demo quản trị.'},
      'u-researcher':{userId:'u-researcher',organizationId:'org-cntt',orcid:'0000-0002-1234-5678',expertise:['Trí tuệ nhân tạo','Khoa học dữ liệu'],keywords:['AI','Research Intelligence'],bio:'Nghiên cứu ứng dụng AI trong giáo dục và quản trị nghiên cứu.'}
    };
    const scientificProfiles={};
    const aiCenter={autopilot:false,workItems:[{id:'wi-1',status:'PENDING',decisionPoint:'APPROVAL_LEVEL_2',label:'Phân tích hồ sơ trước duyệt cấp 2',researchId:'r-001',createdAt:'2026-09-20T08:00:00Z'}],recommendations:[{id:'rec-1',decisionPoint:'EVIDENCE_REVIEW',researchId:'r-002',createdAt:'2026-09-19T09:00:00Z',structured:{summary:'Minh chứng đăng ký đã có nhưng cần xác minh nguồn liên kết trước khi chuyển bước.'}}],decisions:[]};
    const audit=[{id:'a-1',at:'2026-09-20T08:20:00Z',actorId:'u-admin',action:'DEMO_READY',entityType:'SYSTEM',entityId:'V5.5.1',details:{mode:'GitHub Pages full test + AI Form Studio + pluggable digital signature capability/adapters'}}];
    const formTemplates=[{id:'form-tpl-001',code:'RESEARCH_REGISTRATION',name:'Phiếu đăng ký đề tài NCKH',version:'1.0.0',status:'PUBLISHED',knowledgeIds:['k-1'],legalBasis:[{knowledgeId:'k-1',title:'Quy định quản lý hoạt động nghiên cứu khoa học',citation:'Quy định demo - phần đăng ký'}],fields:[{id:'f-title',code:'TITLE',label:'Tên đề tài',type:'text',required:true,citation:'Quy định demo - đăng ký'},{id:'f-owner',code:'OWNER',label:'Chủ nhiệm đề tài',type:'text',required:true,citation:'Quy định demo - đăng ký'},{id:'f-org',code:'ORGANIZATION',label:'Đơn vị chủ trì',type:'text',required:true,citation:'Quy định demo - đăng ký'},{id:'f-objectives',code:'OBJECTIVES',label:'Mục tiêu nghiên cứu',type:'textarea',required:true,citation:'Quy định demo - thuyết minh'},{id:'f-method',code:'METHOD',label:'Phương pháp nghiên cứu',type:'textarea',required:true,citation:'Quy định demo - thuyết minh'},{id:'f-products',code:'PRODUCTS',label:'Sản phẩm dự kiến',type:'textarea',required:true,citation:'Quy định demo - kết quả'}],signaturePolicy:{required:true,minimumSignatures:3,requiredApprovalLevels:[2,3,4],allowedRoles:['APPROVER_LEVEL_2','APPROVER_LEVEL_3','APPROVER_LEVEL_4','SYSTEM_ADMIN']},createdAt:now(),updatedAt:now(),generatedByAI:true}];
    const formInstances=[];
    return {version:'5.5.1-pages-full',orgs,roles,users,personnel,types,workflows,research,knowledge,providers,researcherProfiles,scientificProfiles,aiCenter,formTemplates,formInstances,audit};
  }

  function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return x&&x.version?x:initialState()}catch{return initialState()}}
  let db=load();
  db.formTemplates=db.formTemplates||[];
  db.formInstances=db.formInstances||[];
  function save(){localStorage.setItem(KEY,JSON.stringify(db))}
  function currentUser(){const id=sessionStorage.getItem(SESSION);return db.users.find(u=>u.id===id)||null}
  function permissions(user){if(!user)return[];const p=new Set();for(const rc of user.roles||[]){for(const x of (db.roles.find(r=>r.code===rc)?.permissions||[]))p.add(x)}return [...p]}
  function hasPerm(user,p){const ps=permissions(user);return ps.includes('*')||ps.includes(p)}
  function org(id){return db.orgs.find(x=>x.id===id)||null}
  function type(id){return db.types.find(x=>x.id===id)||null}
  function user(id){return db.users.find(x=>x.id===id)||null}
  function researchDecorated(r){return {...clone(r),organization:clone(org(r.organizationId)),type:clone(type(r.typeId)),owner:clone(user(r.ownerId))}}
  function audit(action,entityType,entityId,details={}){const u=currentUser();db.audit.unshift({id:uid('a'),at:now(),actorId:u?.id||'anonymous',action,entityType,entityId,details});db.audit=db.audit.slice(0,300)}
  function body(opts){if(!opts||!opts.body)return{};if(typeof opts.body==='string'){try{return JSON.parse(opts.body)}catch{return{}}}return opts.body||{}}
  function getWorkflowFor(r){return db.workflows.find(w=>w.researchTypeId===r.typeId)||db.workflows[0]}
  function transitionInfo(r,u){const wf=getWorkflowFor(r);return (wf?.transitions||[]).filter(t=>t.from===r.status).map(t=>({...clone(t),allowed:!t.permission||hasPerm(u,t.permission)||(u?.id===r.ownerId&&t.permission==='research.submit'),reason:''}))}
  function normalizeDocs(files=[],purpose='SUPPORTING'){return (files||[]).map((f,i)=>({id:uid('doc'),title:f.name||`Tài liệu ${i+1}`,originalName:f.name||`tai-lieu-${i+1}.pdf`,purpose,extractionStatus:'EXTRACTED',extractedPreview:'Nội dung tài liệu demo đã được ghi nhận để kiểm thử giao diện và luồng AI.',createdAt:now(),fileUrl:'#'}))}
  function researchSummary(){return db.research.map(researchDecorated)}

  function scientificProfileFor(uidx){
    const u=user(uidx); const p=db.personnel.find(x=>x.userId===uidx); const rp=db.researcherProfiles[uidx]||{}; const rs=db.research.filter(r=>r.ownerId===uidx);
    const existing=db.scientificProfiles[uidx]||{};
    return {...existing,user:clone(u),organization:clone(org(u?.organizationId)),orcid:existing.orcid||rp.orcid||'',expertise:existing.expertise||rp.expertise||[],keywords:existing.keywords||rp.keywords||[],bio:existing.bio||rp.bio||'',documents:existing.documents||[],lastSyncedAt:existing.lastSyncedAt||null,systemSnapshot:{identity:{displayName:u?.displayName||'',organizationName:org(u?.organizationId)?.name||'',personnelCode:p?.code||'',positionTitle:p?.title||'',orcid:rp.orcid||'',expertise:rp.expertise||[],keywords:rp.keywords||[]},researchCount:rs.length,recognizedCount:rs.filter(r=>r.status==='RECOGNIZED').length,publicationCount:rs.filter(r=>r.typeId==='rt-paper').length,intellectualPropertyCount:rs.filter(r=>r.typeId==='rt-ip').length,evidenceCount:rs.reduce((n,r)=>n+(r.evidence?.length||0),0),councilCount:rs.reduce((n,r)=>n+(r.councils?.length||0),0),research:rs.map(r=>({title:r.title,type:type(r.typeId)?.name||'',status:r.status,organization:org(r.organizationId)?.name||''}))}};
  }

  async function demoApi(rawUrl,opts={}){
    await new Promise(r=>setTimeout(r,20));
    const u=currentUser();
    const url=new URL(rawUrl,location.origin); const path=url.pathname; const method=(opts.method||'GET').toUpperCase(); const data=body(opts);
    if(path==='/api/bootstrap/status')return {initialized:true,version:'5.5.1-pages-full'};
    if(path==='/api/auth/login'&&method==='POST'){
      const found=db.users.find(x=>x.username===data.username&&x.password===data.password&&x.status==='ACTIVE');
      if(!found)throw new Error('Sai tài khoản hoặc mật khẩu demo.');
      sessionStorage.setItem(SESSION,found.id);audit('LOGIN','USER',found.id);save();return {user:clone(found),csrf:'demo-csrf'};
    }
    if(path==='/api/auth/logout'&&method==='POST'){sessionStorage.removeItem(SESSION);return {ok:true}};
    if(path==='/api/me'){if(!u)throw new Error('Chưa đăng nhập');return {user:clone(u),permissions:permissions(u),csrf:'demo-csrf'}};
    if(!u)throw new Error('Phiên demo chưa đăng nhập.');

    if(path==='/api/dashboard'){
      const list=researchSummary(); const flows=list.map(r=>({id:r.id,title:r.title,type:r.type?.name,organization:r.organization?.name,status:r.status,next:transitionInfo(db.research.find(x=>x.id===r.id),u),decisions:(r.workflowDecisions||[]).slice().reverse()}));
      return {counts:{total:list.length,active:list.filter(r=>!['RECOGNIZED','REJECTED'].includes(r.status)).length,needsAction:list.filter(r=>['SUBMITTED','LEVEL2_APPROVED','LEVEL3_APPROVED','RESULT_SUBMITTED','COUNCIL_REVIEW','REVISION_REQUIRED'].includes(r.status)).length,recognized:list.filter(r=>r.status==='RECOGNIZED').length},flows,recent:list.slice().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,8)};
    }
    if(path==='/api/research'&&method==='GET')return researchSummary();
    if(path==='/api/research'&&method==='POST'){
      const r={id:uid('r'),typeId:data.typeId,organizationId:data.organizationId,ownerId:u.id,title:data.title,summary:data.summary||'',status:'DRAFT',createdAt:now(),updatedAt:now(),documents:normalizeDocs(data.registrationFiles||[],'REGISTRATION'),evidence:[],councils:[],recognitions:[],workflowDecisions:[],milestones:[],sources:[],notes:[],analyses:[]};
      if((data.registrationFiles||[]).length)r.evidence.push({id:uid('ev'),code:'REGISTRATION',title:'Hồ sơ đăng ký',status:'SUBMITTED',createdAt:now(),fileUrl:'#'});
      db.research.unshift(r);audit('RESEARCH_CREATE','RESEARCH',r.id,{title:r.title});save();return researchDecorated(r);
    }
    let m=path.match(/^\/api\/research\/([^/]+)$/);
    if(m&&method==='GET'){
      const r=db.research.find(x=>x.id===m[1]);if(!r)throw new Error('Không tìm thấy hồ sơ.');return {...researchDecorated(r),availableTransitions:transitionInfo(r,u)};
    }
    m=path.match(/^\/api\/research\/([^/]+)\/transition-advice$/);
    if(m&&method==='POST')return {id:uid('advice'),result:`AI demo đã rà soát hồ sơ cho bước ${data.to}.\n\nGợi ý kiểm tra: tính đầy đủ minh chứng, sự nhất quán giữa mục tiêu-phương pháp-sản phẩm và căn cứ quy định.\n\nQuyết định cuối cùng thuộc người có thẩm quyền.`,providerName:'OpenAI Demo',model:'gpt-demo'};
    m=path.match(/^\/api\/research\/([^/]+)\/transition$/);
    if(m&&method==='POST'){
      const r=db.research.find(x=>x.id===m[1]);if(!r)throw new Error('Không tìm thấy hồ sơ.'); const from=r.status; const t=transitionInfo(r,u).find(x=>x.to===data.to);if(!t||!t.allowed)throw new Error('Tài khoản demo không có quyền thực hiện bước này.');
      r.status=data.to;r.updatedAt=now();r.workflowDecisions.unshift({id:uid('hd'),kind:'HUMAN_DECISION',from,to:data.to,rationale:data.rationale||'',adviceId:data.adviceId||'',createdAt:now(),actorId:u.id});audit('WORKFLOW_TRANSITION','RESEARCH',r.id,{from,to:data.to});save();return researchDecorated(r);
    }
    m=path.match(/^\/api\/research\/([^/]+)\/documents$/);
    if(m&&method==='POST'){const r=db.research.find(x=>x.id===m[1]);const docs=normalizeDocs(data.files||[],data.purpose||'SUPPORTING');if(data.title&&docs.length===1)docs[0].title=data.title;r.documents.push(...docs);r.updatedAt=now();audit('DOCUMENT_UPLOAD','RESEARCH',r.id,{count:docs.length});save();return docs}
    m=path.match(/^\/api\/research\/([^/]+)\/evidence$/);
    if(m&&method==='POST'){const r=db.research.find(x=>x.id===m[1]);const files=data.files||[];if(files.length){for(const f of files)r.evidence.push({id:uid('ev'),code:data.code||'GENERAL',title:data.title||f.name||'Minh chứng',status:'SUBMITTED',createdAt:now(),fileUrl:'#'})}else r.evidence.push({id:uid('ev'),code:data.code||'GENERAL',title:data.title||'Minh chứng liên kết',status:'SUBMITTED',createdAt:now(),url:data.url});r.updatedAt=now();audit('EVIDENCE_ADD','RESEARCH',r.id);save();return {ok:true}}
    m=path.match(/^\/api\/research\/([^/]+)\/council$/);
    if(m&&method==='POST'){const r=db.research.find(x=>x.id===m[1]);r.councils.unshift({id:uid('c'),meetingDate:data.meetingDate,result:data.result,score:data.score?Number(data.score):null,minutes:data.minutes||''});r.updatedAt=now();audit('COUNCIL_RESULT','RESEARCH',r.id);save();return {ok:true}}
    m=path.match(/^\/api\/research\/([^/]+)\/recognize$/);
    if(m&&method==='POST'){const r=db.research.find(x=>x.id===m[1]);r.recognitions.unshift({id:uid('recog'),decisionNo:data.decisionNo,decisionDate:data.decisionDate,note:data.note||''});r.status='RECOGNIZED';r.updatedAt=now();audit('RECOGNIZE','RESEARCH',r.id);save();return {ok:true}}
    m=path.match(/^\/api\/research-documents\/([^/]+)$/);
    if(m&&method==='DELETE'){for(const r of db.research)r.documents=(r.documents||[]).filter(d=>d.id!==m[1]);audit('DOCUMENT_DELETE','DOCUMENT',m[1]);save();return {ok:true}}
    m=path.match(/^\/api\/evidence\/([^/]+)\/verify$/);
    if(m&&method==='POST'){for(const r of db.research){const e=(r.evidence||[]).find(x=>x.id===m[1]);if(e){e.status=data.approved?'VERIFIED':'REJECTED';e.verificationNote=data.note||'';audit('EVIDENCE_VERIFY','EVIDENCE',e.id,{approved:data.approved});save();return e}}throw new Error('Không tìm thấy minh chứng.')}
    m=path.match(/^\/api\/evidence\/([^/]+)$/);
    if(m&&method==='DELETE'){for(const r of db.research)r.evidence=(r.evidence||[]).filter(e=>e.id!==m[1]);audit('EVIDENCE_DELETE','EVIDENCE',m[1]);save();return {ok:true}}

    if(path==='/api/research-types'&&method==='GET')return clone(db.types);
    if(path==='/api/research-types'&&method==='POST'){const x={id:uid('rt'),code:data.code,name:data.name,description:data.description||''};db.types.push(x);db.workflows.push({id:uid('wf'),researchTypeId:x.id,name:'Quy trình xét duyệt',initialStatus:'DRAFT',transitions:[],sourceDocuments:[]});audit('RESEARCH_TYPE_CREATE','RESEARCH_TYPE',x.id);save();return x}
    if(path==='/api/organizations'&&method==='GET')return clone(db.orgs);
    if(path==='/api/organizations'&&method==='POST'){let x=data.id&&db.orgs.find(o=>o.id===data.id);if(x)Object.assign(x,{code:data.code,name:data.name,type:data.type,parentId:data.parentId||'',active:data.active!==false});else{x={id:uid('org'),code:data.code,name:data.name,type:data.type||'UNIT',parentId:data.parentId||'',active:data.active!==false};db.orgs.push(x)}audit('ORGANIZATION_SAVE','ORGANIZATION',x.id);save();return clone(x)}
    if(path==='/api/roles'&&method==='GET')return clone(db.roles);
    if(path==='/api/roles'&&method==='POST'){const x={code:data.code,name:data.name,permissions:data.permissions||[]};db.roles.push(x);audit('ROLE_CREATE','ROLE',x.code);save();return x}
    if(path==='/api/users'&&method==='GET')return db.users.map(x=>{const y=clone(x);delete y.password;return y});
    if(path==='/api/users'&&method==='POST'){const x={id:uid('u'),username:data.username,password:data.password,displayName:data.displayName,organizationId:data.organizationId,roles:data.roles||[],status:'ACTIVE'};db.users.push(x);audit('USER_CREATE','USER',x.id);save();const y=clone(x);delete y.password;return y}

    if(path==='/api/personnel'&&method==='GET')return db.personnel.map(p=>({...clone(p),organization:clone(org(p.organizationId)),user:p.userId?(()=>{const x=clone(user(p.userId));if(x)delete x.password;return x})():null}));
    if(path==='/api/personnel'&&method==='POST'){const x={id:uid('p'),code:data.code||'',fullName:data.fullName,category:data.category,organizationId:data.organizationId,email:data.email||'',title:data.title||'',userId:null};db.personnel.push(x);audit('PERSONNEL_CREATE','PERSONNEL',x.id);save();return x}
    m=path.match(/^\/api\/personnel\/([^/]+)\/account$/);
    if(m&&method==='POST'){const p=db.personnel.find(x=>x.id===m[1]);if(!p)throw new Error('Không tìm thấy nhân sự.');const x={id:uid('u'),username:data.username,password:data.password,displayName:p.fullName,organizationId:p.organizationId,roles:data.roles||[],status:'ACTIVE'};db.users.push(x);p.userId=x.id;audit('ACCOUNT_PROVISION','PERSONNEL',p.id,{userId:x.id});save();return {ok:true}}

    if(path==='/api/workflows'&&method==='GET')return clone(db.workflows);
    if(path==='/api/workflows'&&method==='POST'){let x=db.workflows.find(w=>w.researchTypeId===data.researchTypeId);const newDocs=normalizeDocs(data.sourceFiles||[],'WORKFLOW').map(d=>({id:d.id,originalName:d.originalName,fileUrl:'#',extractionStatus:'EXTRACTED',hasExtractedText:true}));if(x){x.name=data.name||x.name;x.initialStatus=data.initialStatus||'DRAFT';x.transitions=data.transitions||[];x.sourceDocuments=[...(x.sourceDocuments||[]),...newDocs]}else{x={id:uid('wf'),researchTypeId:data.researchTypeId,name:data.name||'Quy trình',initialStatus:data.initialStatus||'DRAFT',transitions:data.transitions||[],sourceDocuments:newDocs};db.workflows.push(x)}audit('WORKFLOW_SAVE','WORKFLOW',x.id);save();return x}
    m=path.match(/^\/api\/workflows\/([^/]+)\/analyze$/);
    if(m&&method==='POST')return {result:'AI demo: Quy trình đã được đọc. Các bước phê duyệt 4 cấp, nhánh trả lại/chỉnh sửa và các điểm Human + AI được nhận diện. Cần kiểm tra tính nhất quán giữa quyền, minh chứng bắt buộc và thẩm quyền công nhận.'};
    m=path.match(/^\/api\/workflows\/([^/]+)\/source-documents\/([^/]+)$/);
    if(m&&method==='DELETE'){const w=db.workflows.find(x=>x.id===m[1]);if(w)w.sourceDocuments=(w.sourceDocuments||[]).filter(d=>d.id!==m[2]&&d.storedName!==m[2]);save();return {ok:true}}

    if(path==='/api/knowledge'&&method==='GET')return clone(db.knowledge);
    if(path==='/api/knowledge'&&method==='POST'){let x=data.id&&db.knowledge.find(k=>k.id===data.id);const docs=normalizeDocs(data.files||[],'KNOWLEDGE').map(d=>({id:d.id,originalName:d.originalName,fileUrl:'#',extractionStatus:'EXTRACTED',hasExtractedText:true}));if(x){Object.assign(x,{title:data.title,kind:data.kind,scope:data.scope,content:data.content||x.content});x.sourceDocuments=[...(x.sourceDocuments||[]),...docs]}else{x={id:uid('k'),title:data.title,kind:data.kind,scope:data.scope||'all',content:data.content||'',contentPreview:String(data.content||'').slice(0,180),sourceDocuments:docs,aiAnalysis:null};db.knowledge.push(x)}audit('KNOWLEDGE_SAVE','KNOWLEDGE',x.id);save();return x}
    m=path.match(/^\/api\/knowledge\/([^/]+)\/analyze$/);
    if(m&&method==='POST'){const x=db.knowledge.find(k=>k.id===m[1]);if(x)x.aiAnalysis={at:now()};save();return {result:'AI demo: Tài liệu tri thức đã được phân tích. Các nhóm quy tắc chính gồm điều kiện đăng ký, thẩm quyền phê duyệt, yêu cầu minh chứng, hội đồng và công nhận kết quả.'}}
    m=path.match(/^\/api\/knowledge\/([^/]+)\/source-documents\/([^/]+)$/);
    if(m&&method==='DELETE'){const x=db.knowledge.find(k=>k.id===m[1]);if(x)x.sourceDocuments=(x.sourceDocuments||[]).filter(d=>d.id!==m[2]&&d.storedName!==m[2]);save();return {ok:true}}

    if(path==='/api/ai/providers'&&method==='GET')return clone(db.providers);
    if(path==='/api/ai/providers'&&method==='POST'){let x=data.id&&db.providers.find(p=>p.id===data.id);if(x){Object.assign(x,data);x.hasApiKey=x.hasApiKey||!!data.apiKey;delete x.apiKey}else{x={...data,id:uid('ai'),hasApiKey:!!data.apiKey};delete x.apiKey;db.providers.push(x)}if(x.primary){for(const p of db.providers)if(p.id!==x.id)p.primary=false}audit('AI_PROVIDER_SAVE','AI_PROVIDER',x.id);save();return clone(x)}
    if(path==='/api/ai/providers/models'&&method==='POST')return {count:4,models:[{id:'gpt-5.6-demo',name:'GPT 5.6 Demo'},{id:'gpt-5-mini-demo',name:'GPT 5 Mini Demo'},{id:'gemini-2.5-demo',name:'Gemini 2.5 Demo'},{id:'claude-demo',name:'Claude Demo'}]};
    if(path==='/api/ai/providers/probe'&&method==='POST')return {reachable:true,capabilities:{chat:true,temperature:true,vision:true,jsonMode:true,reasoning:true,toolCalling:true},probes:{base:{ok:true}}};
    if(path==='/api/ai/providers/test'&&method==='POST')return {model:data.model||db.providers.find(p=>p.id===data.id)?.model||'demo-model',response:'Kết nối mô phỏng thành công trên GitHub Pages.'};
    if(path==='/api/ai/assist'&&method==='POST')return {result:`KẾT QUẢ AI DEMO\n\nNhiệm vụ: ${data.task||'Phân tích nghiên cứu'}\n\n1. Hồ sơ/nội dung đã được tiếp nhận trong môi trường test.\n2. Cần kiểm tra sự nhất quán giữa mục tiêu, phương pháp, sản phẩm và minh chứng.\n3. Các điểm rủi ro cần được người dùng xác minh trên tài liệu gốc.\n4. AI chỉ hỗ trợ phân tích; quyết định nghiệp vụ/khoa học cuối cùng thuộc con người.`,provider:{name:'OpenAI Demo',model:'gpt-demo'}};

    if(path==='/api/ai/autopilot'&&method==='GET')return {enabled:!!db.aiCenter.autopilot};
    if(path==='/api/ai/autopilot'&&method==='POST'){db.aiCenter.autopilot=!!data.enabled;save();return {enabled:db.aiCenter.autopilot}}
    if(path==='/api/ai/decision-center'){
      const workItems=db.aiCenter.workItems.map(w=>({...clone(w),research:researchDecorated(db.research.find(r=>r.id===w.researchId)||{})}));
      return {counts:{pending:workItems.filter(w=>w.status==='PENDING').length,analyzed:db.aiCenter.recommendations.length,awaitingHuman:db.aiCenter.recommendations.filter(r=>!db.aiCenter.decisions.some(d=>d.recommendationId===r.id)).length},workItems,recommendations:clone(db.aiCenter.recommendations),decisions:clone(db.aiCenter.decisions)};
    }
    m=path.match(/^\/api\/ai\/work-items\/([^/]+)\/process$/);
    if(m&&method==='POST'){const w=db.aiCenter.workItems.find(x=>x.id===m[1]);if(!w)throw new Error('Không tìm thấy work item.');w.status='ANALYZED';db.aiCenter.recommendations.unshift({id:uid('rec'),decisionPoint:w.decisionPoint,researchId:w.researchId,createdAt:now(),structured:{summary:'AI demo đã phân tích điểm quyết định: hồ sơ có cấu trúc phù hợp để người có thẩm quyền xem xét; cần xác minh minh chứng và căn cứ quy định trước khi quyết định.'}});audit('AI_WORK_ITEM_PROCESS','AI_WORK_ITEM',w.id);save();return {ok:true}}
    m=path.match(/^\/api\/ai\/recommendations\/([^/]+)\/decision$/);
    if(m&&method==='POST'){db.aiCenter.decisions.unshift({id:uid('aid'),recommendationId:m[1],outcome:data.outcome,rationale:data.rationale,createdAt:now(),actorId:u.id});audit('HUMAN_AI_DECISION','AI_RECOMMENDATION',m[1],{outcome:data.outcome});save();return {ok:true}}
    if(path==='/api/ai/portfolio/analyze'&&method==='POST')return {result:'AI demo: Danh mục hiện có nhiều hồ sơ ở giai đoạn phê duyệt và triển khai. Nên ưu tiên xử lý hồ sơ đang chờ duyệt, chuẩn hóa minh chứng và theo dõi các mốc quá hạn. Đây là phân tích hỗ trợ, không phải quyết định quản trị.'};

    if(path==='/api/intelligence/portfolio'){
      const byStatus={};for(const r of db.research)byStatus[r.status]=(byStatus[r.status]||0)+1;
      return {total:db.research.length,stale:db.research.filter(r=>Date.now()-new Date(r.updatedAt).getTime()>45*864e5),possibleDuplicates:[{a:db.research[0]?.title||'',b:db.research[1]?.title||'',score:.71}],pendingAI:db.aiCenter.workItems.filter(w=>w.status==='PENDING').length,byStatus};
    }
    if(path==='/api/intelligence/search'){
      const q=(url.searchParams.get('q')||'').toLowerCase();return db.research.map(r=>({research:researchDecorated(r),score:(r.title+' '+r.summary).toLowerCase().includes(q)?.94:.54})).filter(x=>x.score>.5).sort((a,b)=>b.score-a.score);
    }
    m=path.match(/^\/api\/intelligence\/research\/([^/]+)\/similar$/);
    if(m)return db.research.filter(r=>r.id!==m[1]).slice(0,3).map((r,i)=>({research:researchDecorated(r),score:.82-i*.09}));
    m=path.match(/^\/api\/intelligence\/research\/([^/]+)\/reviewers$/);
    if(m)return [{profile:{userId:'u-review-1',displayName:'TS. Trần Thu Hà',expertise:['Trí tuệ nhân tạo','Khoa học dữ liệu']},score:.89},{profile:{userId:'u-review-2',displayName:'PGS. Nguyễn Văn B',expertise:['Quản trị khoa học','Hệ thống thông tin']},score:.76}];
    m=path.match(/^\/api\/intelligence\/research\/([^/]+)\/policies$/);
    if(m)return db.knowledge.map((k,i)=>({title:k.title,relevance:.91-i*.08}));

    if(path==='/api/researcher-profiles/me'&&method==='GET')return clone(db.researcherProfiles[u.id]||{userId:u.id,organizationId:u.organizationId,orcid:'',expertise:[],keywords:[],bio:''});
    if(path==='/api/researcher-profiles/me'&&method==='POST'){db.researcherProfiles[u.id]={...(db.researcherProfiles[u.id]||{}),...data,userId:u.id,organizationId:u.organizationId};audit('RESEARCHER_PROFILE_SAVE','USER',u.id);save();return clone(db.researcherProfiles[u.id])}

    if(path==='/api/scientific-profile/me'&&method==='GET')return clone(scientificProfileFor(u.id));
    if(path==='/api/scientific-profile/me'&&method==='POST'){db.scientificProfiles[u.id]={...(db.scientificProfiles[u.id]||{}),...data,documents:(db.scientificProfiles[u.id]?.documents||[])};audit('SCIENTIFIC_PROFILE_SAVE','USER',u.id);save();return clone(scientificProfileFor(u.id))}
    if(path==='/api/scientific-profile/me/sync'&&method==='POST'){db.scientificProfiles[u.id]={...(db.scientificProfiles[u.id]||{}),lastSyncedAt:now(),documents:(db.scientificProfiles[u.id]?.documents||[])};audit('SCIENTIFIC_PROFILE_SYNC','USER',u.id);save();return clone(scientificProfileFor(u.id))}
    if(path==='/api/scientific-profile/me/documents'&&method==='POST'){const sp=db.scientificProfiles[u.id]||(db.scientificProfiles[u.id]={documents:[]});sp.documents=sp.documents||[];for(const f of (data.files||[]))sp.documents.push({id:uid('sdoc'),category:data.category,originalName:f.name,fileUrl:'#',extractionStatus:'EXTRACTED',hasExtractedText:true,analysisReady:true});save();return {ok:true}}
    m=path.match(/^\/api\/scientific-profile\/me\/documents\/([^/]+)$/);
    if(m&&method==='DELETE'){const sp=db.scientificProfiles[u.id];if(sp)sp.documents=(sp.documents||[]).filter(d=>d.id!==m[1]);save();return {ok:true}}

    m=path.match(/^\/api\/research\/([^/]+)\/workspace$/);
    if(m){const r=db.research.find(x=>x.id===m[1]);if(!r)throw new Error('Không tìm thấy hồ sơ.');const next=transitionInfo(r,u).map(t=>({to:t.to,ready:true,missingEvidence:[]}));return {research:researchDecorated(r),type:clone(type(r.typeId)),organization:clone(org(r.organizationId)),process:{currentStatus:r.status,nextSteps:next,suggestedActions:next.length?next.map(n=>`Chuẩn bị điều kiện để chuyển sang ${n.to}`):['Tiếp tục cập nhật minh chứng, mốc công việc và nhật ký nghiên cứu.']},milestones:clone(r.milestones||[]),sources:clone(r.sources||[]),notes:clone(r.notes||[]),analyses:clone(r.analyses||[]),academicCapabilities:[{code:'methodology',label:'Methodology Intelligence',purpose:'Phản biện thiết kế nghiên cứu và logic phương pháp.',guardrails:['Không thay quyết định khoa học','Nêu giả định và giới hạn']},{code:'literature',label:'Literature Intelligence',purpose:'Hỗ trợ tổng quan tài liệu dựa trên nguồn đã đăng ký.',guardrails:['Không bịa nguồn','Phân biệt nguồn đã xác minh']},{code:'writing',label:'Academic Writing',purpose:'Hỗ trợ cấu trúc và diễn đạt học thuật.',guardrails:['Giữ nguyên ý nghĩa khoa học']},{code:'integrity',label:'Research Integrity',purpose:'Phát hiện rủi ro minh bạch và liêm chính.',guardrails:['Không kết luận vi phạm khi thiếu bằng chứng']}]};}
    m=path.match(/^\/api\/research\/([^/]+)\/academic\/analyze$/);
    if(m&&method==='POST'){const r=db.research.find(x=>x.id===m[1]);const a={id:uid('ana'),capability:data.capability,createdAt:now()};r.analyses.unshift(a);save();return {result:`AI Research Partner demo (${data.capability}):\n\n- Đã đặt câu hỏi trong ngữ cảnh hồ sơ ${r.title}.\n- Cần làm rõ giả định, tiêu chí đánh giá và mối liên hệ giữa dữ liệu - phương pháp - kết luận.\n- Các nguồn học thuật chỉ được coi là xác minh khi người dùng đã đăng ký/xác nhận.\n- Người nghiên cứu chịu trách nhiệm quyết định khoa học cuối cùng.`}}
    m=path.match(/^\/api\/research\/([^/]+)\/sources$/);
    if(m&&method==='POST'){const r=db.research.find(x=>x.id===m[1]);r.sources.unshift({id:uid('src'),...data});save();return {ok:true}}
    m=path.match(/^\/api\/research\/([^/]+)\/notes$/);
    if(m&&method==='POST'){const r=db.research.find(x=>x.id===m[1]);r.notes.unshift({id:uid('note'),...data,createdAt:now()});save();return {ok:true}}
    m=path.match(/^\/api\/research\/([^/]+)\/milestones$/);
    if(m&&method==='POST'){const r=db.research.find(x=>x.id===m[1]);r.milestones.push({id:uid('ms'),title:data.title,dueDate:data.dueDate||'',note:data.note||'',status:'TODO'});save();return {ok:true}}
    m=path.match(/^\/api\/milestones\/([^/]+)\/status$/);
    if(m&&method==='POST'){for(const r of db.research){const x=(r.milestones||[]).find(y=>y.id===m[1]);if(x){x.status=data.status;save();return x}}throw new Error('Không tìm thấy mốc.')}


    if(path==='/api/form-templates'&&method==='GET')return clone(db.formTemplates||[]);
    if(path==='/api/form-templates'&&method==='POST'){
      let x=data.id&&(db.formTemplates||[]).find(t=>t.id===data.id);
      if(x){Object.assign(x,clone(data),{updatedAt:now()});}
      else{x={id:uid('ftpl'),code:String(data.code||'FORM').toUpperCase(),name:String(data.name||'Biểu mẫu'),version:String(data.version||'1.0.0'),status:String(data.status||'DRAFT'),knowledgeIds:data.knowledgeIds||[],legalBasis:data.legalBasis||[],fields:data.fields||[],signaturePolicy:data.signaturePolicy||{required:true,minimumSignatures:3,requiredApprovalLevels:[2,3,4],allowedRoles:['APPROVER_LEVEL_2','APPROVER_LEVEL_3','APPROVER_LEVEL_4','SYSTEM_ADMIN']},generatedByAI:!!data.generatedByAI,createdAt:now(),updatedAt:now()};db.formTemplates.unshift(x)}
      audit('FORM_TEMPLATE_SAVE','FORM_TEMPLATE',x.id,{version:x.version,status:x.status,generatedByAI:!!x.generatedByAI});save();return clone(x);
    }
    if(path==='/api/form-instances'&&method==='GET'){
      const rows=(db.formInstances||[]).filter(x=>hasPerm(u,'research.read.all')||x.createdBy===u.id||hasPerm(u,'research.approve.level2')||hasPerm(u,'research.approve.level3')||hasPerm(u,'research.approve.level4'));
      return clone(rows.map(x=>({...x,template:(db.formTemplates||[]).find(t=>t.id===x.templateId)||null,createdByUser:user(x.createdBy)})));
    }
    if(path==='/api/form-instances'&&method==='POST'){
      let x=data.id&&(db.formInstances||[]).find(i=>i.id===data.id);
      if(x){
        const before=JSON.stringify(x.values||{}), after=JSON.stringify(data.values||x.values||{});
        if(before!==after){x.documentVersion=(x.documentVersion||1)+1;if((x.signatures||[]).length){x.signatures=[];x.status='DRAFT';}}
        x.values=clone(data.values||x.values||{});x.status=String(data.status||x.status||'DRAFT');if(x.status==='SUBMITTED' && !(x.signatures||[]).length)x.status='PENDING_LEVEL_2_SIGNATURE';x.updatedAt=now();
      }else{
        const tpl=(db.formTemplates||[]).find(t=>t.id===data.templateId);if(!tpl)throw new Error('Không tìm thấy biểu mẫu.');
        x={id:uid('finst'),templateId:tpl.id,templateVersion:tpl.version,documentVersion:1,title:String(data.title||tpl.name),values:clone(data.values||{}),status:String(data.status||'DRAFT'),createdBy:u.id,organizationId:u.organizationId||null,signatures:[],createdAt:now(),updatedAt:now()};db.formInstances.unshift(x);
      }
      audit('FORM_INSTANCE_SAVE','FORM_INSTANCE',x.id,{status:x.status,templateId:x.templateId});save();return clone(x);
    }
    m=path.match(/^\/api\/form-instances\/([^/]+)$/);
    if(m&&method==='GET'){const x=(db.formInstances||[]).find(i=>i.id===m[1]);if(!x)throw new Error('Không tìm thấy dữ liệu biểu mẫu.');return clone({...x,template:(db.formTemplates||[]).find(t=>t.id===x.templateId)||null,createdByUser:user(x.createdBy)});}
    m=path.match(/^\/api\/form-instances\/([^/]+)\/signatures$/);
    if(m&&method==='POST'){
      const x=(db.formInstances||[]).find(i=>i.id===m[1]);if(!x)throw new Error('Không tìm thấy dữ liệu biểu mẫu.');
      const roles=data.signerRoles||[];const allowed=roles.some(r=>['APPROVER_LEVEL_2','APPROVER_LEVEL_3','APPROVER_LEVEL_4','SYSTEM_ADMIN'].includes(r));if(!allowed)throw new Error('Vai trò hiện tại không được phép ký số biểu mẫu.');
      x.signatures=x.signatures||[];const required=x.templateId?(db.formTemplates||[]).find(t=>t.id===x.templateId)?.signaturePolicy?.requiredApprovalLevels||[2,3,4]:[2,3,4];const done=x.signatures.map(s=>Number(s.approvalLevel)).filter(Boolean);const next=required.find(l=>!done.includes(l));let level=Number(data.approvalLevel)||0;if(roles.includes('SYSTEM_ADMIN')&&!level)level=next||4;if(!level){if(roles.includes('APPROVER_LEVEL_2'))level=2;else if(roles.includes('APPROVER_LEVEL_3'))level=3;else if(roles.includes('APPROVER_LEVEL_4'))level=4;}if(next&&level!==next)throw new Error(`Biểu mẫu đang chờ chữ ký kiểm duyệt cấp ${next}.`);if(done.includes(level))throw new Error(`Cấp ${level} đã ký biểu mẫu này.`);
      x.signatures.push({...clone(data),approvalLevel:level,id:uid('sig'),signerId:u.id,signerName:u.displayName,signedAt:data.signedAt||now()});const nowDone=x.signatures.map(s=>Number(s.approvalLevel)).filter(Boolean);const remain=required.find(l=>!nowDone.includes(l));x.status=remain?`PENDING_LEVEL_${remain}_SIGNATURE`:'FULLY_SIGNED';x.updatedAt=now();audit('FORM_DIGITAL_SIGN','FORM_INSTANCE',x.id,{signatureCount:x.signatures.length,approvalLevel:level,adapterId:data.adapterId,providerType:data.providerType,verificationStatus:data.verificationStatus});save();return clone(x);
    }

    if(path==='/api/audit')return clone(db.audit);
    throw new Error(`Mock API chưa hỗ trợ: ${method} ${path}`);
  }

  window.demoApi=demoApi;
  window.demoReset=function(){localStorage.removeItem(KEY);sessionStorage.removeItem(SESSION);location.reload()};
  window.demoExportScientificProfile=function(target){
    const u=target==='me'?currentUser():user(target);if(!u){alert('Không tìm thấy hồ sơ.');return}const p=scientificProfileFor(u.id);const w=window.open('','_blank');if(!w)return;
    const rs=p.systemSnapshot?.research||[];
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Lý lịch khoa học - ${u.displayName}</title><style>body{font-family:Arial,sans-serif;max-width:850px;margin:40px auto;line-height:1.5;color:#111}h1,h2{color:#123a78}table{width:100%;border-collapse:collapse}td,th{border:1px solid #bbb;padding:8px;text-align:left}.muted{color:#666}@media print{button{display:none}}</style></head><body><button onclick="print()">In / Lưu PDF</button><h1>LÝ LỊCH KHOA HỌC</h1><p><b>Họ tên:</b> ${u.displayName}</p><p><b>Đơn vị:</b> ${org(u.organizationId)?.name||''}</p><p><b>ORCID:</b> ${p.orcid||''}</p><p><b>Học hàm:</b> ${p.academicTitle||''} &nbsp; <b>Học vị:</b> ${p.degree||''}</p><p><b>Lĩnh vực:</b> ${(p.expertise||[]).join(', ')}</p><h2>Hoạt động nghiên cứu trong RIS</h2><table><tr><th>Tên hoạt động</th><th>Loại</th><th>Trạng thái</th></tr>${rs.map(r=>`<tr><td>${r.title}</td><td>${r.type}</td><td>${r.status}</td></tr>`).join('')}</table><p class="muted">Bản xuất từ môi trường GitHub Pages Test V5.4.2.</p></body></html>`);w.document.close();
  };
})();
