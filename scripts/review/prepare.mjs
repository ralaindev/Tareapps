import { writeFileSync, mkdirSync } from 'node:fs';
import { localApi } from './github.mjs';

const number = Number(process.argv[2]);
if (!Number.isSafeInteger(number) || number < 1) throw new Error('Uso: node scripts/review/prepare.mjs <PR>');
const pr = localApi(`repos/ralaindev/Tareapps/pulls/${number}`);
if (pr.state !== 'open') throw new Error('La PR no está abierta.');
mkdirSync('.reviews', { recursive: true });
writeFileSync(`.reviews/pr-${number}.json`, `${JSON.stringify({
  version: 1, repository: 'ralaindev/Tareapps', pullRequest: number,
  headSha: pr.head.sha, baseSha: pr.base.sha, reviewer: 'tareapps-reviewer',
  reviewedAt: new Date().toISOString(), verdict: 'CHANGES_REQUIRED',
  summary: 'Pendiente de revisión independiente del agente.',
  evidence: [], findings: [],
}, null, 2)}\n`, { flag: 'wx' });
console.log(`Preparado .reviews/pr-${number}.json (no es un OK). Revisa todo el diff antes de completarlo.`);
