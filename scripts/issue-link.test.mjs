import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { issueNumbers, run } from './issue-link.mjs';

const event = (action, body, merged = false, base = 'develop') => ({ action, pull_request: { body, merged, number: 20, base: { ref: base } } });

test('extrae líneas Closes y elimina duplicados, no acepta enlaces ni referencias en texto', () => {
  assert.deepEqual(issueNumbers('Closes #15\ncloses #16\nCloses #15\nEjemplo Closes #17\nCloses #0'), [15, 16]);
  assert.deepEqual(issueNumbers('Closes https://github.com/a/b/issues/1'), []);
});

test('el formato de la plantilla se reconoce y se ignoran ejemplos ocultos', async () => {
  const template = await readFile(new URL('../.github/pull_request_template.md', import.meta.url), 'utf8');
  assert.deepEqual(issueNumbers(template.replace('Closes #NUMERO', 'Closes #123')), [123]);
  assert.deepEqual(issueNumbers('```\nCloses #1\n```\n<!--\nCloses #2\n-->\nCloses #3'), [3]);
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
