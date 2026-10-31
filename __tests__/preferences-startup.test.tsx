import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { Appearance, Button, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AppStartup } from '../src/components/AppStartup';
import { BoardPreferencesProvider, useBoardPreferences } from '../src/features/preferences/BoardPreferencesProvider';
import type { preferencesRepository, BoardViewMode } from '../src/features/preferences/repository';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { darkColors } from '../src/theme/tokens';

jest.mock('../src/features/preferences/repository', () => ({ preferencesRepository: {} }));
jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) }));

function makeRepository() {
  return {
    loadViewMode: jest.fn<typeof preferencesRepository.loadViewMode>().mockResolvedValue('detailed'),
    loadThemeMode: jest.fn<typeof preferencesRepository.loadThemeMode>().mockResolvedValue('light'),
    saveViewMode: jest.fn<typeof preferencesRepository.saveViewMode>().mockResolvedValue(undefined),
    saveThemeMode: jest.fn<typeof preferencesRepository.saveThemeMode>().mockResolvedValue(undefined),
  };
}

function PreferenceProbe() {
  const { error, changeViewMode, changeThemeMode } = useBoardPreferences();
  return <>
    {error && <Text accessibilityRole="alert">{error}</Text>}
    <Button title="Elegir vista" onPress={() => void changeViewMode('compact')} />
    <Button title="Elegir tema" onPress={() => void changeThemeMode('dark')} />
  </>;
}

afterEach(async () => { await cleanup(); jest.restoreAllMocks(); jest.clearAllMocks(); });

describe('Preferences and startup', () => {
  it('does not display or apply light appearance before the saved dark theme is ready', async () => {
    const repository = makeRepository();
    let finishView!: (mode: BoardViewMode) => void;
    repository.loadViewMode.mockImplementationOnce(() => new Promise(resolve => { finishView = resolve; }));
    repository.loadThemeMode.mockResolvedValue('dark');
    const appearance = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
    await render(<BoardPreferencesProvider repository={repository}><ThemeProvider>
      <AppStartup><Text>Contenido preparado</Text></AppStartup>
    </ThemeProvider></BoardPreferencesProvider>);
    expect(screen.queryByText('Contenido preparado')).toBeNull();
    expect(appearance).not.toHaveBeenCalled();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    await act(() => finishView('compact'));
    expect(screen.getByText('Contenido preparado')).toBeTruthy();
    expect(screen.getByTestId('app-ready')).toHaveStyle({ backgroundColor: darkColors.background });
    expect(appearance).toHaveBeenCalledWith('dark');
    expect(appearance).not.toHaveBeenCalledWith('light');
    await fireEvent(screen.getByTestId('app-ready'), 'layout', { nativeEvent: { layout: { width: 360, height: 800 } } });
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('clears a theme error only when theme recovery succeeds', async () => {
    const repository = makeRepository();
    repository.loadThemeMode.mockRejectedValueOnce(new Error('Theme unavailable'));
    await render(<BoardPreferencesProvider repository={repository}><PreferenceProbe /></BoardPreferencesProvider>);
    expect(screen.getByRole('alert')).toHaveTextContent(/tema guardado/);
    await fireEvent.press(screen.getByRole('button', { name: 'Elegir vista' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/tema guardado/);
    await fireEvent.press(screen.getByRole('button', { name: 'Elegir tema' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('does not hide a view error when changing the theme', async () => {
    const repository = makeRepository();
    repository.loadViewMode.mockRejectedValueOnce(new Error('View unavailable'));
    await render(<BoardPreferencesProvider repository={repository}><PreferenceProbe /></BoardPreferencesProvider>);
    await fireEvent.press(screen.getByRole('button', { name: 'Elegir tema' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/vista guardada/);
    await fireEvent.press(screen.getByRole('button', { name: 'Elegir vista' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('releases the startup gate after read failures rather than trapping the app on the splash', async () => {
    const repository = makeRepository();
    repository.loadViewMode.mockRejectedValueOnce(new Error('View unavailable'));
    repository.loadThemeMode.mockRejectedValueOnce(new Error('Theme unavailable'));
    await render(<BoardPreferencesProvider repository={repository}><ThemeProvider>
      <AppStartup><PreferenceProbe /></AppStartup>
    </ThemeProvider></BoardPreferencesProvider>);
    expect(screen.getByTestId('app-ready')).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveTextContent(/vista guardada/);
    expect(screen.getByRole('alert')).toHaveTextContent(/tema guardado/);
  });
});
