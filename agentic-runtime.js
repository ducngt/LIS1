(function(){
'use strict';
const KEY='nute-ris-v70-agentic-state';
const VERSION='7.0.0';
const now=()=>new Date().toISOString();
const uid=p=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const clone=x=>JSON.parse(JSON.stringify(x));
const CRITICAL=new Set(['APPROVE','REJECT_OFFICIAL','RECOGNIZE','GRANT_ROLE','CHANGE_POLICY','ALLOCATE_BUDGET','SIGN','DISCIPLINARY_DECISION','DELETE_OFFICIAL_EVIDENCE']);
const AGENTS=[
 {id:'data_intake',name:'Data Intake Agent',description:'Nhập liệu, đọc tài liệu, chuẩn hóa dữ liệu và tạo draft.',modalities:['text','document','image','audio','voice','video'],capabilities:['intake.extract','intake.classify','intake.map','draft.create'],allowedActions:['CREATE_DRAFT','CREATE_RECOMMENDATION'],forbiddenActions:['APPROVE','RECOGNIZE','SIGN'],defaultAutonomy:'RECOMMEND'},
 {id:'research_copilot',name:'Research Copilot Agent',description:'Đồng hành nghiên cứu: đề cương, phương pháp, tài liệu, phân tích và viết học thuật.',modalities:['text','document','image','audio','voice','video'],capabilities:['research.analyze','methodology.review','literature.reason','writing.support','data.interpret'],allowedActions:['CREATE_NOTE','CREATE_DRAFT','CREATE_RECOMMENDATION'],forbiddenActions:['APPROVE','RECOGNIZE','SIGN'],defaultAutonomy:'RECOMMEND'},
 {id:'workflow',name:'Workflow Agent',description:'Theo dõi tiến trình, deadline, gate và các hồ sơ bị tắc.',modalities:['text','document'],capabilities:['workflow.inspect','workflow.gate','deadline.monitor','workitem.create'],allowedActions:['CREATE_ALERT','CREATE_WORK_ITEM','SEND_REMINDER','CREATE_RECOMMENDATION'],forbiddenActions:['APPROVE','RECOGNIZE','SIGN'],defaultAutonomy:'AUTO_REVERSIBLE'},
 {id:'evidence_document',name:'Evidence & Document Agent',description:'Phân tích tài liệu, minh chứng, provenance, tính đầy đủ và mâu thuẫn.',modalities:['text','document','image','audio','video'],capabilities:['document.extract','document.compare','evidence.assess','evidence.map'],allowedActions:['CLASSIFY','TAG','CREATE_ALERT','CREATE_RECOMMENDATION'],forbiddenActions:['DELETE_OFFICIAL_EVIDENCE','APPROVE'],defaultAutonomy:'RECOMMEND'},
 {id:'governance_compliance',name:'Governance & Compliance Agent',description:'Đối chiếu quy chế, thẩm quyền, workflow và compliance.',modalities:['text','document'],capabilities:['policy.search','policy.compare','compliance.assess','authority.check'],allowedActions:['CREATE_ALERT','CREATE_RECOMMENDATION'],forbiddenActions:['CHANGE_POLICY','APPROVE','SIGN'],defaultAutonomy:'HUMAN_MANDATORY'},
 {id:'administration',name:'Administration Agent',description:'Hỗ trợ quản trị nhân sự, tài khoản, vai trò, đơn vị và cấu hình hệ thống.',modalities:['text','document'],capabilities:['personnel.inspect','account.audit','role.review','system.inspect'],allowedActions:['CREATE_DRAFT','CREATE_RECOMMENDATION'],forbiddenActions:['GRANT_ROLE','DELETE_ACCOUNT','CHANGE_POLICY'],defaultAutonomy:'HUMAN_MANDATORY'},
 {id:'council_review',name:'Council & Review Agent',description:'Hỗ trợ phản biện, hội đồng, tổng hợp ý kiến và biên bản.',modalities:['text','document','audio','voice','video'],capabilities:['review.synthesize','reviewer.match','meeting.transcribe','minutes.draft'],allowedActions:['CREATE_DRAFT','CREATE_RECOMMENDATION'],forbiddenActions:['VOTE','APPROVE','RECOGNIZE'],defaultAutonomy:'HUMAN_MANDATORY'},
 {id:'portfolio_intelligence',name:'Portfolio Intelligence Agent',description:'Phân tích danh mục nghiên cứu toàn trường, xu hướng, rủi ro và năng lực.',modalities:['text','document'],capabilities:['portfolio.analyze','trend.detect','risk.detect','opportunity.detect'],allowedActions:['CREATE_ALERT','CREATE_BRIEF','CREATE_RECOMMENDATION'],forbiddenActions:['ALLOCATE_BUDGET','CHANGE_POLICY'],defaultAutonomy:'RECOMMEND'},
 {id:'executive_intelligence',name:'Executive Intelligence Agent',description:'Decision intelligence cho Ban giám hiệu: briefing, kịch bản, định hướng và decision memory.',modalities:['text','document','audio','voice','video'],capabilities:['executive.brief','scenario.plan','decision.compare','strategy.analyze','outcome.review'],allowedActions:['CREATE_BRIEF','CREATE_SCENARIO','CREATE_DECISION_DRAFT','CREATE_RECOMMENDATION'],forbiddenActions:['ALLOCATE_BUDGET','CHANGE_POLICY','APPOINT_PERSONNEL','SIGN','APPROVE'],defaultAutonomy:'HUMAN_MANDATORY'}
];
const TOOL_DEFS=[
 {id:'research.list',risk:'READ',agents:['research_copilot','workflow','portfolio_intelligence','executive_intelligence','governance_compliance']},
 {id:'research.get',risk:'READ',agents:['data_intake','research_copilot','workflow','evidence_document','governance_compliance','council_review','portfolio_intelligence','executive_intelligence']},
 {id:'research.create_draft',risk:'REVERSIBLE_WRITE',agents:['data_intake','research_copilot']},
 {id:'workflow.inspect',risk:'READ',agents:['workflow','governance_compliance','executive_intelligence']},
 {id:'knowledge.list',risk:'READ',agents:['research_copilot','evidence_document','governance_compliance','council_review','executive_intelligence']},
 {id:'personnel.list',risk:'READ',agents:['administration','executive_intelligence','portfolio_intelligence']},
 {id:'organization.list',risk:'READ',agents:['administration','executive_intelligence','portfolio_intelligence']},
 {id:'audit.list',risk:'READ',agents:['administration','governance_compliance','executive_intelligence']},
 {id:'intelligence.portfolio',risk:'READ',agents:['portfolio_intelligence','executive_intelligence']},
 {id:'intelligence.search',risk:'READ',agents:['research_copilot','portfolio_intelligence','executive_intelligence']},
 {id:'notification.prepare',risk:'REVERSIBLE_WRITE',agents:['workflow','administration','executive_intelligence']},
 {id:'decision.draft',risk:'REVERSIBLE_WRITE',agents:['governance_compliance','council_review','executive_intelligence']}
];
let cfg={infer:null,invokeTool:null,contextProvider:null,currentUser:null};
function initial(){return {version:VERSION,agents:AGENTS.map(a=>({...a,enabled:true})),tasks:[],messages:[],decisionMemory:[],audit:[],settings:{voiceReplies:false,continuousMonitoring:true}}}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(!s)return initial();s.version=VERSION;s.agents=AGENTS.map(a=>({...a,...((s.agents||[]).find(x=>x.id===a.id)||{})}));s.tasks=s.tasks||[];s.messages=s.messages||[];s.decisionMemory=s.decisionMemory||[];s.audit=s.audit||[];s.settings={...initial().settings,...(s.settings||{})};return s}catch{return initial()}}
function save(s){localStorage.setItem(KEY,JSON.stringify(s));return s}
function audit(kind,data={}){const s=load();s.audit.unshift({id:uid('aga'),kind,createdAt:now(),...clone(data)});s.audit=s.audit.slice(0,1000);save(s)}
function agent(id){return load().agents.find(a=>a.id===id)||null}
function routeHeuristic(message='',context={}){const t=(message+' '+JSON.stringify(context||{})).toLowerCase();
 if(/ban giám hiệu|lãnh đạo|chiến lược|định hướng|kịch bản|scenario|ra quyết định|quyết định đầu tư|toàn trường/.test(t))return'executive_intelligence';
 if(/danh mục|portfolio|xu hướng|năng lực nghiên cứu|toàn bộ đề tài|rủi ro toàn trường/.test(t))return'portfolio_intelligence';
 if(/tài khoản|nhân sự|vai trò|phân quyền|đơn vị|quản trị|admin/.test(t))return'administration';
 if(/hội đồng|phản biện|reviewer|biên bản|cuộc họp/.test(t))return'council_review';
 if(/quy chế|compliance|tuân thủ|thẩm quyền|điều khoản|chính sách/.test(t))return'governance_compliance';
 if(/minh chứng|evidence|tài liệu|document|pdf|word|ảnh|video/.test(t))return'evidence_document';
 if(/workflow|quy trình|deadline|chậm|trễ|chuyển trạng thái|phê duyệt/.test(t))return'workflow';
 if(/tạo hồ sơ|nhập liệu|trích xuất|điền biểu mẫu|import|tạo dữ liệu/.test(t))return'data_intake';
 return'research_copilot'}
