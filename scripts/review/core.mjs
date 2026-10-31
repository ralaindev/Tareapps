import { sign, verify } from 'node:crypto';

export const MARKER = '<!-- tareapps-review:v1 -->';
export const CONTEXT = 'AI Review';

export function validateReport(report) {
  if (!report || report.version !== 1 || report.repository !== 'ralaindev/Tareapps'
    || !Number.isSafeInteger(report.pullRequest) || report.pullRequest < 1
    || !/^[a-f0-9]{40}$/.test(report.headSha ?? '') || !/^[a-f0-9]{40}$/.test(report.baseSha ?? '')
    || !['OK', 'CHANGES_REQUIRED'].includes(report.verdict)
    || report.reviewer !== 'tareapps-reviewer' || typeof report.summary !== 'string' || !report.summary.trim()
    || !Number.isFinite(Date.parse(report.reviewedAt))
    || !Array.isArray(report.evidence) || !report.evidence.length
    || !report.evidence.every(item => typeof item === 'string' && item.trim())
    || !Array.isArray(report.findings)
    || !report.findings.every(item => item && ['blocking', 'suggestion'].includes(item.severity)
      && typeof item.description === 'string' && item.description.trim() && typeof item.resolved === 'boolean')) {
    throw new Error('Informe de revisión inválido. No se publica un OK incompleto.');
  }
  if (report.verdict === 'OK' && report.findings.some(item => item.severity === 'blocking' && !item.resolved)) {
    throw new Error('Un informe con bloqueos abiertos no puede ser OK.');
  }
  return report;
}

export function signReport(report, privateKey) {
  validateReport(report);
  const payload = JSON.stringify(report);
  return { payload, signature: sign(null, Buffer.from(payload), privateKey).toString('base64') };
}

export function verifyEnvelope(envelope, publicKey, context, now = Date.now()) {
  try {
    if (typeof envelope?.payload !== 'string' || typeof envelope.signature !== 'string') return null;
    if (!verify(null, Buffer.from(envelope.payload), publicKey, Buffer.from(envelope.signature, 'base64'))) return null;
    const report = validateReport(JSON.parse(envelope.payload));
    if (report.repository !== context.repository || report.pullRequest !== context.pullRequest
      || report.headSha !== context.headSha || report.baseSha !== context.baseSha) return null;
    const age = now - Date.parse(report.reviewedAt);
    if (age < -300_000 || age > 7 * 24 * 3600_000) return null;
    return report;
  } catch { return null; }
}

export function envelopeFromComment(body) {
  if (typeof body !== 'string' || !body.startsWith(`${MARKER}\n`)) return null;
  try { return JSON.parse(body.slice(MARKER.length + 1)); } catch { return null; }
}

export function selectReport(comments, publicKey, context, now = Date.now()) {
  // El custodio publica mediante su cuenta. Copiar una firma pública no permite
  // a otro comentarista convertirla en una nueva decisión del custodio.
  const owner = context.repository.split('/')[0];
  const candidates = comments.filter(comment => comment.user?.login === owner).map(comment => ({
    commentId: comment.id, report: verifyEnvelope(envelopeFromComment(comment.body), publicKey, context, now),
  })).filter(item => item.report);
  candidates.sort((a, b) => Date.parse(b.report.reviewedAt) - Date.parse(a.report.reviewedAt)
    || Number(b.report.verdict === 'CHANGES_REQUIRED') - Number(a.report.verdict === 'CHANGES_REQUIRED'));
  return candidates[0] ?? null;
}
