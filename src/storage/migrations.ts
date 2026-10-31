import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_VERSION = 2;

export async function migrateDatabase(database: SQLiteDatabase): Promise<void> {
  // Schema changes and their version are committed (or rolled back) together.
  await database.withTransactionAsync(async () => {
    const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const version = row?.user_version ?? 0;
    if (version > DATABASE_VERSION) {
      throw new Error('La base de datos pertenece a una versión más reciente.');
    }
    if (version < 1) {
      await database.execAsync(`
        CREATE TABLE tasks (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 120),
          description TEXT NOT NULL CHECK(length(description) <= 2000),
          status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'done')),
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          columnEnteredAt INTEGER NOT NULL
        );
        CREATE INDEX tasks_column_order ON tasks(columnEnteredAt DESC, id ASC);
        PRAGMA user_version = 1;
      `);
    }
    if (version < 2) {
      await database.execAsync(`
        CREATE TABLE preferences (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
        PRAGMA user_version = 2;
      `);
    }
  });
}
