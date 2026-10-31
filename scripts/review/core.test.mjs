import { generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signReport, verifyEnvelope, validateReport, envelopeFromComment } from './core.mjs';

const keys = generateKeyPairSync('ed25519');
const context = { repository: 'ralaindev/Tareapps', pullRequest: 6, headSha: 'a'.repeat(40), baseSha: 'b'.repeat(40) };
const report = { ...context, version: 1, reviewer: 'tareapps-reviewer', reviewedAt: new Date().toISOString(),
  verdict: 'OK', summary: 'Diff completo revisado, sin bloqueos.', evidence: ['Tests correctos'], findings: [] };
test('firma válida para el contexto exacto', () => {
  assert.equal(verifyEnvelope(signReport(report, keys.privateKey), keys.publicKey, context)?.verdict, 'OK');
});
test('modificar el informe o usar otra clave no fabrica un OK', () => {
  const envelope = signReport(report, keys.privateKey);
  assert.equal(verifyEnvelope({ ...envelope, payload: envelope.payload.replace('correctos', 'falsos') }, keys.publicKey, context), null);
  assert.equal(verifyEnvelope(envelope, generateKeyPairSync('ed25519').publicKey, context), null);
});
test('head, base, PR y repositorio distintos invalidan la revisión', () => {
  const envelope = signReport(report, keys.privateKey);
  for (const field of Object.keys(context)) {
    const value = field === 'pullRequest' ? 7 : 'c'.repeat(40);
    assert.equal(verifyEnvelope(envelope, keys.publicKey, { ...context, [field]: value }), null);
  }
});
test('ausencia, formato inválido, caducidad y fecha futura no pasan', () => {
  assert.equal(envelopeFromComment('OK'), null);
  assert.equal(verifyEnvelope({}, keys.publicKey, context), null);
  const envelope = signReport(report, keys.privateKey);
  assert.equal(verifyEnvelope(envelope, keys.publicKey, context, Date.now() + 8 * 86400_000), null);
  assert.equal(verifyEnvelope(envelope, keys.publicKey, context, Date.now() - 600_000), null);
});
test('informe vacío o con bloqueos abiertos no puede ser OK', () => {
  assert.throws(() => validateReport({ ...report, evidence: [] }));
  assert.throws(() => validateReport({ ...report, findings: [{ severity: 'blocking', description: 'Bug', resolved: false }] }));
  assert.equal(verifyEnvelope(signReport({ ...report, verdict: 'CHANGES_REQUIRED' }, keys.privateKey), keys.publicKey, context)?.verdict, 'CHANGES_REQUIRED');
});
