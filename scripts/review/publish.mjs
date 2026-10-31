import { readFileSync } from 'node:fs';
import { MARKER, signReport } from './core.mjs';
import { localApi } from './github.mjs';

const [reportPath, keyPath] = process.argv.slice(2);
if (!reportPath || !keyPath) throw new Error('Uso: node scripts/review/publish.mjs <informe.json> <clave-privada-externa>');
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const pr = localApi(`repos/ralaindev/Tareapps/pulls/${report.pullRequest}`);
if (pr.state !== 'open' || pr.head.sha !== report.headSha || pr.base.sha !== report.baseSha) {
  throw new Error('La PR ha cambiado o está cerrada. Repite la revisión antes de firmar.');
}
const envelope = signReport(report, readFileSync(keyPath, 'utf8'));
const comment = localApi(`repos/ralaindev/Tareapps/issues/${report.pullRequest}/comments`, 'POST', {
  body: `${MARKER}\n${JSON.stringify(envelope)}`,
});
console.log(`Revisión ${report.verdict} firmada y publicada: ${comment.html_url}`);
