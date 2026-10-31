import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../../storage/database';
import { enqueueDatabase as enqueue } from '../../storage/queue';
import { sortTasks, validateTaskInput, type Task, type TaskInput, type TaskStatus } from './model';

let lastTimestamp = 0;

function mutate<T>(operation: (database: SQLiteDatabase) => Promise<T>): Promise<T> {
  return enqueue(async () => {
    const database = await getDatabase();
    let result!: T;
    await database.withTransactionAsync(async () => {
      result = await operation(database);
    });
    return result;
  });
}

async function timestamp(database: SQLiteDatabase): Promise<number> {
  const row = await database.getFirstAsync<{ latest: number | null }>(
    'SELECT MAX(updatedAt) AS latest FROM tasks',
  );
  lastTimestamp = Math.max(Date.now(), lastTimestamp + 1, (row?.latest ?? 0) + 1);
  return lastTimestamp;
}

async function find(database: SQLiteDatabase, id: string): Promise<Task> {
  const task = await database.getFirstAsync<Task>('SELECT * FROM tasks WHERE id = ?', id);
  if (!task) throw new Error('La tarea ya no existe.');
  return task;
}

async function save(database: SQLiteDatabase, task: Task, expectedUpdatedAt: number): Promise<Task> {
  const result = await database.runAsync(
    `UPDATE tasks SET title = ?, description = ?, status = ?, updatedAt = ?, columnEnteredAt = ?
     WHERE id = ? AND updatedAt = ?`,
    task.title, task.description, task.status, task.updatedAt, task.columnEnteredAt,
    task.id, expectedUpdatedAt,
  );
  if (result.changes !== 1) throw new Error('La tarea cambió o ya no existe.');
  return task;
}

export const taskRepository = {
  load(): Promise<Task[]> {
    return enqueue(async () => sortTasks(await (await getDatabase()).getAllAsync<Task>('SELECT * FROM tasks')));
  },

  create(input: TaskInput): Promise<Task> {
    const snapshot = { ...input };
    return mutate(async (database) => {
      const normalized = validateTaskInput(snapshot);
      const now = await timestamp(database);
      const task: Task = { ...normalized, id: randomUUID(), createdAt: now, updatedAt: now, columnEnteredAt: now };
      await database.runAsync(
        `INSERT INTO tasks (id, title, description, status, createdAt, updatedAt, columnEnteredAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        task.id, task.title, task.description, task.status, task.createdAt, task.updatedAt, task.columnEnteredAt,
      );
      return task;
    });
  },

  update(id: string, input: TaskInput): Promise<Task> {
    const snapshot = { ...input };
    return mutate(async (database) => {
      const normalized = validateTaskInput(snapshot);
      const previous = await find(database, id);
      const now = await timestamp(database);
      return save(database, {
        ...previous, ...normalized, updatedAt: now,
        columnEnteredAt: previous.status === normalized.status ? previous.columnEnteredAt : now,
      }, previous.updatedAt);
    });
  },

  remove(id: string): Promise<void> {
    return mutate(async (database) => {
      await database.runAsync('DELETE FROM tasks WHERE id = ?', id);
    });
  },

  removeWithSnapshot(id: string): Promise<Task> {
    return mutate(async (database) => {
      const previous = await find(database, id);
      const result = await database.runAsync('DELETE FROM tasks WHERE id = ? AND updatedAt = ?', id, previous.updatedAt);
      if (result.changes !== 1) throw new Error('La tarea cambió o ya no existe.');
      return previous;
    });
  },

  restoreDeleted(previous: Task): Promise<Task> {
    const snapshot = { ...previous };
    return mutate(async (database) => {
      validateTaskInput(snapshot);
      const task = { ...snapshot, updatedAt: await timestamp(database) };
      // A plain INSERT deliberately rejects an ID collision instead of overwriting a task.
      await database.runAsync(
        `INSERT INTO tasks (id, title, description, status, createdAt, updatedAt, columnEnteredAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        task.id, task.title, task.description, task.status, task.createdAt, task.updatedAt, task.columnEnteredAt,
      );
      return task;
    });
  },

  move(id: string, status: TaskStatus): Promise<{ task: Task; previous: Task }> {
    return mutate(async (database) => {
      const previous = await find(database, id);
      validateTaskInput({ ...previous, status });
      if (previous.status === status) return { task: { ...previous }, previous };
      const now = await timestamp(database);
      const task = await save(database, {
        ...previous, status, updatedAt: now, columnEnteredAt: now,
      }, previous.updatedAt);
      return { task, previous };
    });
  },

  restore(previous: Task, expectedUpdatedAt: number): Promise<Task> {
    const snapshot = { ...previous };
    return mutate(async (database) => {
      const current = await find(database, snapshot.id);
      if (current.updatedAt !== expectedUpdatedAt) {
        throw new Error('No se puede deshacer: la tarea ha cambiado.');
      }
      validateTaskInput({ ...current, status: snapshot.status });
      if (!Number.isSafeInteger(snapshot.columnEnteredAt) || snapshot.columnEnteredAt < 0) {
        throw new Error('La fecha de entrada en la columna no es válida.');
      }
      return save(database, {
        ...current, status: snapshot.status, columnEnteredAt: snapshot.columnEnteredAt,
        updatedAt: await timestamp(database),
      }, expectedUpdatedAt);
    });
  },
};
