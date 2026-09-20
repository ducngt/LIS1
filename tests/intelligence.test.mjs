import test from 'node:test';
import assert from 'node:assert/strict';
import { semanticResearchSearch, findSimilarResearch, matchReviewers, portfolioSignals, policyFindings } from '../src/core/intelligence.mjs';

const db={
  research:[
    {id:'r1',title:'Ứng dụng AI trong giáo dục kỹ thuật',summary:'RAG và mô hình ngôn ngữ cho giảng dạy',ownerId:'u1',participantIds:['u2'],status:'IN_PROGRESS',createdAt:'2025-01-01',updatedAt:'2025-01-01',metadata:{}},
    {id:'r2',title:'Hệ thống RAG hỗ trợ đào tạo',summary:'Mô hình ngôn ngữ và truy hồi tri thức trong giáo dục',ownerId:'u3',participantIds:[],status:'DRAFT',createdAt:'2025-01-01',updatedAt:'2025-01-01',metadata:{}},
    {id:'r3',title:'Gia công CNC chính xác',summary:'Tối ưu chế độ cắt',ownerId:'u4',participantIds:[],status:'DRAFT',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),metadata:{}}
  ],
  researcherProfiles:[
    {userId:'u2',displayName:'Thành viên',expertise:['AI'],keywords:['RAG'],active:true},
    {userId:'u3',displayName:'Chuyên gia AI',expertise:['AI','Giáo dục'],keywords:['RAG','LLM'],active:true},
    {userId:'u4',displayName:'Chuyên gia CNC',expertise:['CNC'],keywords:['gia công'],active:true}
  ],
  knowledgeDocuments:[{id:'k1',title:'Quy chế nghiên cứu và AI',kind:'policy',scope:'all',content:'Quy định về nghiên cứu, giáo dục và ứng dụng AI',active:true}],
  aiWorkItems:[],aiRecommendations:[]
};

test('semantic research search ranks relevant research',()=>{const x=semanticResearchSearch(db,'AI RAG giáo dục');assert.equal(x[0].research.id,'r1');});
test('similar research detects related topic',()=>{const x=findSimilarResearch(db,'r1');assert.equal(x[0].research.id,'r2');});
test('reviewer matching excludes owner and participants',()=>{const x=matchReviewers(db,'r1');assert.ok(x.every(v=>!['u1','u2'].includes(v.profile.userId)));assert.equal(x[0].profile.userId,'u3');});
test('portfolio signals returns status and stale items',()=>{const x=portfolioSignals(db);assert.equal(x.total,3);assert.ok(x.stale.includes('r1'));});
test('policy findings finds relevant institutional knowledge',()=>{const x=policyFindings(db,'r1');assert.equal(x[0].documentId,'k1');});
