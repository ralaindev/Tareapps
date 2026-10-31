// Solo ejecutar desde la rama main confiable. Nunca checkout ni ejecutar código de la PR.
import { readFileSync } from 'node:fs';
import { api } from './github.mjs';
import { CONTEXT, envelopeFromComment, verifyEnvelope } from './core.mjs';

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const repository = process.env.GITHUB_REPOSITORY;
if (repository !== 'ralaindev/Tareapps') throw new Error('Repositorio no autorizado.');
const publicKey = readFileSync('.github/review-public-key.pem', 'utf8');
const eventName = process.env.GITHUB_EVENT_NAME;
let numbers;
if (event.pull_request) numbers = [event.pull_request.number];
else if (event.issue?.pull_request) numbers = [event.issue.number];
else if (eventName === 'issue_comment') numbers = [];
else {
  numbers = [];
  for (let page = 1; ; page++) {
    const items = await api(`repos/${repository}/pulls?state=open&per_page=100&page=${page}`);
    numbers.push(...items.map(item => item.number));
    if (items.length < 100) break;
  }
}
for (const number of numbers) {
  const pr = await api(`repos/${repository}/pulls/${number}`);
  if (pr.state !== 'open' || !['main', 'develop'].includes(pr.base.ref)) continue;
  // Leer la rama actual, no el SHA posiblemente obsoleto incluido en el webhook.
  const base = await api(`repos/${repository}/git/ref/heads/${pr.base.ref}`);
  const context = { repository, pullRequest: number, headSha: pr.head.sha, baseSha: base.object.sha };
  const comments = [];
  for (let page = 1; ; page++) {
    const batch = await api(`repos/${repository}/issues/${number}/comments?per_page=100&page=${page}`);
    comments.push(...batch);
    if (batch.length < 100) break;
  }
  let report = null;
  let reportCommentId;
  for (const comment of comments.reverse()) {
    report = verifyEnvelope(envelopeFromComment(comment.body), publicKey, context);
    if (report) { reportCommentId = comment.id; break; }
  }
  // Evitar publicar sobre contexto viejo si cambió mientras se consultaban comentarios.
  const latest = await api(`repos/${repository}/pulls/${number}`);
  const latestBase = await api(`repos/${repository}/git/ref/heads/${pr.base.ref}`);
  if (latest.head.sha !== pr.head.sha || latestBase.object.sha !== base.object.sha) {
    throw new Error('Contexto cambió durante el control; volver a ejecutar.');
  }
  await api(`repos/${repository}/statuses/${pr.head.sha}`, 'POST', {
    context: CONTEXT, state: report?.verdict === 'OK' ? 'success' : 'failure',
    description: report ? `Revisión firmada: ${report.verdict}` : 'Falta revisión firmada válida del HEAD y base actuales',
    target_url: reportCommentId ? `${pr.html_url}#issuecomment-${reportCommentId}` : pr.html_url,
  });
  console.log(`PR #${number}: ${report?.verdict ?? 'REVIEW_REQUIRED'}`);
}
