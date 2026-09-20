import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { invokeAI } from '../src/wires/ai.mjs';
import { BASE_PERMISSIONS } from '../src/core/permissions.mjs';

test('OpenAI Responses uses a valid data URI for input_file', async () => {
  const oldFetch = globalThis.fetch;
  let payload;
  globalThis.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return { ok: true, status: 200, text: async () => JSON.stringify({ output_text: 'OK' }) };
  };
  try {
    const out = await invokeAI({ kind:'openai', model:'gpt-5.6-luna', capabilities:{}, generation:{} }, 'test-key', {
      task:'Đọc file', content:'Phân tích', attachments:[{name:'test.pdf',mimeType:'application/pdf',base64:Buffer.from('%PDF-test').toString('base64')}]
    });
    assert.equal(out, 'OK');
    const file = payload.input[0].content.find(x => x.type === 'input_file');
    assert.ok(file);
    assert.match(file.file_data, /^data:application\/pdf;base64,/);
    assert.equal(file.detail, 'auto');
  } finally { globalThis.fetch = oldFetch; }
});

test('governance approval permissions exist', () => {
  for (const p of ['research.approve.level2','research.approve.level3','research.approve.level4','scientific.profile.export','scientific.profile.approve']) {
    assert.ok(BASE_PERMISSIONS.includes(p), p);
  }
});

test('V5.4 UI exposes scientific profile export and workflow dashboard', () => {
  const app = fs.readFileSync(path.resolve('public/app.js'),'utf8');
  assert.match(app,/Xuất Lý lịch khoa học/);
  assert.match(app,/Luồng hồ sơ đang chạy/);
  assert.match(app,/research\.approve\.level2/);
  assert.match(app,/research\.approve\.level3/);
  assert.match(app,/research\.approve\.level4/);
});
