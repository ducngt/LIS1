import test from 'node:test';
import assert from 'node:assert/strict';
import { filterUsableModels } from '../src/wires/ai.mjs';
import { rankProviders, invokeAIWithFallback } from '../src/core/ai-router.mjs';
import { validateTransition } from '../src/core/workflow.mjs';
import { BASE_PERMISSIONS } from '../src/core/permissions.mjs';

test('OpenAI model discovery filters legacy/non-generation models', () => {
  const rows = filterUsableModels('openai', [
    {id:'babbage-002'}, {id:'text-embedding-3-large'}, {id:'gpt-5-test'}, {id:'o3-test'}
  ]);
  assert.deepEqual(rows.map(x=>x.id), ['gpt-5-test','o3-test']);
});

test('OpenRouter keeps general text models but rejects specialized non-text endpoints', () => {
  const rows = filterUsableModels('openrouter', [
    {id:'meta/llama-foo'}, {id:'vendor/text-embedding-model'}, {id:'vendor/audio-model'}
  ]);
  assert.deepEqual(rows.map(x=>x.id), ['meta/llama-foo']);
});

test('AI router supports route-aware priority and fallback', async () => {
  const providers = [
    {id:'p1', model:'m1', enabled:true, primary:true, priority:50, routes:['academic'], secret:'s1'},
    {id:'p2', model:'m2', enabled:true, priority:10, routes:['academic'], secret:'s2'},
    {id:'p3', model:'m3', enabled:true, priority:1, routes:['decision'], secret:'s3'}
  ];
  const ranked = rankProviders(providers, 'academic');
  assert.deepEqual(ranked.map(x=>x.id), ['p1','p2']);
  const out = await invokeAIWithFallback({
    providers, route:'academic', request:{task:'x'}, decrypt:x=>x,
    invoke: async p => { if (p.id==='p1') throw new Error('quota'); return 'OK'; }
  });
  assert.equal(out.result, 'OK');
  assert.equal(out.provider.id, 'p2');
  assert.equal(out.attempts.length, 2);
});

test('workflow can explicitly model approve and return branches', () => {
  const wf={transitions:[
    {from:'SUBMITTED',to:'APPROVED',actionType:'APPROVE',decisionGate:true,aiAssist:true},
    {from:'SUBMITTED',to:'REVISION_REQUIRED',actionType:'RETURN',decisionGate:true,aiAssist:true}
  ]};
  assert.equal(validateTransition(wf,'SUBMITTED','APPROVED').ok,true);
  const back=validateTransition(wf,'SUBMITTED','REVISION_REQUIRED');
  assert.equal(back.ok,true);
  assert.equal(back.transition.actionType,'RETURN');
  assert.equal(back.transition.aiAssist,true);
});

test('V5.1 permissions include organization management and unit scoped research', () => {
  assert.ok(BASE_PERMISSIONS.includes('organization.manage'));
  assert.ok(BASE_PERMISSIONS.includes('research.read.unit'));
});
