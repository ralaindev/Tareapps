import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { TaskInput } from '../src/features/tasks/model';

// Only the Expo native bridge and UUID source are mocked. SQL, constraints,
// PRAGMA user_version, commits and rollbacks run against real in-memory SQLite
// via Node 24's built-in node:sqlite. No database files or native modules are used.
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => {
    const { DatabaseSync } = require('node:sqlite');
    const sqlite = new DatabaseSync(':memory:');
    const adapter = {
      execAsync: jest.fn(async (sql: string) => { sqlite.exec(sql); }),
      getFirstAsync: jest.fn(async (sql: string, ...params: (string | number)[]) =>
        sqlite.prepare(sql).get(...params) ?? null),
      getAllAsync: jest.fn(async (sql: string, ...params: (string | number)[]) =>
        sqlite.prepare(sql).all(...params)),
      runAsync: jest.fn(async (sql: string, ...params: (string | number)[]) => {
        const result = sqlite.prepare(sql).run(...params);
        return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
      }),
      withTransactionAsync: jest.fn(async (operation: () => Promise<void>) => {
        sqlite.exec('BEGIN');
        try {
          await operation();
          sqlite.exec('COMMIT');
        } catch (error) {
          sqlite.exec('ROLLBACK');
          throw error;
        }
      }),
      closeAsync: jest.fn(async () => { sqlite.close(); }),
    };
    return adapter;
  }),
}));

jest.mock('expo-crypto', () => {
  let sequence = 0;
  return { randomUUID: jest.fn(() => `uuid-${++sequence}`) };
});

const input: TaskInput = { title: 'Primera', description: 'Descripción', status: 'pending' };
let repository: typeof import('../src/features/tasks/repository').taskRepository;
let database: SQLiteDatabase;

beforeEach(async () => {
  jest.resetModules();
  repository = require('../src/features/tasks/repository').taskRepository;
  database = await require('../src/storage/database').getDatabase();
  jest.spyOn(Date, 'now').mockReturnValue(1000);
});

afterEach(async () => {
  jest.restoreAllMocks();
  await database.closeAsync();
});

