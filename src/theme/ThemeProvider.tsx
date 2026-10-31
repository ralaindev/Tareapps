import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Appearance } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { useBoardPreferences } from '../features/preferences/BoardPreferencesProvider';
import { darkColors, lightColors, type Palette } from './tokens';

const Context = createContext({ colors: lightColors as Palette, isDark: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { themeMode, loading } = useBoardPreferences();
  const isDark = themeMode === 'dark';
  const colors = isDark ? darkColors : lightColors;
  useEffect(() => {
    if (loading) return;
    Appearance.setColorScheme(themeMode);
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [themeMode, colors.background, loading]);
  const value = useMemo(() => ({ colors, isDark }), [colors, isDark]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useTheme = () => useContext(Context);

export function useThemedStyles<T>(factory: (colors: Palette) => T) {
  const theme = useTheme();
  const styles = useMemo(() => factory(theme.colors), [factory, theme.colors]);
  return { ...theme, styles };
}
