import { randomBytes, randomUUID } from 'node:crypto';

export function localConfig(env = process.env) {
  let url;
  try {
    url = new URL(env.SUPABASE_URL);
  } catch {
    throw new Error('SUPABASE_URL debe ser una URL HTTP loopback explícita');
  }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)
      || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Solo se permite http://127.0.0.1 o http://localhost sin ruta ni credenciales');
  }
  const key = env.SUPABASE_ANON_KEY;
  let publicKey = typeof key === 'string' && /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if (typeof key === 'string' && key.split('.').length === 3) {
    try {
      publicKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon';
    } catch {
      publicKey = false;
    }
  }
  if (!publicKey) throw new Error('SUPABASE_ANON_KEY debe ser publicable o JWT con rol anon');
  return { url: url.origin, key };
}

export function client(config, token) {
  return {
    async request(path, { method = 'GET', body } = {}) {
      const headers = { apikey: config.key, 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else if (!config.key.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${config.key}`;
      let response;
      try {
        response = await fetch(`${config.url}${path}`, {
          method, headers, redirect: 'error', signal: AbortSignal.timeout(20_000),
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch {
        // No incluir headers, tokens, entorno o respuesta Auth en errores del runner.
        throw new Error('Falló HTTP local (conexión, timeout o redirección)');
      }
      const text = await response.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* No imprimir respuesta cruda. */ }
      return { ok: response.ok, status: response.status, data };
    },
    rpc(name, body) {
      return this.request(`/rest/v1/rpc/${name}`, { method: 'POST', body });
    },
    snapshot(table, boardId) {
      const column = table === 'boards' ? 'id' : 'board_id';
      return this.request(`/rest/v1/${table}?${column}=eq.${boardId}&select=*&order=${table === 'board_members' ? 'user_id' : 'id'}`);
    },
  };
}

export async function signUp(config) {
  const anonymous = client(config);
  const result = await anonymous.request('/auth/v1/signup', {
    method: 'POST',
    body: { email: `cloud-${randomUUID()}@example.test`, password: randomBytes(32).toString('base64url') },
  });
  if (!result.ok || typeof result.data?.access_token !== 'string' || !result.data?.user?.id) {
    throw new Error(`Signup local sin sesión (HTTP ${result.status}); comprobar confirmación email desactivada`);
  }
  return { id: result.data.user.id, api: client(config, result.data.access_token) };
}
