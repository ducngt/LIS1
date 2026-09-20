import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hashPassword, verifyPassword, createSecretCipher } from '../src/lib/security.mjs';
import { validateTransition, missingEvidence } from '../src/core/workflow.mjs';

test('password hashing verifies correct password only', () => {
  const h = hashPassword('StrongPass123');
  assert.equal(verifyPassword('StrongPass123', h), true);
  assert.equal(verifyPassword('WrongPass123', h), false);
});

test('secret encryption round-trip', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nute-'));
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  const c = createSecretCipher(dir);
  const encrypted = c.encrypt('secret-api-key');
  assert.notEqual(encrypted.ciphertext, 'secret-api-key');
  assert.equal(c.decrypt(encrypted), 'secret-api-key');
});

test('workflow transition and evidence rules', () => {
  const wf = { transitions: [{ from: 'DRAFT', to: 'SUBMITTED', requiredEvidence: ['REGISTRATION'] }] };
  const v = validateTransition(wf, 'DRAFT', 'SUBMITTED');
  assert.equal(v.ok, true);
  const db = { evidence: [] };
  assert.deepEqual(missingEvidence(db, 'r1', v.transition), ['REGISTRATION']);
  db.evidence.push({ researchId: 'r1', code: 'REGISTRATION', status: 'SUBMITTED' });
  assert.deepEqual(missingEvidence(db, 'r1', v.transition), []);
});
