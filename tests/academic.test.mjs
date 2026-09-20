import test from 'node:test';
import assert from 'node:assert/strict';
import { ACADEMIC_CAPABILITIES, buildParticipantWorkspace, buildAcademicTaskPrompt } from '../src/core/academic.mjs';

const db={
  research:[{id:'r1',typeId:'t1',title:'AI in education',summary:'Study',ownerId:'u1',participantIds:['u2'],status:'DRAFT',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}],
  researchTypes:[{id:'t1',name:'Đề tài'}],
  workflows:[{researchTypeId:'t1',initialStatus:'DRAFT',transitions:[{from:'DRAFT',to:'SUBMITTED',requiredEvidence:['REGISTRATION']}]}],
  evidence:[],researchMilestones:[],researchSources:[],researchNotes:[],academicAnalyses:[]
};

test('V4 exposes participant academic capabilities',()=>{
  for(const c of ['research.coach','research.literature','research.methodology','research.data','research.citation','research.writing','research.integrity','research.publication','research.ip']) assert.ok(ACADEMIC_CAPABILITIES[c]);
});

test('participant workspace explains missing evidence and next step',()=>{
  const ws=buildParticipantWorkspace(db,'r1','u1');
  assert.equal(ws.process.currentStatus,'DRAFT');
  assert.equal(ws.process.nextSteps[0].to,'SUBMITTED');
  assert.deepEqual(ws.process.nextSteps[0].missingEvidence,['REGISTRATION']);
  assert.ok(ws.process.suggestedActions.some(x=>x.includes('REGISTRATION')));
});

test('literature prompt explicitly forbids fabricated sources',()=>{
  const p=buildAcademicTaskPrompt('research.literature','Tổng quan tài liệu');
  assert.match(p,/Không bịa tài liệu/i);
  assert.match(p,/thiếu dữ liệu/i);
});
