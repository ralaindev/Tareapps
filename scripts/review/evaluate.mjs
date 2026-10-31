import { CONTEXT, selectReport } from './core.mjs';

export async function evaluatePullRequest(api, repository, number, getPublicKey) {
  const pr = await api(`repos/${repository}/pulls/${number}`);
  if (pr.state !== 'open' || !['main', 'develop'].includes(pr.base.ref)) return;
  const statusEndpoint = `repos/${repository}/statuses/${pr.head.sha}`;
  // Invalidar antes de leer clave, base o comentarios. Si luego falla API/IO,
  // el éxito anterior ya no satisface el check requerido.
  await api(statusEndpoint, 'POST', { context: CONTEXT, state: 'pending',
    description: 'Reevaluando revisión firmada; el OK previo no es reutilizable', target_url: pr.html_url });
  try {
    const publicKey = getPublicKey();
    const base = await api(`repos/${repository}/git/ref/heads/${pr.base.ref}`);
    const context = { repository, pullRequest: number, headSha: pr.head.sha, baseSha: base.object.sha };
    const comments = [];
    for (let page = 1; ; page++) {
      const batch = await api(`repos/${repository}/issues/${number}/comments?per_page=100&page=${page}`);
      comments.push(...batch);
      if (batch.length < 100) break;
    }
    const selected = selectReport(comments, publicKey, context);
    const latest = await api(`repos/${repository}/pulls/${number}`);
    const latestBase = await api(`repos/${repository}/git/ref/heads/${pr.base.ref}`);
    if (latest.head.sha !== pr.head.sha || latestBase.object.sha !== base.object.sha) {
      throw new Error('Contexto cambió durante el control; volver a ejecutar.');
    }
    await api(statusEndpoint, 'POST', {
      context: CONTEXT, state: selected?.report.verdict === 'OK' ? 'success' : 'failure',
      description: selected ? `Revisión firmada: ${selected.report.verdict}` : 'Falta revisión firmada válida del HEAD y base actuales',
      target_url: selected ? `${pr.html_url}#issuecomment-${selected.commentId}` : pr.html_url,
    });
    console.log(`PR #${number}: ${selected?.report.verdict ?? 'REVIEW_REQUIRED'}`);
  } catch (error) {
    // Si GitHub no admite otra escritura, el pending previo sigue bloqueando.
    try { await api(statusEndpoint, 'POST', { context: CONTEXT, state: 'failure',
      description: 'Error verificando revisión; no se conserva una aprobación anterior', target_url: pr.html_url }); } catch { /* Pending remains. */ }
    throw error;
  }
}
