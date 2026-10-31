import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { preferencesRepository, type BoardViewMode, type ThemeMode } from './repository';

interface BoardPreferences {
  viewMode: BoardViewMode;
  themeMode: ThemeMode;
  loading: boolean;
  saving: boolean;
  error: string | null;
  changeViewMode: (mode: BoardViewMode) => Promise<void>;
  changeThemeMode: (mode: ThemeMode) => Promise<void>;
}

const Context = createContext<BoardPreferences | null>(null);

export function BoardPreferencesProvider({ children, repository = preferencesRepository }: {
  children: ReactNode; repository?: typeof preferencesRepository;
}) {
  const [viewMode, setViewMode] = useState<BoardViewMode>('detailed');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [themeError, setThemeError] = useState<string | null>(null);
  const locked = useRef(true);

  useEffect(() => {
    let active = true;
    void Promise.allSettled([repository.loadViewMode(), repository.loadThemeMode()]).then(([view, theme]) => {
      if (!active) return;
      if (view.status === 'fulfilled') { setViewMode(view.value); setViewError(null); }
      else setViewError('No se pudo recuperar la vista guardada. Puedes volver a elegirla.');
      if (theme.status === 'fulfilled') { setThemeMode(theme.value); setThemeError(null); }
      else setThemeError('No se pudo recuperar el tema guardado. Puedes volver a elegirlo.');
    }).finally(() => {
      if (active) { locked.current = false; setLoading(false); }
    });
    return () => { active = false; };
  }, [repository]);

  const changeViewMode = useCallback(async (mode: BoardViewMode) => {
    if (locked.current) return;
    if (mode === viewMode && !viewError) return;
    locked.current = true;
    setSaving(true);
    try {
      await repository.saveViewMode(mode);
      setViewMode(mode);
      setViewError(null);
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }, [repository, viewMode, viewError]);

  const changeThemeMode = useCallback(async (mode: ThemeMode) => {
    if (locked.current || (mode === themeMode && !themeError)) return;
    locked.current = true;
    setSaving(true);
    try {
      await repository.saveThemeMode(mode);
      setThemeMode(mode);
      setThemeError(null);
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }, [repository, themeMode, themeError]);

  const error = [viewError, themeError].filter(Boolean).join(' ') || null;
  return <Context.Provider value={{ viewMode, themeMode, loading, saving, error, changeViewMode, changeThemeMode }}>{children}</Context.Provider>;
}

export function useBoardPreferences() {
  const value = useContext(Context);
  if (!value) throw new Error('useBoardPreferences necesita BoardPreferencesProvider.');
  return value;
}
