import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { client, localConfig, signUp } from './client.mjs';

function success(response) {
  assert.equal(response.ok, true, `HTTP ${response.status}, SQLSTATE ${response.data?.code ?? 'n/a'}`);
  return response.data;
}

function denied(response, code) {
  assert.equal(response.ok, false, 'La solicitud debía rechazarse');
  if (code) assert.equal(response.data?.code, code);
  else assert.ok([401, 403].includes(response.status), `HTTP inesperado ${response.status}`);
}

function operation(boardId, taskId, action = 'create', version = 0, data = { title: ' Tarea compartida ', status: 'pending' }) {
  return {
    p_board_id: boardId, p_task_id: taskId, p_operation_id: randomUUID(),
    p_action: action, p_expected_version: version, p_data: data,
  };
}

test('Auth real, RLS y RPC de tareas compartidas', { timeout: 180_000 }, async (t) => {
  // Falta de entorno es fallo, nunca skip ni falso positivo de integración.
  const config = localConfig();
  const anonymous = client(config);
  const a = await signUp(config);
  const b = await signUp(config);
  const outsider = await signUp(config);
  const board = success(await a.api.rpc('cloud_create_board', { p_name: ' Experimento A/B ' }));
  const otherBoard = success(await outsider.api.rpc('cloud_create_board', { p_name: 'Ajeno' }));
  const taskId = randomUUID();
  const create = operation(board, taskId);
  let created;
  let retryB;

  await t.test('solo propietario comparte, no puede revocarse y no hay writes directas', async () => {
    const member = { p_board_id: board, p_user_id: b.id, p_active: true };
    denied(await b.api.rpc('cloud_set_member', member), '42501');
    denied(await outsider.api.rpc('cloud_set_member', member), '42501');
    success(await a.api.rpc('cloud_set_member', member));
    denied(await b.api.rpc('cloud_set_member', { ...member, p_user_id: outsider.id }), '42501');
    denied(await a.api.rpc('cloud_set_member', { ...member, p_user_id: a.id, p_active: false }), '22023');
    for (const [table, body, filter] of [
      ['boards', { id: randomUUID(), owner_id: a.id, name: 'Bypass' }, `id=eq.${board}`],
      ['board_members', { board_id: board, user_id: outsider.id, active: true }, `board_id=eq.${board}`],
      ['tasks', { id: randomUUID(), board_id: board, title: 'Bypass', status: 'pending' }, `board_id=eq.${board}`],
    ]) {
      for (const api of [a.api, b.api, anonymous]) {
        denied(await api.request(`/rest/v1/${table}`, { method: 'POST', body }));
        denied(await api.request(`/rest/v1/${table}?${filter}`, { method: 'PATCH', body }));
        denied(await api.request(`/rest/v1/${table}?${filter}`, { method: 'DELETE' }));
      }
    }
    denied(await anonymous.rpc('cloud_create_board', { p_name: 'Anon' }));
    denied(await anonymous.rpc('cloud_set_member', member));
    denied(await anonymous.rpc('cloud_apply_task', create));
    denied(await outsider.api.rpc('cloud_apply_task', create), '42501');
  });

  await t.test('create y retry idéntico, payload distinto rechazado y snapshot aislado', async () => {
    created = success(await a.api.rpc('cloud_apply_task', create));
    assert.equal(created.outcome, 'applied');
    assert.equal(created.task.title, 'Tarea compartida');
    assert.equal(created.task.version, 1);
    assert.deepEqual(success(await a.api.rpc('cloud_apply_task', create)), created);
    denied(await a.api.rpc('cloud_apply_task', { ...create, p_data: { title: 'Otro', status: 'pending' } }), '22023');
    for (const table of ['boards', 'board_members', 'tasks']) {
      const rows = success(await b.api.snapshot(table, board));
      assert.equal(rows.length, table === 'board_members' ? 2 : 1);
      assert.deepEqual(success(await outsider.api.snapshot(table, board)), []);
      assert.deepEqual(success(await a.api.snapshot(table, otherBoard)), []);
      denied(await anonymous.snapshot(table, board));
    }
    denied(await b.api.rpc('cloud_apply_task', { ...create, p_board_id: otherBoard }), '42501');
    // Tablero accesible pero UUID perteneciente a otro: tampoco filtra o modifica la fila.
    const ownB = success(await b.api.rpc('cloud_create_board', { p_name: 'Personal B' }));
    const collision = success(await b.api.rpc('cloud_apply_task', operation(ownB, taskId)));
    assert.deepEqual(collision, { outcome: 'conflict', task: null });
    denied(await b.api.rpc('cloud_apply_task', operation(ownB, taskId, 'delete', 1, {})), 'P0002');
    // La misma identidad actor/op no se puede trasladar a otro tablero accesible.
    const ownA = success(await a.api.rpc('cloud_create_board', { p_name: 'Personal A' }));
    denied(await a.api.rpc('cloud_apply_task', { ...create, p_board_id: ownA }), '22023');
  });

  await t.test('límites, tipos, campos servidor y versiones inválidas se rechazan sin mutación', async () => {
    for (const data of [
      { title: ' \t\n ', status: 'pending' }, { title: 'x'.repeat(121), status: 'pending' },
      { title: 'x', description: 'd'.repeat(2001), status: 'pending' },
      { title: 'x', status: 'in_course' }, { title: null, status: 'pending' },
      { title: 7, status: 'pending' }, { title: 'x', status: 'pending', description: null },
      { title: 'x', status: 'pending', version: 900 },
      { title: 'x', status: 'pending', board_id: otherBoard },
      { title: 'x', status: 'pending', deleted_at: null }, [], null,
    ]) {
      denied(await b.api.rpc('cloud_apply_task', operation(board, taskId, 'update', 1, data)), '22023');
    }
    for (const version of [null, -1, 0]) {
      denied(await b.api.rpc('cloud_apply_task', operation(board, taskId, 'update', version)), '22023');
    }
    denied(await b.api.rpc('cloud_apply_task', operation(board, randomUUID(), 'create', 1)), '22023');
    denied(await b.api.rpc('cloud_apply_task', operation(board, taskId, 'update', 1.5)), '22P02');
    denied(await b.api.rpc('cloud_apply_task', { ...operation(board, taskId), p_operation_id: 'invalid-uuid' }), '22P02');
    assert.equal(success(await b.api.snapshot('tasks', board))[0].version, 1);
    const boundary = success(await b.api.rpc('cloud_apply_task', operation(board, randomUUID(), 'create', 0,
      { title: 'x'.repeat(120), description: 'd'.repeat(2000), status: 'done' })));
    assert.equal(boundary.outcome, 'applied');
  });

  let winningUpdate;
  await t.test('dos clientes concurrentes: exactamente un update gana; conflicto estable y sin overwrite', async () => {
    const ops = ['A', 'B'].map((name) => operation(board, taskId, 'update', 1,
      { title: `Cambio ${name}`, description: name, status: 'in_progress' }));
    const results = await Promise.all([a.api.rpc('cloud_apply_task', ops[0]), b.api.rpc('cloud_apply_task', ops[1])]);
    const values = results.map(success);
    assert.deepEqual(values.map((v) => v.outcome).sort(), ['applied', 'conflict']);
    winningUpdate = values.find((v) => v.outcome === 'applied');
    assert.equal(winningUpdate.task.version, 2);
    for (let i = 0; i < ops.length; i++) {
      assert.deepEqual(success(await [a.api, b.api][i].rpc('cloud_apply_task', ops[i])), values[i]);
    }
    const stale = operation(board, taskId, 'update', 1, { title: 'Obsoleto', status: 'done' });
    const conflict = success(await b.api.rpc('cloud_apply_task', stale));
    assert.equal(conflict.outcome, 'conflict');
    assert.deepEqual(conflict.task, winningUpdate.task);
    assert.deepEqual(success(await a.api.snapshot('tasks', board)).find((row) => row.id === taskId), winningUpdate.task);
  });

  await t.test('delete incluye tombstone al reconectar y restore exige versión nueva', async () => {
    const deletion = operation(board, taskId, 'delete', 2, {});
    const deleted = success(await b.api.rpc('cloud_apply_task', deletion));
    assert.equal(deleted.outcome, 'applied');
    assert.equal(deleted.task.version, 3);
    assert.ok(deleted.task.deleted_at);
    assert.deepEqual(success(await b.api.rpc('cloud_apply_task', deletion)), deleted);
    const snapshot = success(await a.api.snapshot('tasks', board));
    assert.deepEqual(snapshot.find((row) => row.id === taskId), deleted.task);
    const staleRestore = operation(board, taskId, 'restore', 2, {});
    const conflict = success(await a.api.rpc('cloud_apply_task', staleRestore));
    assert.equal(conflict.outcome, 'conflict');
    assert.equal(conflict.task.version, 3);
    const restored = success(await a.api.rpc('cloud_apply_task', operation(board, taskId, 'restore', 3, {})));
    assert.equal(restored.outcome, 'applied');
    assert.equal(restored.task.version, 4);
    assert.equal(restored.task.deleted_at, null);
    assert.equal(restored.task.title, winningUpdate.task.title);
    assert.deepEqual(success(await a.api.rpc('cloud_apply_task', staleRestore)), conflict);
    // Retry devuelve el resultado ORIGINAL, incluso tras update/delete/restore.
    assert.deepEqual(success(await a.api.rpc('cloud_apply_task', create)), created);
  });

  await t.test('reintentos concurrentes idénticos y operation_id acotado al actor', async () => {
    const op = operation(board, randomUUID());
    const results = (await Promise.all(Array.from({ length: 4 }, () => b.api.rpc('cloud_apply_task', op)))).map(success);
    for (const result of results) assert.deepEqual(result, results[0]);
    assert.equal(results[0].outcome, 'applied');
    assert.equal(results[0].task.version, 1);
    const differentActor = success(await a.api.rpc('cloud_apply_task', { ...op, p_task_id: randomUUID() }));
    assert.equal(differentActor.outcome, 'applied');
    const racingId = randomUUID();
    const racingBoard = success(await b.api.rpc('cloud_create_board', { p_name: 'Carrera entre tableros' }));
    const racing = [operation(board, randomUUID()), operation(racingBoard, randomUUID())]
      .map((item) => ({ ...item, p_operation_id: racingId }));
    const race = await Promise.all(racing.map((item) => b.api.rpc('cloud_apply_task', item)));
    assert.equal(race.filter((response) => response.ok).length, 1);
    denied(race.find((response) => !response.ok), '22023');
    // Dejar un resultado deduplicado de B para probar revocación.
    retryB = op;
  });

  await t.test('revocación bloquea lectura, escritura y retry previo antes de dedup', async () => {
    success(await a.api.rpc('cloud_set_member', { p_board_id: board, p_user_id: b.id, p_active: false }));
    for (const table of ['boards', 'board_members', 'tasks']) {
      assert.deepEqual(success(await b.api.snapshot(table, board)), []);
    }
    denied(await b.api.rpc('cloud_apply_task', retryB), '42501');
    denied(await b.api.rpc('cloud_apply_task', operation(board, randomUUID())), '42501');
    denied(await b.api.rpc('cloud_apply_task', operation(board, taskId, 'restore', 4, {})), '42501');
    denied(await b.api.rpc('cloud_set_member', { p_board_id: board, p_user_id: b.id, p_active: true }), '42501');
    assert.ok(success(await a.api.snapshot('tasks', board)).length > 0);
  });
});
