import { execFileSync } from 'node:child_process';

export function localApi(endpoint, method = 'GET', body) {
  const args = ['api', '--method', method, endpoint];
  if (body) args.push('--input', '-');
  const result = execFileSync(process.env.GH_PATH || 'gh', args, {
    encoding: 'utf8', input: body ? JSON.stringify(body) : undefined,
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  return result ? JSON.parse(result) : null;
}

export async function api(endpoint, method = 'GET', body) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('Falta GITHUB_TOKEN.');
  const response = await fetch(`https://api.github.com/${endpoint}`, {
    method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`GitHub API: HTTP ${response.status} en ${method} ${endpoint}`);
  return response.status === 204 ? null : response.json();
}
