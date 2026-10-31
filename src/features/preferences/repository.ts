import { getDatabase } from '../../storage/database';
import { enqueueDatabase } from '../../storage/queue';

export type BoardViewMode = 'detailed' | 'compact';
export type ThemeMode = 'light' | 'dark';

export const preferencesRepository = {
  loadThemeMode(): Promise<ThemeMode> {
    return enqueueDatabase(async () => {
      const database = await getDatabase();
      const row = await database.getFirstAsync<{ value: string }>(
        'SELECT value FROM preferences WHERE key = ?', 'theme_mode',
      );
      return row?.value === 'dark' ? 'dark' : 'light';
    });
  },
  saveThemeMode(mode: ThemeMode): Promise<void> {
    return enqueueDatabase(async () => {
      if (mode !== 'light' && mode !== 'dark') throw new Error('El tema no es válido.');
      const database = await getDatabase();
      await database.runAsync(
        'INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        'theme_mode', mode,
      );
    });
  },
  loadViewMode(): Promise<BoardViewMode> {
    return enqueueDatabase(async () => {
      const database = await getDatabase();
      const row = await database.getFirstAsync<{ value: string }>(
        'SELECT value FROM preferences WHERE key = ?', 'board_view_mode',
      );
      return row?.value === 'compact' ? 'compact' : 'detailed';
    });
  },
  saveViewMode(mode: BoardViewMode): Promise<void> {
    return enqueueDatabase(async () => {
      if (mode !== 'compact' && mode !== 'detailed') throw new Error('La vista no es válida.');
      const database = await getDatabase();
      await database.runAsync(
        'INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        'board_view_mode', mode,
      );
    });
  },
};
