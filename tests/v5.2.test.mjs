import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { saveAndExtractDocuments } from '../src/wires/document.mjs';

function file(name,text){return {name,type:'text/plain',base64:Buffer.from(text,'utf8').toString('base64')}}

test('V5.2 document wire supports multiple files in one capability call', async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nute-v52-'));
  const docs=await saveAndExtractDocuments({uploadsDir:dir,files:[file('a.txt','alpha'),file('b.md','beta')],prefix:'test'});
  assert.equal(docs.length,2);
  assert.equal(docs[0].extractionStatus,'EXTRACTED');
  assert.match(docs[0].extractedText,/alpha/);
  assert.match(docs[1].extractedText,/beta/);
});

test('V5.2 UI exposes personnel directory and scientific profile',()=>{
  const ui=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(ui,/Danh sách cán bộ \/ GV \/ SV/);
  assert.match(ui,/Hồ sơ khoa học/);
  assert.match(ui,/scientific-profile\/me\/sync/);
});

test('V5.2 AI analysis accepts user file attachments',()=>{
  const server=fs.readFileSync(new URL('../src/server.mjs',import.meta.url),'utf8');
  assert.match(server,/prefix:'copilot'/);
  assert.match(server,/prefix:'academic'/);
  assert.match(server,/combineDocuments/);
});

test('V5.2 knowledge and workflow use source document arrays',()=>{
  const server=fs.readFileSync(new URL('../src/server.mjs',import.meta.url),'utf8');
  assert.match(server,/sourceDocuments/);
  assert.match(server,/knowledge\.ai\.analyze/);
  assert.match(server,/workflowSourceDocuments/);
});

test('V5.2 schema includes personnel and scientific profiles',()=>{
  const store=fs.readFileSync(new URL('../src/lib/store.mjs',import.meta.url),'utf8');
  assert.match(store,/schemaVersion: [789]/);
  assert.match(store,/personnel: \[\]/);
  assert.match(store,/scientificProfiles: \[\]/);
});
