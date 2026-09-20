function words(value='') {
  return new Set(String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2));
}
function overlap(a,b){const A=words(a),B=words(b);if(!A.size||!B.size)return 0;let hit=0;for(const w of A)if(B.has(w))hit++;return hit/Math.sqrt(A.size*B.size)}
function researchText(r){return [r.title,r.summary,JSON.stringify(r.metadata||{})].join(' ')}
function profileText(p){return [p.displayName,(p.keywords||[]).join(' '),(p.expertise||[]).join(' '),p.bio,p.department].join(' ')}

export function semanticResearchSearch(db, query, limit=20){
  return (db.research||[]).map(r=>({research:r,score:overlap(query,researchText(r))})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);
}

export function findSimilarResearch(db, researchId, limit=10){
  const source=(db.research||[]).find(r=>r.id===researchId); if(!source)return [];
  return (db.research||[]).filter(r=>r.id!==researchId).map(r=>({research:r,score:overlap(researchText(source),researchText(r))})).filter(x=>x.score>=0.12).sort((a,b)=>b.score-a.score).slice(0,limit);
}

export function matchReviewers(db, researchId, limit=10){
  const r=(db.research||[]).find(x=>x.id===researchId); if(!r)return [];
  const excluded=new Set([r.ownerId,...(r.participantIds||[])]);
  const target=researchText(r);
  return (db.researcherProfiles||[]).filter(p=>!excluded.has(p.userId)&&p.active!==false).map(p=>{
    let score=overlap(target,profileText(p));
    const prior=(db.research||[]).filter(x=>x.ownerId===p.userId||(x.participantIds||[]).includes(p.userId));
    if(prior.length){score+=Math.max(...prior.map(x=>overlap(target,researchText(x))))*.35;}
    return {profile:p,score:Math.min(score,1)};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);
}

export function portfolioSignals(db){
  const research=db.research||[]; const now=Date.now();
  const stale=research.filter(r=>!['RECOGNIZED','REJECTED'].includes(r.status)&&now-new Date(r.updatedAt||r.createdAt).getTime()>45*86400000);
  const byStatus={}; for(const r of research)byStatus[r.status]=(byStatus[r.status]||0)+1;
  const duplicates=[]; for(let i=0;i<research.length;i++)for(let j=i+1;j<research.length;j++){const s=overlap(researchText(research[i]),researchText(research[j]));if(s>=.55)duplicates.push({a:research[i].id,b:research[j].id,score:s});}
  return {total:research.length,stale:stale.map(r=>r.id),byStatus,possibleDuplicates:duplicates.sort((a,b)=>b.score-a.score).slice(0,25),pendingAI:(db.aiWorkItems||[]).filter(x=>x.status==='PENDING').length,awaitingHuman:(db.aiRecommendations||[]).filter(x=>x.status==='AWAITING_HUMAN').length};
}

export function buildInstitutionalKnowledge(db, scope='all'){
  const docs=(db.knowledgeDocuments||[]).filter(d=>d.active!==false&&(scope==='all'||d.scope===scope||d.scope==='all'));
  return docs.map(d=>({id:d.id,title:d.title,kind:d.kind,scope:d.scope,content:d.content,updatedAt:d.updatedAt}));
}

export function policyFindings(db, researchId){
  const r=(db.research||[]).find(x=>x.id===researchId); if(!r)return [];
  const docs=buildInstitutionalKnowledge(db,'all').filter(d=>['policy','regulation','procedure','rubric'].includes(d.kind));
  return docs.map(d=>({documentId:d.id,title:d.title,relevance:overlap(researchText(r),`${d.title} ${d.content}`)})).filter(x=>x.relevance>0).sort((a,b)=>b.relevance-a.relevance).slice(0,10);
}
