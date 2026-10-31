// Ubuntu + Node 24 + Docker. No SDK, dependencias del proyecto ni credenciales remotas.
import { spawnSync } from 'node:child_process';
import { localConfig } from './client.mjs';

if (process.platform !== 'linux' || Number(process.versions.node.split('.')[0]) !== 24) {
  throw new Error('Este runner requiere Ubuntu/Linux con Node.js 24 y Docker');
}
const version = '2.122.0';
function cli(args, { json = false } = {}) {
  const result = spawnSync('npx', ['--yes', `supabase@${version}`, ...args], {
    encoding: 'utf8', timeout: 900_000, maxBuffer: 16 * 1024 * 1024,
  });
  // Supabase start/status pueden imprimir claves: no reenviar su salida a CI.
  if (result.error || result.status !== 0) {
    throw new Error(`Supabase ${args[0]} falló; salida suprimida para no registrar credenciales locales`);
  }
  if (json) {
    try { return JSON.parse(result.stdout); }
    catch { throw new Error('Supabase status devolvió JSON inválido; salida suprimida'); }
  }
}

let started = false;
try {
  started = true;
  cli(['start']);
  cli(['db', 'reset', '--local', '--yes']);
  cli(['db', 'lint', '--local', '--schema', 'public', '--level', 'warning', '--fail-on', 'warning']);
  const status = cli(['status', '--output', 'json'], { json: true });
  const config = localConfig({ SUPABASE_URL: status.API_URL, SUPABASE_ANON_KEY: status.ANON_KEY ?? status.PUBLISHABLE_KEY });
  const tests = spawnSync(process.execPath, ['--test', 'experiments/cloud/*.test.mjs'], {
    stdio: 'inherit', timeout: 240_000,
    env: { ...process.env, SUPABASE_URL: config.url, SUPABASE_ANON_KEY: config.key },
  });
  if (tests.error || tests.status !== 0) throw new Error('Falló la integración cloud local');
  console.log('Integración cloud local correcta (no producción).');
} finally {
  if (started) cli(['stop', '--no-backup']);
}
