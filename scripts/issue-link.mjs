import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';

export function issueNumbers(body) {
  if (/<(?:!--|\/?[a-z][\w:-]*(?:\s|\/?>))/i.test(body ?? '')) {
    throw new Error('El cuerpo no admite etiquetas ni comentarios HTML; usa Markdown sin HTML.');
  }
  const lines = (body ?? '').split(/\r?\n/);
  let fence = null;
  const numbers = lines.flatMap((line) => {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length && new RegExp(`^ {0,3}${marker[0]}{${fence.length},}\\s*$`).test(line)) fence = null;
      return [];
    }
    if (marker) { fence = marker; return []; }
    const match = /^ {0,3}closes[ \t]+#([1-9]\d*)[ \t]*$/i.exec(line);
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

export async function githubRequest(repository, token, method, path, body, fetcher = fetch, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  let response;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetcher(`https://api.github.com/repos/${repository}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (response.ok) return response.json();
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      if (attempt === 2) throw error;
    }
    if (attempt < 2) await pause(1000 * (attempt + 1));
  }
  throw new Error(`GitHub API ${method} ${path}: HTTP ${response?.status ?? 'sin respuesta'}`);
}

async function main() {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const request = (method, path, body) => githubRequest(repository, token, method, path, body);
  await run(event, request);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
