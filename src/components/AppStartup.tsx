import type { ReactNode } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useBoardPreferences } from '../features/preferences/BoardPreferencesProvider';
import { useTheme } from '../theme/ThemeProvider';

/** Keep native splash visible until we know which palette to render. */
export function AppStartup({ children }: { children: ReactNode }) {
  const { loading } = useBoardPreferences();
  const { colors } = useTheme();
  if (loading) return null;
  return <View testID="app-ready" style={{ flex: 1, backgroundColor: colors.background }}
    onLayout={() => { void SplashScreen.hideAsync().catch(() => undefined); }}>
    {children}
  </View>;
}
