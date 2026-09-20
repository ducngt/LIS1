import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { saveAndExtractDocument, storedDocumentToAIFile } from '../src/wires/document.mjs';

test('V5.3 legacy failed PDF remains AI-native readable', async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nute-v53-'));
  const raw=Buffer.from('%PDF-1.4\n% minimal test');
  const fileName='legacy.pdf';
  fs.writeFileSync(path.join(dir,fileName),raw);
  const ai=storedDocumentToAIFile(dir,{fileUrl:`/uploads/${fileName}`,originalName:'legacy.pdf',mimeType:'application/pdf',extractionStatus:'FAILED'});
  assert.equal(ai.name,'legacy.pdf');
  assert.equal(ai.mimeType,'application/pdf');
  assert.ok(ai.base64.length>0);
});

test('V5.3 text document remains locally extractable', async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nute-v53-text-'));
  const d=await saveAndExtractDocument({uploadsDir:dir,file:{name:'note.txt',type:'text/plain',base64:Buffer.from('NUTE RIS document intelligence').toString('base64')}});
  assert.equal(d.extractionStatus,'EXTRACTED');
  assert.equal(d.analysisReady,true);
  assert.match(d.extractedText,/document intelligence/);
});

test('V5.3 AI wire supports native PDF payloads for OpenAI Gemini Anthropic',()=>{
  const ai=fs.readFileSync(new URL('../src/wires/ai.mjs',import.meta.url),'utf8');
  assert.match(ai,/input_file/);
  assert.match(ai,/inlineData/);
  assert.match(ai,/type: 'document'/);
});

test('V5.3 workflow and knowledge can pass stored PDFs directly to AI',()=>{
  const server=fs.readFileSync(new URL('../src/server.mjs',import.meta.url),'utf8');
  assert.match(server,/storedDocumentToAIFile/);
  assert.match(server,/attachments:nativeAttachments/);
  assert.match(server,/AI_NATIVE_READY|nativeAiReadable/);
});

test('V5.3 scientific profile sync aggregates RIS activity and identity',()=>{
  const server=fs.readFileSync(new URL('../src/server.mjs',import.meta.url),'utf8');
  assert.match(server,/publicationCount/);
  assert.match(server,/intellectualPropertyCount/);
  assert.match(server,/verifiedEvidenceCount/);
  assert.match(server,/personnelCode/);
  assert.match(server,/lastSyncedAt/);
});

import { invokeAI } from '../src/wires/ai.mjs';

test('V5.3 OpenAI Responses sends PDF as input_file', async()=>{
  const prior=globalThis.fetch; let body;
  globalThis.fetch=async(_url,opts)=>{body=JSON.parse(opts.body);return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'OK'}]}]}),{status:200,headers:{'content-type':'application/json'}})};
  try{
    const out=await invokeAI({kind:'openai',model:'gpt-test',capabilities:{},generation:{}},'key',{task:'read',content:'',attachments:[{name:'policy.pdf',mimeType:'application/pdf',base64:'JVBERi0xLjQ='}]});
    assert.equal(out,'OK');
    const parts=body.input[0].content;
    assert.ok(parts.some(x=>x.type==='input_file'&&x.filename==='policy.pdf'));
  } finally {globalThis.fetch=prior;}
});

test('V5.3 Gemini sends PDF as inlineData', async()=>{
  const prior=globalThis.fetch; let body;
  globalThis.fetch=async(_url,opts)=>{body=JSON.parse(opts.body);return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'OK'}]}}]}),{status:200,headers:{'content-type':'application/json'}})};
  try{
    const out=await invokeAI({kind:'gemini',model:'gemini-test',capabilities:{},generation:{}},'key',{task:'read',content:'',attachments:[{name:'policy.pdf',mimeType:'application/pdf',base64:'JVBERi0xLjQ='}]});
    assert.equal(out,'OK');
    assert.ok(body.contents[0].parts.some(x=>x.inlineData?.mimeType==='application/pdf'));
  } finally {globalThis.fetch=prior;}
});
