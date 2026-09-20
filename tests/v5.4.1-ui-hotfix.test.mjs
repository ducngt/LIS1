import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

test('research list functions exist for dashboard and research route', () => {
  assert.match(app, /function researchRows\(list\)/);
  assert.match(app, /async function research\(\)/);
  assert.match(app, /function researchModal\(types,orgs\)/);
  assert.match(app, /async function openResearch\(id\)/);
});

test('router references are backed by functions', () => {
  assert.match(app, /if\(route==='research'\)return research\(\)/);
  assert.match(app, /researchRows\(d\.recent\)/);
});
