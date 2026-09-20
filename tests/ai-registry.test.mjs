import test from 'node:test';
import assert from 'node:assert/strict';
import { invokeAI, normalizeModelCapabilities, normalizeGenerationSettings, listProviderModels } from '../src/wires/ai.mjs';

test('model capabilities normalize to safe defaults',()=>{
  const c=normalizeModelCapabilities({reasoning:true});
  assert.equal(c.chat,true);
  assert.equal(c.reasoning,true);
  assert.equal(c.temperature,false);
  assert.equal(c.vision,false);
});

test('generation settings are safe by default',()=>{
  const g=normalizeGenerationSettings({});
  assert.equal(g.useTemperature,false);
  assert.equal(g.useMaxTokens,false);
});

test('OpenAI Responses payload omits temperature unless capability confirmed',async()=>{
  const original=globalThis.fetch;
  let sent;
  globalThis.fetch=async(_url,opts)=>{
    sent=JSON.parse(opts.body);
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'OK'}]}]}),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const provider={kind:'openai',model:'model-x',capabilities:{temperature:false},generation:{useTemperature:true,temperature:0.2}};
    const out=await invokeAI(provider,'key',{task:'test',content:'x'});
    assert.equal(out,'OK');
    assert.equal('temperature' in sent,false);
  } finally { globalThis.fetch=original; }
});

test('OpenAI Responses payload includes temperature only when explicitly enabled and supported',async()=>{
  const original=globalThis.fetch;
  let sent;
  globalThis.fetch=async(_url,opts)=>{
    sent=JSON.parse(opts.body);
    return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'OK'}]}]}),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const provider={kind:'openai',model:'model-x',capabilities:{temperature:true},generation:{useTemperature:true,temperature:0.2}};
    await invokeAI(provider,'key',{task:'test',content:'x'});
    assert.equal(sent.temperature,0.2);
  } finally { globalThis.fetch=original; }
});

test('model discovery maps OpenAI-compatible model list',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({data:[{id:'gpt-test-1',owned_by:'lab'},{id:'o3-test'}]}),{status:200,headers:{'content-type':'application/json'}});
  try{
    const models=await listProviderModels({kind:'openai'},'key');
    assert.deepEqual(models.map(x=>x.id),['gpt-test-1','o3-test']);
  } finally { globalThis.fetch=original; }
});