describe('SQLite task repository', () => {
  it('migrates once, persists bound input literally, and loads deterministic column order', async () => {
    const { migrateDatabase } = require('../src/storage/migrations') as typeof import('../src/storage/migrations');
    expect(await database.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 2 });
    const first = await repository.create({ ...input, title: "  O'Brien ?; DROP TABLE tasks; --  " });
    await migrateDatabase(database);
    const second = await repository.create(input);
    expect(first.title).toBe("O'Brien ?; DROP TABLE tasks; --");
    expect(second.createdAt).toBeGreaterThan(first.createdAt);
    expect(await repository.load()).toEqual([second, first]);
    const sqlite = require('expo-sqlite') as typeof import('expo-sqlite');
    expect(sqlite.openDatabaseAsync).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid creates and missing updates/moves without poisoning the queue', async () => {
    await expect(repository.create({ ...input, title: ' ' })).rejects.toThrow(/título/);
    await expect(repository.update('missing', input)).rejects.toThrow(/no existe/);
    await expect(repository.move('missing', 'done')).rejects.toThrow(/no existe/);
    expect(await repository.load()).toEqual([]);
    expect((await repository.create(input)).title).toBe(input.title);
  });

  it('rolls back failed SQL writes, propagates failures, then accepts the next mutation', async () => {
    await database.execAsync(`CREATE TRIGGER fail_insert BEFORE INSERT ON tasks
      BEGIN SELECT RAISE(ABORT, 'disk failure'); END;`);
    await expect(repository.create(input)).rejects.toThrow('disk failure');
    expect(await repository.load()).toEqual([]);
    await database.execAsync('DROP TRIGGER fail_insert');
    const created = await repository.create(input);
    await database.execAsync(`CREATE TRIGGER fail_update BEFORE UPDATE ON tasks
      BEGIN SELECT RAISE(ABORT, 'write failure'); END;`);
    await expect(repository.move(created.id, 'done')).rejects.toThrow('write failure');
    expect(await repository.load()).toEqual([created]);
    await database.execAsync('DROP TRIGGER fail_update');
    expect((await repository.move(created.id, 'done')).task.status).toBe('done');
  });

  it('preserves column time on edits, uses monotonic times even if the clock reverses, and returns move snapshots', async () => {
    const original = await repository.create(input);
    jest.mocked(Date.now).mockReturnValue(10);
    const edited = await repository.update(original.id, { ...input, title: 'Editada' });
    expect(edited.createdAt).toBe(original.createdAt);
    expect(edited.columnEnteredAt).toBe(original.columnEnteredAt);
    expect(edited.updatedAt).toBeGreaterThan(original.updatedAt);
    const { task, previous } = await repository.move(original.id, 'in_progress');
    expect(previous).toEqual(edited);
    expect(task).toEqual({ ...edited, status: 'in_progress', updatedAt: task.updatedAt, columnEnteredAt: task.updatedAt });
    expect(task.updatedAt).toBeGreaterThan(edited.updatedAt);
    expect((await repository.move(task.id, task.status)).task).toEqual(task);
    const updatedStatus = await repository.update(task.id, { ...input, status: 'done' });
    expect(updatedStatus.columnEnteredAt).toBe(updatedStatus.updatedAt);
    expect(updatedStatus.updatedAt).toBeGreaterThan(task.updatedAt);
  });

  it('undo restores only status/column position, keeps content and identity, and rejects a reused undo', async () => {
    const original = await repository.create(input);
    const { task, previous } = await repository.move(original.id, 'done');
    const restored = await repository.restore({ ...previous, title: 'Obsoleta', description: 'Obsoleta', createdAt: 0 }, task.updatedAt);
    expect(restored).toEqual({ ...original, updatedAt: restored.updatedAt });
    expect(restored.updatedAt).toBeGreaterThan(task.updatedAt);
    await expect(repository.restore(previous, task.updatedAt)).rejects.toThrow(/ha cambiado/);
    expect(await repository.load()).toEqual([restored]);
  });

  it('rejects stale undo after edits or another move, and never resurrects deleted tasks', async () => {
    const original = await repository.create(input);
    const moved = await repository.move(original.id, 'done');
    const edited = await repository.update(original.id, { ...input, status: 'done', title: 'Nueva' });
    await expect(repository.restore(moved.previous, moved.task.updatedAt)).rejects.toThrow(/ha cambiado/);
    expect(await repository.load()).toEqual([edited]);
    const movedAgain = await repository.move(original.id, 'in_progress');
    await expect(repository.restore(moved.previous, moved.task.updatedAt)).rejects.toThrow(/ha cambiado/);
    await repository.remove(original.id);
    await expect(repository.restore(movedAgain.previous, movedAgain.task.updatedAt)).rejects.toThrow(/no existe/);
    await repository.remove(original.id); // Delete is idempotent.
    expect(await repository.load()).toEqual([]);
  });

  it('serializes overlapping writes and loads until commit, including after rejection', async () => {
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const started = new Promise<void>((resolve) => { entered = resolve; });
    const originalRun = database.runAsync.bind(database);
    const run = jest.spyOn(database, 'runAsync');
    run.mockImplementationOnce(async (...args: Parameters<typeof database.runAsync>) => {
      entered();
      await gate;
      return originalRun(...args);
    });
    const first = repository.create(input);
    await started;
    const invalid = repository.create({ ...input, title: '' });
    const rejected = expect(invalid).rejects.toThrow(/título/);
    const second = repository.create({ ...input, title: 'Segunda' });
    const loaded = repository.load();
    await Promise.resolve();
    expect(run).toHaveBeenCalledTimes(1);
    release();
    const [a, b] = await Promise.all([first, second]);
    await rejected;
    expect(b.updatedAt).toBeGreaterThan(a.updatedAt);
    expect(await loaded).toEqual([b, a]);
  });

  it('rolls back schema and version together on migration failure and rejects newer schemas', async () => {
    const { migrateDatabase } = require('../src/storage/migrations') as typeof import('../src/storage/migrations');
    await database.execAsync('DROP TABLE preferences; DROP TABLE tasks; PRAGMA user_version = 0; CREATE TABLE tasks (conflict TEXT);');
    await expect(migrateDatabase(database)).rejects.toThrow();
    expect(await database.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 0 });
    await database.execAsync('DROP TABLE tasks;');
    const exec = database.execAsync.bind(database);
    jest.spyOn(database, 'execAsync').mockImplementationOnce(async (sql: string) => {
      await exec(sql);
      throw new Error('migration interrupted');
    });
    await expect(migrateDatabase(database)).rejects.toThrow('migration interrupted');
    expect(await database.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 0 });
    expect(await database.getFirstAsync("SELECT name FROM sqlite_master WHERE name = 'tasks'")).toBeNull();
    await migrateDatabase(database);
    await database.execAsync('PRAGMA user_version = 99;');
    await expect(migrateDatabase(database)).rejects.toThrow(/más reciente/);
    expect(await database.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 99 });
  });

  it('upgrades version one without changing tasks and persists the view preference independently', async () => {
    const original = await repository.create(input);
    await database.execAsync('DROP TABLE preferences; PRAGMA user_version = 1;');
    const { migrateDatabase } = require('../src/storage/migrations') as typeof import('../src/storage/migrations');
    await migrateDatabase(database);
    expect(await database.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 2 });
    expect(await repository.load()).toEqual([original]);
    const { preferencesRepository } = require('../src/features/preferences/repository') as typeof import('../src/features/preferences/repository');
    expect(await preferencesRepository.loadViewMode()).toBe('detailed');
    await preferencesRepository.saveViewMode('compact');
    // Recreate the consumer: the value is read from SQLite, not an in-memory preference.
    expect(await preferencesRepository.loadViewMode()).toBe('compact');
    await preferencesRepository.saveViewMode('detailed');
    expect(await preferencesRepository.loadViewMode()).toBe('detailed');
    expect(await repository.load()).toEqual([original]);
  });

  it('serializes preference writes with task transactions and recovers after preference failure', async () => {
    const { preferencesRepository } = require('../src/features/preferences/repository') as typeof import('../src/features/preferences/repository');
    await Promise.all([repository.create(input), preferencesRepository.saveViewMode('compact'), repository.create(input)]);
    expect(await preferencesRepository.loadViewMode()).toBe('compact');
    expect(await repository.load()).toHaveLength(2);
    await database.execAsync(`CREATE TRIGGER fail_preference BEFORE INSERT ON preferences
      BEGIN SELECT RAISE(ABORT, 'preference failure'); END;`);
    await expect(preferencesRepository.saveViewMode('detailed')).rejects.toThrow('preference failure');
    expect(await preferencesRepository.loadViewMode()).toBe('compact');
    expect((await repository.create(input)).title).toBe(input.title);
    await database.execAsync('DROP TRIGGER fail_preference');
    await preferencesRepository.saveViewMode('detailed');
    expect(await preferencesRepository.loadViewMode()).toBe('detailed');
  });

  it('persists theme independently of board view and leaves tasks intact', async () => {
    const { preferencesRepository } = require('../src/features/preferences/repository') as typeof import('../src/features/preferences/repository');
    const original = await repository.create(input);
    expect(await preferencesRepository.loadThemeMode()).toBe('light');
    await preferencesRepository.saveViewMode('compact');
    await preferencesRepository.saveThemeMode('dark');
    expect(await preferencesRepository.loadThemeMode()).toBe('dark');
    expect(await preferencesRepository.loadViewMode()).toBe('compact');
    await preferencesRepository.saveThemeMode('light');
    expect(await preferencesRepository.loadThemeMode()).toBe('light');
    expect(await repository.load()).toEqual([original]);
  });

  it('atomically snapshots deletion and restores the original identity, state and position', async () => {
    const first = await repository.create({ ...input, status: 'done' });
    const second = await repository.create({ ...input, title: 'Otra', status: 'done' });
    const deleted = await repository.removeWithSnapshot(first.id);
    expect(deleted).toEqual(first);
    expect(await repository.load()).toEqual([second]);
    const restored = await repository.restoreDeleted(deleted);
    expect(restored).toEqual({ ...first, updatedAt: restored.updatedAt });
    expect(restored.updatedAt).toBeGreaterThan(second.updatedAt);
    expect(await repository.load()).toEqual([second, restored]);
    await expect(repository.restoreDeleted(deleted)).rejects.toThrow();
    expect(await repository.load()).toEqual([second, restored]);
  });

  it('rolls back failed deletion and does not poison subsequent task operations', async () => {
    const task = await repository.create(input);
    await database.execAsync(`CREATE TRIGGER fail_delete BEFORE DELETE ON tasks
      BEGIN SELECT RAISE(ABORT, 'delete failure'); END;`);
    await expect(repository.removeWithSnapshot(task.id)).rejects.toThrow('delete failure');
    expect(await repository.load()).toEqual([task]);
    await database.execAsync('DROP TRIGGER fail_delete');
    expect(await repository.removeWithSnapshot(task.id)).toEqual(task);
    await expect(repository.removeWithSnapshot(task.id)).rejects.toThrow(/no existe/);
    expect(await repository.restoreDeleted(task)).toMatchObject({ id: task.id, title: task.title });
  });
});
