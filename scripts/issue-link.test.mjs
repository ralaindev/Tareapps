import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { githubRequest, issueNumbers, run } from './issue-link.mjs';

const event = (action, body, merged = false, base = 'develop') => ({ action, pull_request: { body, merged, number: 20, base: { ref: base } } });

test('extrae solo líneas Closes consecutivas al inicio y elimina duplicados', () => {
  assert.deepEqual(issueNumbers('Closes #15\ncloses #16\nCloses #15\nEjemplo Closes #17\nCloses #0'), [15, 16]);
  assert.deepEqual(issueNumbers('Closes https://github.com/a/b/issues/1'), []);
});

test('el formato de la plantilla se reconoce y se ignora todo tras el bloque inicial', async () => {
  const template = await readFile(new URL('../.github/pull_request_template.md', import.meta.url), 'utf8');
  assert.deepEqual(issueNumbers(template.replace('Closes #NUMERO', 'Closes #123')), [123]);
  assert.deepEqual(issueNumbers('Closes #21\nEjemplo: `\nCloses #15\n`\nCloses #22'), [21]);
  assert.deepEqual(issueNumbers('```\nCloses #1\n```'), []);
  assert.deepEqual(issueNumbers('Closes #3\n<pre>\nCloses #1\n</pre>'), [3]);
  assert.deepEqual(issueNumbers('Closes #21\nComilla literal: \\`\nEjemplo: `\nCloses #15\n`'), [21]);
});

test('exige referencia y comprueba que sea una issue abierta', async () => {
  await assert.rejects(run(event('opened', ''), async () => ({})), /Añade/);
  await assert.rejects(run(event('opened', 'Closes #3'), async () => ({ pull_request: {} })), /PR/);
  await assert.rejects(run(event('opened', 'Closes #3'), async () => ({ state: 'closed' })), /no está abierta/);
});

test('cierra todas las issues solo al fusionar en develop', async () => {
  const calls = [];
  const request = async (method, path, body) => { calls.push([method, path, body]); return { state: 'open' }; };
  await run(event('closed', 'Closes #3\nCloses #4', true), request);
  assert.deepEqual(calls.map(([method]) => method), ['GET', 'GET', 'PATCH', 'PATCH']);
  calls.length = 0;
  await run(event('closed', 'Closes #3', false), request);
  await run(event('closed', 'Closes #3', true, 'main'), request);
  assert.ok(calls.every(([method]) => method === 'GET'));
});

test('permite referenciar en una promoción a main una issue ya cerrada', async () => {
  await run(event('opened', 'Closes #3', false, 'main'), async () => ({ state: 'closed' }));
});

test('una repetición tras un fallo parcial omite issues cerradas y termina las pendientes', async () => {
  const state = new Map([[3, 'open'], [4, 'open']]);
  let failure = true;
  const request = async (method, path) => {
    const id = Number(path.split('/').at(-1));
    if (method === 'GET') return { state: state.get(id) };
    if (id === 4 && failure) { failure = false; throw new Error('fallo temporal'); }
    state.set(id, 'closed');
    return { state: 'closed' };
  };
  const merged = event('closed', 'Closes #3\nCloses #4', true);
  await assert.rejects(run(merged, request), /fallo temporal/);
  assert.equal(state.get(3), 'closed');
  assert.equal(state.get(4), 'open');
  await run(merged, request);
  assert.equal(state.get(4), 'closed');
});

test('reintenta fallos transitorios, pero no errores de permisos', async () => {
  let attempts = 0;
  const fetcher = async () => { attempts += 1; return attempts < 3 ? { ok: false, status: 503 } : { ok: true, json: async () => ({ ok: true }) }; };
  assert.deepEqual(await githubRequest('owner/repo', 'token', 'GET', '/issues/3', undefined, fetcher, async () => {}), { ok: true });
  assert.equal(attempts, 3);
  attempts = 0;
  await assert.rejects(githubRequest('owner/repo', 'token', 'GET', '/issues/3', undefined, async () => { attempts += 1; return { ok: false, status: 403 }; }, async () => {}), /HTTP 403/);
  assert.equal(attempts, 1);
});
