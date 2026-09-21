(function(){
  'use strict';

  const KEY='nute-ris-v60-ai-activity-state';
  const VERSION='6.0.1';
  const now=()=>new Date().toISOString();
  const uid=(p='id')=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const clone=x=>JSON.parse(JSON.stringify(x));

  const DEFAULT_POLICIES=[
    {activity:'RESEARCH_CREATED',label:'Hồ sơ nghiên cứu được tạo',enabled:true,trigger:'AFTER_ACTION',profile:'research_intake',route:'decision',autonomy:'RECOMMEND',blocking:false,minimumConfidence:0.65,requiresHumanDecision:true},
    {activity:'WORKFLOW_TRANSITION',label:'Chuyển trạng thái workflow',enabled:true,trigger:'AFTER_ACTION',profile:'workflow_gate',route:'decision',autonomy:'HUMAN_MANDATORY',blocking:false,minimumConfidence:0.75,requiresHumanDecision:true},
    {activity:'EVIDENCE_SUBMITTED',label:'Minh chứng được gửi',enabled:true,trigger:'AFTER_ACTION',profile:'evidence_assessment',route:'decision',autonomy:'RECOMMEND',blocking:false,minimumConfidence:0.70,requiresHumanDecision:true},
    {activity:'DOCUMENT_UPLOADED',label:'Tài liệu được tải lên',enabled:true,trigger:'AFTER_ACTION',profile:'document_analysis',route:'general',autonomy:'ADVISORY',blocking:false,minimumConfidence:0.60,requiresHumanDecision:false},
    {activity:'EVIDENCE_VERIFIED',label:'Minh chứng được xác minh/từ chối',enabled:true,trigger:'AFTER_ACTION',profile:'evidence_verification',route:'decision',autonomy:'HUMAN_MANDATORY',blocking:false,minimumConfidence:0.75,requiresHumanDecision:true},
    {activity:'COUNCIL_RESULT',label:'Kết quả hội đồng được ghi nhận',enabled:true,trigger:'AFTER_ACTION',profile:'council_synthesis',route:'decision',autonomy:'HUMAN_MANDATORY',blocking:false,minimumConfidence:0.75,requiresHumanDecision:true},
    {activity:'RECOGNITION',label:'Hồ sơ được công nhận',enabled:true,trigger:'AFTER_ACTION',profile:'recognition_gate',route:'decision',autonomy:'HUMAN_MANDATORY',blocking:false,minimumConfidence:0.80,requiresHumanDecision:true}
  ];

  function initial(){return {version:VERSION,policies:clone(DEFAULT_POLICIES),events:[],analyses:[],recommendations:[],decisions:[],audit:[]}}
  function load(){
    try{
      const s=JSON.parse(localStorage.getItem(KEY)||'null');
      if(!s)return initial();
      const map=new Map((s.policies||[]).map(x=>[x.activity,x]));
      s.policies=DEFAULT_POLICIES.map(p=>({...p,...(map.get(p.activity)||{})}));
      s.events=s.events||[];s.analyses=s.analyses||[];s.recommendations=s.recommendations||[];s.decisions=s.decisions||[];s.audit=s.audit||[];s.version=VERSION;
      return s;
    }catch{return initial()}
  }
  function save(s){localStorage.setItem(KEY,JSON.stringify(s));return s}
  function state(){return load()}
  function policy(activity){return load().policies.find(x=>x.activity===activity)||null}
  function updatePolicy(activity,patch={}){const s=load();const p=s.policies.find(x=>x.activity===activity);if(!p)throw new Error('AI Activity Policy không tồn tại.');Object.assign(p,patch);s.audit.unshift({id:uid('aia'),kind:'POLICY_UPDATED',activity,patch:clone(patch),createdAt:now()});save(s);return clone(p)}

  function safeJson(text){
    const raw=String(text||'').trim();
    const candidates=[raw,raw.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim()];
    let start=-1,depth=0,inString=false,escape=false;
    for(let i=0;i<raw.length;i++){
      const ch=raw[i];
      if(inString){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch==='"')inString=false;continue}
      if(ch==='"'){inString=true;continue}
      if(ch==='{'){if(depth===0)start=i;depth++}
      else if(ch==='}'&&depth>0){depth--;if(depth===0&&start>=0){candidates.push(raw.slice(start,i+1));break}}
    }
    for(const x of candidates){try{return JSON.parse(x)}catch{}}
    return null;
  }
  function normalizeList(x){return Array.isArray(x)?x.filter(v=>v!==null&&v!==undefined).slice(0,20):[]}
  function fallbackStructured(evt,provider='RIS Demo AI'){
    const byActivity={
      RESEARCH_CREATED:{status:'NEEDS_REVIEW',riskLevel:'MEDIUM',action:'REVIEW_INTAKE',summary:'AI đã tiếp nhận hồ sơ mới. Cần rà soát tính đầy đủ, loại hình nghiên cứu, sự nhất quán mục tiêu - phương pháp - sản phẩm và minh chứng bắt buộc.'},
      WORKFLOW_TRANSITION:{status:'NEEDS_REVIEW',riskLevel:'MEDIUM',action:'REVIEW_TRANSITION',summary:'AI đã hậu kiểm bước chuyển workflow. Cần xác minh căn cứ, minh chứng và thẩm quyền của bước chuyển.'},
      EVIDENCE_SUBMITTED:{status:'NEEDS_REVIEW',riskLevel:'MEDIUM',action:'VERIFY_EVIDENCE',summary:'AI đã ghi nhận minh chứng mới. Cần kiểm tra tính liên quan, nguồn, phiên bản và khả năng đáp ứng yêu cầu hồ sơ.'},
      DOCUMENT_UPLOADED:{status:'ANALYZED',riskLevel:'LOW',action:'REVIEW_DOCUMENT',summary:'AI đã ghi nhận tài liệu mới và đề nghị đối chiếu nội dung với mục tiêu nghiên cứu, workflow và các yêu cầu minh chứng.'},
      EVIDENCE_VERIFIED:{status:'NEEDS_REVIEW',riskLevel:'MEDIUM',action:'REVIEW_VERIFICATION',summary:'AI đã hậu kiểm quyết định xác minh minh chứng. Kết luận pháp lý/nghiệp vụ vẫn thuộc người có thẩm quyền.'},
      COUNCIL_RESULT:{status:'NEEDS_REVIEW',riskLevel:'MEDIUM',action:'REVIEW_COUNCIL_RESULT',summary:'AI đã tổng hợp sự kiện hội đồng. Cần đối chiếu kết quả, điểm, biên bản và điều kiện chuyển bước tiếp theo.'},
      RECOGNITION:{status:'NEEDS_REVIEW',riskLevel:'HIGH',action:'REVIEW_RECOGNITION',summary:'AI đã hậu kiểm việc công nhận. Cần xác minh đầy đủ hồ sơ, kết quả hội đồng, minh chứng và căn cứ quyết định.'}
    };
    const x=byActivity[evt.activity]||{status:'NEEDS_REVIEW',riskLevel:'MEDIUM',action:'REVIEW',summary:'AI đã ghi nhận sự kiện và đề nghị người có thẩm quyền xem xét.'};
    return {schemaVersion:'1.0',activity:evt.activity,assessment:{status:x.status,confidence:0.60,riskLevel:x.riskLevel},findings:[],recommendation:{action:x.action,reasoningSummary:x.summary,suggestedActions:[]},citations:[],constraints:['Kết quả này được tạo trong chế độ demo/fallback; cần AI thật và nguồn căn cứ để phân tích sâu.'],requiresHumanDecision:true,provider};
  }
  function normalizeStructured(raw,evt,p,provider){
    const x=raw&&typeof raw==='object'?raw:{};
    const assessment=x.assessment&&typeof x.assessment==='object'?x.assessment:{};
    const rec=x.recommendation&&typeof x.recommendation==='object'?x.recommendation:{};
    const confidence=Math.max(0,Math.min(1,Number(assessment.confidence??x.confidence??0.5)||0.5));
    return {
      schemaVersion:'1.0',
      activity:evt.activity,
      entity:{type:evt.entityType||'RESEARCH',id:evt.entityId||evt.researchId||''},
      assessment:{status:String(assessment.status||x.status||'NEEDS_REVIEW'),confidence,riskLevel:String(assessment.riskLevel||x.riskLevel||'MEDIUM')},
      findings:normalizeList(x.findings),
      recommendation:{action:String(rec.action||x.action||'REVIEW'),reasoningSummary:String(rec.reasoningSummary||x.summary||'AI đề nghị người dùng xem xét ngữ cảnh và căn cứ trước khi quyết định.'),suggestedActions:normalizeList(rec.suggestedActions||x.suggestedActions)},
      citations:normalizeList(x.citations),
      constraints:normalizeList(x.constraints),
      requiresHumanDecision:x.requiresHumanDecision!==undefined?!!x.requiresHumanDecision:!!p.requiresHumanDecision,
      provider
    };
  }
  function prompt(evt,p){
    return `Bạn là AI Activity Analyst của NUTE RIS V6.0. Phân tích sự kiện nghiệp vụ dưới đây. Không bịa quy định, dữ liệu, điều khoản hoặc nguồn. Nếu thiếu căn cứ, ghi rõ NEEDS_REVIEW. Không tự thay con người ra quyết định có thẩm quyền.\n\nACTIVITY: ${evt.activity}\nPROFILE: ${p.profile}\nAUTONOMY: ${p.autonomy}\nMIN_CONFIDENCE: ${p.minimumConfidence}\n\nCONTEXT JSON:\n${JSON.stringify(evt.context||{},null,2).slice(0,50000)}\n\nChỉ trả về đúng MỘT JSON object, không markdown, theo schema:\n{\n  "assessment":{"status":"OK|NEEDS_REVIEW|NON_COMPLIANT","confidence":0.0,"riskLevel":"LOW|MEDIUM|HIGH|CRITICAL"},\n  "findings":[{"code":"...","severity":"INFO|LOW|MEDIUM|HIGH|CRITICAL","message":"...","evidence":"..."}],\n  "recommendation":{"action":"...","reasoningSummary":"...","suggestedActions":["..."]},\n  "citations":[{"source":"...","locator":"...","quote":"..."}],\n  "constraints":["..."],\n  "requiresHumanDecision":true\n}`;
  }

  let inferFn=null;
  function configure({infer}={}){inferFn=typeof infer==='function'?infer:null;return api()}
  async function observe(input={}){
    const p=policy(input.activity);if(!p||!p.enabled)return null;
    const s=load();
    const evt={id:uid('aievt'),activity:input.activity,entityType:input.entityType||'RESEARCH',entityId:input.entityId||input.researchId||'',researchId:input.researchId||'',trigger:p.trigger,policy:clone(p),context:clone(input.context||{}),createdAt:now(),status:'PENDING'};
    s.events.unshift(evt);s.events=s.events.slice(0,300);save(s);
    let structured,provider={name:'RIS Demo AI',model:'structured-fallback'},raw='';
    try{
      if(inferFn){
        try{
          const res=await inferFn({route:p.route,task:`AI Activity ${p.profile}`,content:prompt(evt,p)});
          provider=res?.provider||provider;raw=String(res?.result||'');
          structured=normalizeStructured(safeJson(raw),evt,p,provider);
          if(!safeJson(raw))structured.constraints.unshift('Provider không trả JSON hợp lệ; RIS đã chuẩn hóa phần đọc được thành recommendation có cấu trúc.');
        }catch(providerError){
          provider={name:'RIS Controlled Fallback',model:'structured-fallback'};
          structured=fallbackStructured(evt,provider.name);
          structured.constraints.unshift('AI thật không khả dụng: '+String(providerError?.message||providerError));
          const fs=load();fs.audit.unshift({id:uid('aia'),kind:'AI_PROVIDER_FALLBACK',eventId:evt.id,activity:evt.activity,error:String(providerError?.message||providerError),createdAt:now()});save(fs);
        }
      }else structured=fallbackStructured(evt,provider.name);
      const ss=load();const current=ss.events.find(x=>x.id===evt.id);if(current)current.status='ANALYZED';
      const analysis={id:uid('aian'),eventId:evt.id,activity:evt.activity,researchId:evt.researchId,entityType:evt.entityType,entityId:evt.entityId,profile:p.profile,provider:clone(provider),raw:raw.slice(0,12000),structured:clone(structured),createdAt:now()};
      const rec={id:uid('airec'),eventId:evt.id,analysisId:analysis.id,decisionPoint:evt.activity,researchId:evt.researchId,entityId:evt.entityId,policy:clone(p),provider:clone(provider),createdAt:now(),structured:clone(structured)};
      ss.analyses.unshift(analysis);ss.analyses=ss.analyses.slice(0,300);ss.recommendations.unshift(rec);ss.recommendations=ss.recommendations.slice(0,300);ss.audit.unshift({id:uid('aia'),kind:'AI_ACTIVITY_ANALYZED',eventId:evt.id,recommendationId:rec.id,activity:evt.activity,createdAt:now()});ss.audit=ss.audit.slice(0,500);save(ss);return clone(rec);
    }catch(err){
      const ss=load();const current=ss.events.find(x=>x.id===evt.id);if(current){current.status='FAILED';current.error=String(err?.message||err)}ss.audit.unshift({id:uid('aia'),kind:'AI_ACTIVITY_FAILED',eventId:evt.id,activity:evt.activity,error:String(err?.message||err),createdAt:now()});save(ss);throw err;
    }
  }
  function recordHumanDecision(recommendationId,{outcome,rationale='',actorId=''}={}){const s=load();const rec=s.recommendations.find(x=>x.id===recommendationId);if(!rec)return null;const d={id:uid('aihd'),recommendationId,outcome:String(outcome||'REVIEWED'),rationale:String(rationale||''),actorId:String(actorId||''),createdAt:now()};s.decisions.unshift(d);s.audit.unshift({id:uid('aia'),kind:'HUMAN_AI_DECISION',recommendationId,outcome:d.outcome,createdAt:d.createdAt});save(s);return clone(d)}
  function summary(){const s=load();const latest=s.recommendations[0]||null;return {version:s.version,policies:clone(s.policies),events:clone(s.events),analyses:clone(s.analyses),recommendations:clone(s.recommendations),decisions:clone(s.decisions),providerStatus:latest?clone(latest.provider):null,counts:{events:s.events.length,analyzed:s.analyses.length,awaitingHuman:s.recommendations.filter(r=>r.structured?.requiresHumanDecision&&!s.decisions.some(d=>d.recommendationId===r.id)).length,failed:s.events.filter(e=>e.status==='FAILED').length}}}
  function reset(){localStorage.removeItem(KEY);return summary()}
  function api(){return {version:VERSION,configure,observe,policy,updatePolicy,summary,recordHumanDecision,reset,state}}
  window.NuteAIActivity=api();
  window.NuteAIActivityOrchestrator=window.NuteAIActivity;
})();
