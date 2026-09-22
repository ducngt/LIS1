(function(){
'use strict';
const VERSION='7.1.0';
const KEY='nute-ris-v71-workspace';
const WORKSPACES={
 ADMIN_WORKSPACE:{id:'ADMIN_WORKSPACE',name:'Quản trị hệ thống',shortName:'Quản trị',home:'dashboard',roles:['SYSTEM_ADMIN'],agents:['administration','governance_compliance','data_intake'],tools:['personnel.list','organization.list','audit.list','knowledge.list','notification.prepare'],scopeMode:'SYSTEM',navigation:[
  ['dashboard','Tổng quan hệ thống'],['personnel','Nhân sự'],['users','Tài khoản'],['roles','Vai trò & quyền'],['organizations','Đơn vị'],['types','Loại nghiên cứu'],['workflows','Quy trình'],['knowledge','Kho tri thức & Quy chế'],['form-studio','AI Form Studio'],['forms','Biểu mẫu điện tử'],['signature-settings','Chữ ký & chứng thư'],['providers','AI Model Registry'],['agents','AI Agent Center'],['audit','Nhật ký hệ thống']
 ]},
 RESEARCHER_WORKSPACE:{id:'RESEARCHER_WORKSPACE',name:'Không gian nhà nghiên cứu',shortName:'Nghiên cứu của tôi',home:'dashboard',roles:['RESEARCH_PARTICIPANT'],agents:['research_copilot','data_intake','evidence_document','workflow','governance_compliance'],tools:['research.list','research.get','research.create_draft','knowledge.list','intelligence.search'],scopeMode:'SELF',navigation:[
  ['dashboard','Tổng quan của tôi'],['research','Nghiên cứu của tôi'],['workspace','AI Research Workspace'],['ai','Research Copilot'],['agents','AI Agent Center'],['profile','Hồ sơ năng lực'],['scientific-profile','Hồ sơ khoa học'],['forms','Biểu mẫu điện tử'],['ai-settings','AI Settings']
 ]},
 MANAGEMENT_WORKSPACE:{id:'MANAGEMENT_WORKSPACE',name:'Không gian quản lý',shortName:'Quản lý đơn vị',home:'dashboard',roles:['APPROVER_LEVEL_2','APPROVER_LEVEL_3'],agents:['workflow','governance_compliance','portfolio_intelligence','council_review','evidence_document'],tools:['research.list','research.get','workflow.inspect','knowledge.list','intelligence.portfolio','intelligence.search','notification.prepare','decision.draft'],scopeMode:'ORGANIZATION',navigation:[
  ['dashboard','Management Dashboard'],['research','Hồ sơ thuộc phạm vi'],['ai-decisions','Hồ sơ chờ quyết định'],['intelligence','Unit Intelligence'],['forms','Biểu mẫu điện tử'],['signature-settings','Chữ ký & chứng thư'],['agents','AI Agent Center'],['knowledge','Quy chế & Tri thức'],['ai-settings','AI Settings']
 ]},
 REVIEW_WORKSPACE:{id:'REVIEW_WORKSPACE',name:'Không gian hội đồng / phản biện',shortName:'Hội đồng',home:'dashboard',roles:['REVIEWER','COUNCIL_MEMBER','COUNCIL_CHAIR'],agents:['council_review','research_copilot','evidence_document','governance_compliance'],tools:['research.get','knowledge.list','intelligence.search','decision.draft'],scopeMode:'ASSIGNED',navigation:[
  ['dashboard','Review Dashboard'],['research','Hồ sơ được phân công'],['agents','Council & Review Agent'],['knowledge','Quy chế & Tri thức'],['forms','Biểu mẫu'],['signature-settings','Chữ ký']
 ]},
 EXECUTIVE_WORKSPACE:{id:'EXECUTIVE_WORKSPACE',name:'Không gian Ban giám hiệu',shortName:'Executive Intelligence',home:'dashboard',roles:['APPROVER_LEVEL_4','EXECUTIVE','RESEARCH_EXECUTIVE','RECTOR','VICE_RECTOR'],agents:['executive_intelligence','portfolio_intelligence','governance_compliance','workflow'],tools:['intelligence.portfolio','intelligence.search','research.list','research.get','knowledge.list','organization.list','decision.draft'],scopeMode:'INSTITUTION',navigation:[
  ['dashboard','Executive Overview'],['executive','Strategic Intelligence'],['intelligence','Portfolio Intelligence'],['ai-decisions','Decision Center'],['research','Research Portfolio'],['agents','Executive AI'],['knowledge','Policy Impact'],['forms','Biểu mẫu'],['signature-settings','Chữ ký'],['ai-settings','AI Settings']
 ]}
};
function available(user){const roles=new Set(user?.roles||[]);const out=Object.values(WORKSPACES).filter(w=>w.roles.some(r=>roles.has(r)));return out.length?out:[WORKSPACES.RESEARCHER_WORKSPACE]}
function getStored(){try{return sessionStorage.getItem(KEY)||''}catch{return ''}}
function setStored(id){try{sessionStorage.setItem(KEY,id)}catch{}return id}
function resolve(user){const list=available(user);const saved=getStored();return list.find(w=>w.id===saved)||list[0]}
function setActive(user,id){const w=available(user).find(x=>x.id===id);if(!w)throw new Error('Workspace không thuộc vai trò hiện tại.');setStored(w.id);return w}
function current(user){return resolve(user)}
function allowsAgent(user,agentId){return current(user).agents.includes(agentId)}
function allowsTool(user,toolId){return current(user).tools.includes(toolId)}
function context(user){const w=current(user);return {workspaceId:w.id,workspaceName:w.name,scopeMode:w.scopeMode,organizationId:user?.organizationId||null,userId:user?.id||null,roles:[...(user?.roles||[])]}}
window.NuteRISWorkspaces={VERSION,WORKSPACES,available,resolve,current,setActive,allowsAgent,allowsTool,context};
})();
