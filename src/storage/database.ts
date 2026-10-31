import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { migrateDatabase } from './migrations';

let databasePromise: Promise<SQLiteDatabase> | undefined;

/** Shared, lazily opened connection. Callers must serialize access to transactions. */
export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = initializeDatabase().catch((error: unknown) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}

async function initializeDatabase(): Promise<SQLiteDatabase> {
  const database = await openDatabaseAsync('tareas.db');
  try {
    await database.execAsync('PRAGMA journal_mode = WAL;');
    await migrateDatabase(database);
    return database;
  } catch (error) {
    await database.closeAsync().catch(() => undefined);
    throw error;
  }
}
