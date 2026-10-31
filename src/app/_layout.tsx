import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TasksProvider } from '../features/tasks/TasksProvider';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { MotionProvider } from '../components/Motion';
import { BoardPreferencesProvider } from '../features/preferences/BoardPreferencesProvider';
import * as SplashScreen from 'expo-splash-screen';
import { AppStartup } from '../components/AppStartup';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const unstable_settings = { anchor: 'index' };

export default function RootLayout() {
  return <SafeAreaProvider><MotionProvider><BoardPreferencesProvider><ThemeProvider><TasksProvider>
    <AppStartup><AppNavigator /></AppStartup>
  </TasksProvider></ThemeProvider></BoardPreferencesProvider></MotionProvider></SafeAreaProvider>;
}

function AppNavigator() {
  const { colors, isDark } = useTheme();
  return <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
    <StatusBar style={isDark ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="task" options={{ presentation: 'modal' }} />
    </Stack>
  </NavigationThemeProvider>;
}