function safeJson(text){if(typeof text!=='string')return null;const s=text.trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();try{return JSON.parse(s)}catch{}let start=s.indexOf('{');if(start<0)return null;let d=0,str=false,esc=false;for(let i=start;i<s.length;i++){const c=s[i];if(str){if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')str=false;continue}if(c==='"'){str=true;continue}if(c==='{')d++;else if(c==='}'&&--d===0){try{return JSON.parse(s.slice(start,i+1))}catch{return null}}}return null}
async function collectContext(agentId,input={}){let base={user:cfg.currentUser?cfg.currentUser():null,route:input.route||'',entity:input.entity||null,provided:input.context||{}};if(cfg.contextProvider){try{base=await cfg.contextProvider(agentId,input,base)||base}catch(e){base.contextError=e.message}}return base}
function allowedTool(agentId,toolId){const t=TOOL_DEFS.find(x=>x.id===toolId);return !!t&&t.agents.includes(agentId)}
async function callTool(agentId,toolId,args={}){if(!allowedTool(agentId,toolId))throw new Error(`Agent ${agentId} không được phép dùng tool ${toolId}.`);const t=TOOL_DEFS.find(x=>x.id===toolId);if(!cfg.invokeTool)throw new Error('Tool invoker chưa được cấu hình.');const result=await cfg.invokeTool(toolId,args,{agentId,risk:t.risk});audit('TOOL_CALL',{agentId,toolId,risk:t.risk});return result}
function promptFor(a,input,context,toolData){return `Bạn là ${a.name} trong NUTE RIS V7.0.\nVai trò: ${a.description}\nNguyên tắc: không bịa dữ liệu/nguồn; phân biệt FACT, DERIVED_METRIC, AI_INFERENCE, FORECAST; nêu bất định; không vượt quyền; các quyết định có thẩm quyền thuộc con người.\nAllowed actions: ${a.allowedActions.join(', ')}. Forbidden: ${a.forbiddenActions.join(', ')}.\n\nYêu cầu người dùng:\n${input.message||''}\n\nContext:\n${JSON.stringify(context,null,2).slice(0,50000)}\n\nTool data:\n${JSON.stringify(toolData||{},null,2).slice(0,40000)}\n\nHãy trả JSON duy nhất theo schema: {"summary":"...","status":"OK|NEEDS_REVIEW|BLOCKED","confidence":0-1,"facts":[],"inferences":[],"risks":[],"recommendations":[],"nextActions":[],"citations":[],"decision":{"question":"","options":[],"recommendedOption":"","uncertainties":[],"requiresHumanDecision":true},"toolCalls":[{"toolId":"research.get","args":{},"reason":""}],"draft":null}. Chỉ yêu cầu tool nằm trong Tool Registry; không tự thực hiện critical action.`}
async function prefetch(agentId,input,context){const out={};try{
 if(['portfolio_intelligence','executive_intelligence'].includes(agentId))out.portfolio=await callTool(agentId,'intelligence.portfolio',{});
 if(agentId==='administration'){out.personnel=await callTool(agentId,'personnel.list',{});out.organizations=await callTool(agentId,'organization.list',{})}
 if(agentId==='governance_compliance')out.knowledge=await callTool(agentId,'knowledge.list',{});
 if(input.entity?.type==='RESEARCH'&&input.entity?.id&&allowedTool(agentId,'research.get'))out.research=await callTool(agentId,'research.get',{id:input.entity.id});
 }catch(e){out.prefetchError=e.message}return out}
async function run(input={}){const s=load();const agentId=input.agentId||routeHeuristic(input.message,input.context);const a=s.agents.find(x=>x.id===agentId&&x.enabled!==false)||s.agents.find(x=>x.id==='research_copilot');const task={id:uid('agt'),agentId:a.id,status:'RUNNING',trigger:input.trigger||'ON_DEMAND',message:input.message||'',entity:clone(input.entity||null),createdAt:now(),startedAt:now(),modalities:(input.files||[]).map(f=>f.type||'file')};s.tasks.unshift(task);save(s);audit('AGENT_TASK_STARTED',{taskId:task.id,agentId:a.id,trigger:task.trigger});
 try{const context=await collectContext(a.id,input);const toolData=await prefetch(a.id,input,context);if(!cfg.infer)throw new Error('Chưa có AI provider thật được cấu hình cho Agent Runtime.');const result=await cfg.infer({task:`Agent ${a.name}: ${input.message||'Phân tích context hiện tại'}`,content:promptFor(a,input,context,toolData),files:input.files||[]});let structured=safeJson(result?.result||'')||{summary:result?.result||'',status:'NEEDS_REVIEW',confidence:.5,facts:[],inferences:[],risks:[],recommendations:[],nextActions:[],citations:[],decision:{requiresHumanDecision:true}};const requested=Array.isArray(structured.toolCalls)?structured.toolCalls.slice(0,5):[];const executed=[];for(const tc of requested){try{if(!tc?.toolId||!allowedTool(a.id,tc.toolId))throw new Error('Tool không được phép');const value=await callTool(a.id,tc.toolId,tc.args||{});executed.push({toolId:tc.toolId,ok:true,value})}catch(e){executed.push({toolId:tc?.toolId||'',ok:false,error:e.message})}}if(executed.length){const follow=await cfg.infer({task:`Agent ${a.name}: tổng hợp sau khi dùng tools`,content:`Yêu cầu: ${input.message||''}\nKết quả phân tích ban đầu: ${JSON.stringify(structured)}\nTool results: ${JSON.stringify(executed)}\nHãy trả JSON cuối cùng cùng schema; phân biệt dữ liệu từ tool và suy luận AI.` ,files:input.files||[]});structured=safeJson(follow?.result||'')||structured;structured.toolResults=executed;if(follow?.provider)result.provider=follow.provider}structured.provider=result?.provider||null;structured.agentId=a.id;structured.agentName=a.name;structured.generatedAt=now();structured.requiresHumanDecision=structured.decision?.requiresHumanDecision!==false||a.defaultAutonomy==='HUMAN_MANDATORY';const st=load();const t=st.tasks.find(x=>x.id===task.id);Object.assign(t,{status:'COMPLETED',completedAt:now(),result:structured,provider:result?.provider||null});st.messages.unshift({id:uid('agm'),taskId:task.id,agentId:a.id,role:'assistant',content:structured.summary||'',structured,createdAt:now()});save(st);audit('AGENT_TASK_COMPLETED',{taskId:task.id,agentId:a.id,provider:result?.provider||null,confidence:structured.confidence});return clone(t)
 }catch(e){const st=load();const t=st.tasks.find(x=>x.id===task.id);Object.assign(t,{status:'FAILED',completedAt:now(),error:e.message});save(st);audit('AGENT_TASK_FAILED',{taskId:task.id,agentId:a.id,error:e.message});throw e}}

function teamFor(primary,message=''){
 const t=String(message).toLowerCase();const team=[primary];
 const add=x=>{if(x!==primary&&!team.includes(x))team.push(x)};
 if(primary==='executive_intelligence'){add('portfolio_intelligence');if(/quy chế|chính sách|compliance|thẩm quyền/.test(t))add('governance_compliance')}
 if(primary==='research_copilot'){if(/tài liệu|minh chứng|file|pdf|word|ảnh|video/.test(t))add('evidence_document');if(/quy chế|tuân thủ|điều khoản/.test(t))add('governance_compliance')}
 if(primary==='data_intake'){add('research_copilot');if(/quy chế|biểu mẫu|thẩm quyền/.test(t))add('governance_compliance')}
 if(primary==='council_review')add('governance_compliance');
 if(primary==='workflow'&&/quy chế|thẩm quyền|gate/.test(t))add('governance_compliance');
 return team.slice(0,3)
}
async function runTeam(input={}){
 const primary=input.agentId||routeHeuristic(input.message,input.context);const ids=teamFor(primary,input.message);if(ids.length===1)return run({...input,agentId:primary});
 const members=[];for(const id of ids){members.push(await run({...input,agentId:id,trigger:input.trigger||'SUPERVISOR'}))}
 if(!cfg.infer)return members[0];
 const synth=await cfg.infer({task:'Agent Supervisor tổng hợp kết quả nhiều agent',content:`Bạn là Agent Supervisor của RIS V7.0. Tổng hợp các kết quả sau, loại bỏ trùng lặp và mâu thuẫn, phân biệt FACT/AI_INFERENCE/FORECAST, nêu rõ điểm cần Human Decision. Trả JSON theo schema {summary,status,confidence,facts,inferences,risks,recommendations,nextActions,citations,decision}.\n${JSON.stringify(members.map(x=>({agentId:x.agentId,result:x.result})),null,2)}`});
 const structured=safeJson(synth?.result||'')||{summary:synth?.result||'',status:'NEEDS_REVIEW',confidence:.5,decision:{requiresHumanDecision:true}};
 structured.provider=synth?.provider||null;structured.agentId='agent_supervisor';structured.agentName='Agent Supervisor';structured.team=ids;structured.generatedAt=now();
 const st=load();const task={id:uid('agt'),agentId:'agent_supervisor',status:'COMPLETED',trigger:'SUPERVISOR',message:input.message||'',entity:clone(input.entity||null),createdAt:now(),startedAt:now(),completedAt:now(),result:structured,team:ids,childTaskIds:members.map(x=>x.id),provider:synth?.provider||null};st.tasks.unshift(task);st.messages.unshift({id:uid('agm'),taskId:task.id,agentId:'agent_supervisor',role:'assistant',content:structured.summary||'',structured,createdAt:now()});save(st);audit('AGENT_TEAM_COMPLETED',{taskId:task.id,team:ids,provider:synth?.provider||null});return clone(task)
}

function recordDecision(taskId,decision={}){const s=load();const t=s.tasks.find(x=>x.id===taskId);if(!t)throw new Error('Không tìm thấy agent task.');const d={id:uid('agd'),taskId,agentId:t.agentId,outcome:decision.outcome||'ACCEPTED',rationale:decision.rationale||'',actorId:decision.actorId||'',createdAt:now()};s.decisionMemory.unshift({...d,question:t.result?.decision?.question||t.message,expectedOutcome:decision.expectedOutcome||'',reviewDate:decision.reviewDate||'',actualOutcome:''});save(s);audit('HUMAN_AGENT_DECISION',{taskId,agentId:t.agentId,outcome:d.outcome});return d}
function updateOutcome(decisionId,actualOutcome){const s=load();const d=s.decisionMemory.find(x=>x.id===decisionId);if(!d)throw new Error('Không tìm thấy decision memory.');d.actualOutcome=actualOutcome;d.reviewedAt=now();save(s);return d}
function setAgentEnabled(id,enabled){const s=load();const a=s.agents.find(x=>x.id===id);if(a)a.enabled=!!enabled;save(s);return a}
function setSettings(x){const s=load();s.settings={...s.settings,...x};save(s);return clone(s.settings)}
function summary(){const s=load();return {version:s.version,agents:s.agents,tasks:s.tasks.slice(0,100),messages:s.messages.slice(0,100),decisionMemory:s.decisionMemory.slice(0,100),audit:s.audit.slice(0,200),settings:s.settings,toolRegistry:clone(TOOL_DEFS)}}
function reset(){localStorage.removeItem(KEY);return summary()}
window.NuteAgenticRIS={VERSION,configure:x=>{cfg={...cfg,...x};return true},run,runTeam,route:routeHeuristic,agent,agents:()=>clone(load().agents),tools:()=>clone(TOOL_DEFS),callTool,recordDecision,updateOutcome,setAgentEnabled,setSettings,summary,state:()=>clone(load()),reset,criticalActions:[...CRITICAL]};
})();
