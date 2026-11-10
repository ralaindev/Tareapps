import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';

export function issueNumbers(body) {
  const lines = (body ?? '').split(/\r?\n/);
  let fenced = false;
  let comment = false;
  const numbers = lines.flatMap((line) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return []; }
    if (fenced) return [];
    if (comment) { if (line.includes('-->')) comment = false; return []; }
    if (line.includes('<!--')) { comment = !line.includes('-->'); return []; }
    const match = /^\s*closes\s+#([1-9]\d*)\s*$/i.exec(line);
    return match ? [Number(match[1])] : [];
  });
  return [...new Set(numbers)];
}

export async function run(event, request) {
  const pr = event.pull_request;
  const numbers = issueNumbers(pr.body);
  const alreadyClosed = new Set();
  if (!numbers.length) throw new Error('Añade al cuerpo una línea como Closes #123 por cada issue.');
  for (const number of numbers) {
    const issue = await request('GET', `/issues/${number}`);
    if (issue.pull_request) throw new Error(`#${number} es una PR, no una issue.`);
    if (issue.state !== 'open') {
      if (event.action === 'closed' && pr.merged) alreadyClosed.add(number);
      else if (pr.base.ref === 'develop') throw new Error(`La issue #${number} no está abierta.`);
    }
  }
  if (event.action === 'closed' && pr.merged && pr.base.ref === 'develop') {
    for (const number of numbers) {
      if (alreadyClosed.has(number)) continue;
      await request('PATCH', `/issues/${number}`, { state: 'closed', state_reason: 'completed' });
      console.log(`Issue #${number} cerrada tras el merge de la PR #${pr.number}.`);
    }
  } else {
    console.log(`Referencias válidas: ${numbers.map((n) => `#${n}`).join(', ')}.`);
  }
}

async function main() {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const request = async (method, path, body) => {
    const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`GitHub API ${method} ${path}: HTTP ${response.status}`);
    return response.json();
  };
  await run(event, request);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
