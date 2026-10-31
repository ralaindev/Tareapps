import assert from 'node:assert/strict';
import test from 'node:test';
import { localConfig } from './client.mjs';

test('el cliente solo admite HTTP loopback y clave pública', () => {
  const key = 'sb_publishable_example';
  for (const url of ['http://127.0.0.1:54321', 'http://localhost:54321/']) {
    assert.equal(localConfig({ SUPABASE_URL: url, SUPABASE_ANON_KEY: key }).key, key);
  }
  for (const url of [undefined, 'https://example.supabase.co', 'http://192.168.1.2',
    'https://localhost', 'http://localhost.evil.test', 'http://user:pass@localhost',
    'http://localhost/path', 'http://localhost?x=1', 'http://localhost/#x']) {
    assert.throws(() => localConfig({ SUPABASE_URL: url, SUPABASE_ANON_KEY: key }));
  }
  const jwt = (role) => `e30.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
  assert.equal(localConfig({ SUPABASE_URL: 'http://localhost', SUPABASE_ANON_KEY: jwt('anon') }).key, jwt('anon'));
  for (const secret of [undefined, '', 'sb_secret_example', jwt('service_role'), 'bad.jwt.key']) {
    assert.throws(() => localConfig({ SUPABASE_URL: 'http://localhost', SUPABASE_ANON_KEY: secret }));
  }
});
