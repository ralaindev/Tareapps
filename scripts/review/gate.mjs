// Solo ejecutar desde la rama main confiable. Nunca checkout ni ejecutar código de la PR.
import { readFileSync } from 'node:fs';
import { api } from './github.mjs';
import { evaluatePullRequest } from './evaluate.mjs';

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const repository = process.env.GITHUB_REPOSITORY;
if (repository !== 'ralaindev/Tareapps') throw new Error('Repositorio no autorizado.');
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
  await evaluatePullRequest(api, repository, number, () => readFileSync('.github/review-public-key.pem', 'utf8'));
}
