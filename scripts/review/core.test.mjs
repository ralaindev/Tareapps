import { generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MARKER, signReport, verifyEnvelope, validateReport, envelopeFromComment, selectReport } from './core.mjs';
import { evaluatePullRequest } from './evaluate.mjs';

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

function comment(id, value, login = 'ralaindev') {
  return { id, user: { login }, body: `${MARKER}\n${JSON.stringify(signReport(value, keys.privateKey))}` };
}
test('OK → rechazo firmado → copia pública del OK no recupera la aprobación', () => {
  const first = { ...report, reviewedAt: new Date(Date.now() - 10_000).toISOString() };
  const rejection = { ...report, verdict: 'CHANGES_REQUIRED' };
  const comments = [comment(1, first), comment(2, rejection), comment(3, first, 'outsider')];
  assert.equal(selectReport(comments, keys.publicKey, context)?.report.verdict, 'CHANGES_REQUIRED');
  // Ni un replay del custodio con fecha vieja cambia la precedencia firmada.
  assert.equal(selectReport([...comments, comment(4, first)], keys.publicKey, context)?.report.verdict, 'CHANGES_REQUIRED');
});
test('un extraño no republica una aprobación eliminada ni revoca sin firma', () => {
  assert.equal(selectReport([comment(1, report, 'outsider')], keys.publicKey, context), null);
  assert.equal(selectReport([{ id: 2, user: { login: 'ralaindev' }, body: 'OK' }], keys.publicKey, context), null);
  const refusal = comment(3, { ...report, verdict: 'CHANGES_REQUIRED' });
  assert.equal(selectReport([comment(1, report), refusal], keys.publicKey, context)?.report.verdict, 'CHANGES_REQUIRED');
});
test('reevaluación falla cerrada ante API caída o clave ilegible después de un verde', async () => {
  for (const failure of ['api', 'key']) {
    const states = ['success'];
    const api = async (endpoint, method, body) => {
      if (endpoint.includes('/statuses/')) { states.push(body.state); return {}; }
      if (endpoint.endsWith('/pulls/6')) return { state: 'open', head: { sha: context.headSha }, base: { ref: 'develop' }, html_url: 'https://github.com/ralaindev/Tareapps/pull/6' };
      throw new Error('API no disponible');
    };
    await assert.rejects(evaluatePullRequest(api, context.repository, 6, () => {
      if (failure === 'key') throw new Error('Clave no legible');
      return keys.publicKey;
    }));
    assert.deepEqual(states, ['success', 'pending', 'failure']);
  }
});
test('si tampoco se puede publicar el fallo, pending invalida el verde anterior', async () => {
  const states = ['success'];
  const api = async (endpoint, method, body) => {
    if (endpoint.includes('/statuses/') && body.state === 'pending') { states.push('pending'); return {}; }
    if (endpoint.endsWith('/pulls/6')) return { state: 'open', head: { sha: context.headSha }, base: { ref: 'develop' } };
    throw new Error('API no disponible');
  };
  await assert.rejects(evaluatePullRequest(api, context.repository, 6, () => keys.publicKey));
  assert.equal(states.at(-1), 'pending');
});
