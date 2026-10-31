import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react-native';
import BoardScreen from '../src/app/index';
import { TasksProvider, useTasks } from '../src/features/tasks/TasksProvider';
import { taskRepository } from '../src/features/tasks/repository';
import { STATUS_LABELS, type Task } from '../src/features/tasks/model';
import { BoardPreferencesProvider } from '../src/features/preferences/BoardPreferencesProvider';
import { preferencesRepository } from '../src/features/preferences/repository';
import { router } from 'expo-router';
import { Alert, Button, SectionList } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { darkColors, lightColors } from '../src/theme/tokens';
import { TaskForm } from '../src/components/TaskForm';

const mockSetPage = jest.fn();
const mockSetPageWithoutAnimation = jest.fn();
const mockSetScrollEnabled = jest.fn();

jest.mock('expo-router', () => ({ router: { push: jest.fn(), dismissTo: jest.fn() }, usePreventRemove: () => jest.fn() }));
jest.mock('../src/features/tasks/repository', () => ({
  taskRepository: { load: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(), move: jest.fn(), restore: jest.fn(), removeWithSnapshot: jest.fn(), restoreDeleted: jest.fn() },
}));
jest.mock('../src/features/preferences/repository', () => ({
  preferencesRepository: { loadViewMode: jest.fn(), saveViewMode: jest.fn(), loadThemeMode: jest.fn(), saveThemeMode: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual<typeof import('react-native-safe-area-context/jest/mock')>('react-native-safe-area-context/jest/mock').default,
);
jest.mock('react-native-pager-view', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View, Animated } = jest.requireActual<typeof import('react-native')>('react-native');
  // Navigation assertions exercise real React state, not a native animation driver.
  jest.spyOn(Animated, 'createAnimatedComponent').mockImplementation(component => component as ReturnType<typeof Animated.createAnimatedComponent>);
  return { __esModule: true, default: React.forwardRef((props: object, ref) => {
    React.useImperativeHandle(ref, () => ({ setPage: mockSetPage, setPageWithoutAnimation: mockSetPageWithoutAnimation, setScrollEnabled: mockSetScrollEnabled }));
    return <View {...props} testID="board-pager" />;
  }) };
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(taskRepository.load).mockResolvedValue([]);
  jest.mocked(preferencesRepository.loadViewMode).mockResolvedValue('detailed');
  jest.mocked(preferencesRepository.saveViewMode).mockResolvedValue(undefined);
  jest.mocked(preferencesRepository.loadThemeMode).mockResolvedValue('light');
  jest.mocked(preferencesRepository.saveThemeMode).mockResolvedValue(undefined);
});
afterEach(async () => { await cleanup(); });

async function mountBoard() {
  await render(<BoardPreferencesProvider><ThemeProvider><TasksProvider><BoardScreen /></TasksProvider></ThemeProvider></BoardPreferencesProvider>);
  return screen.getByTestId('board-pager');
}

describe('Board navigation', () => {
  it('accepts a completed swipe without commanding a second page transition', async () => {
    const pager = await mountBoard();
    await fireEvent(pager, 'pageSelected', { nativeEvent: { position: 1 } });
    expect(screen.getByRole('tab', { name: `${STATUS_LABELS.in_progress}, 0 tareas`, selected: true })).toBeTruthy();
    expect(mockSetPage).not.toHaveBeenCalled();
    expect(mockSetPageWithoutAnimation).not.toHaveBeenCalled();
  });

  it('commands a tab change once and ignores its settling echo', async () => {
    const pager = await mountBoard();
    await fireEvent.press(screen.getByRole('tab', { name: 'Hecho, 0 tareas' }));
    expect(mockSetPageWithoutAnimation).toHaveBeenCalledTimes(1);
    expect(mockSetPageWithoutAnimation).toHaveBeenCalledWith(2);
    await fireEvent(pager, 'pageSelected', { nativeEvent: { position: 2 } });
    expect(mockSetPageWithoutAnimation).toHaveBeenCalledTimes(1);
  });

  it('keeps the latest tab request when an older transition settles', async () => {
    const pager = await mountBoard();
    await fireEvent.press(screen.getByRole('tab', { name: `${STATUS_LABELS.in_progress}, 0 tareas` }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Hecho, 0 tareas' }));
    await fireEvent(pager, 'pageSelected', { nativeEvent: { position: 1 } });
    expect(screen.getByRole('tab', { name: 'Hecho, 0 tareas', selected: true })).toBeTruthy();
    await fireEvent(pager, 'pageSelected', { nativeEvent: { position: 2 } });
    expect(mockSetPageWithoutAnimation).toHaveBeenCalledTimes(2);
  });

  it('shows all three compact groups with title-only cards and opens the selected task', async () => {
    const tasks: Task[] = ['pending', 'in_progress', 'done'].map((status, index) => ({
      id: `task-${index}`, title: `Tarea ${index}`, description: 'Descripción privada de la tarjeta',
      status: status as Task['status'], createdAt: 1, updatedAt: 1, columnEnteredAt: 1,
    }));
    jest.mocked(taskRepository.load).mockResolvedValue(tasks);
    await mountBoard();
    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar a vista compacta' }));
    expect(screen.queryByTestId('board-pager')).toBeNull();
    for (const task of tasks) {
      expect(screen.getByRole('header', { name: `${STATUS_LABELS[task.status]}, 1 tareas` })).toBeTruthy();
      expect(screen.getByText(task.title)).toBeTruthy();
    }
    expect(screen.queryByText(tasks[0].description)).toBeNull();
    expect(screen.queryByText('Empezar →')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: `Editar: Tarea 1. ${STATUS_LABELS.in_progress}` }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/task', params: { id: 'task-1' } });
    expect(taskRepository.load).toHaveBeenCalledTimes(1);
  });

  it('restores compact mode on opening and keeps the selector outside the scrolling list', async () => {
    jest.mocked(preferencesRepository.loadViewMode).mockResolvedValue('compact');
    await render(<BoardPreferencesProvider><ThemeProvider><TasksProvider><BoardScreen /></TasksProvider></ThemeProvider></BoardPreferencesProvider>);
    expect(screen.getByRole('button', { name: 'Cambiar a vista detallada' })).toHaveAccessibilityValue({ text: 'Vista actual: compacta' });
    const list = screen.getByTestId('compact-board');
    expect(within(list).queryByRole('button', { name: 'Cambiar a vista detallada' })).toBeNull();
    expect(screen.getAllByText('Sin tareas en este estado')).toHaveLength(3);
    expect(screen.queryByTestId('board-pager')).toBeNull();
  });

  it('restores the selected detailed section with fresh pager state after switching views', async () => {
    const pager = await mountBoard();
    await fireEvent(pager, 'pageSelected', { nativeEvent: { position: 2 } });
    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar a vista compacta' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar a vista detallada' }));
    expect(screen.getByTestId('board-pager').props.initialPage).toBe(2);
    expect(screen.getByRole('tab', { name: 'Hecho, 0 tareas', selected: true })).toBeTruthy();
    expect(mockSetPageWithoutAnimation).not.toHaveBeenCalled();
  });

  it('retains the previous mode and tasks when saving the view preference fails', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.mocked(preferencesRepository.saveViewMode).mockRejectedValueOnce(new Error('Storage unavailable'));
    await mountBoard();
    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar a vista compacta' }));
    expect(screen.getByRole('button', { name: 'Cambiar a vista compacta' })).toHaveAccessibilityValue({ text: 'Vista actual: detallada' });
    expect(screen.getByTestId('board-pager')).toBeTruthy();
    expect(alert).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar a vista compacta' }));
    expect(screen.getByTestId('compact-board')).toBeTruthy();
    alert.mockRestore();
  });

  it('keeps Undo active across view changes', async () => {
    const original: Task = { id: 'one', title: 'Comprar pan', description: '', status: 'pending', createdAt: 1, updatedAt: 1, columnEnteredAt: 1 };
    const moved: Task = { ...original, status: 'in_progress', updatedAt: 2, columnEnteredAt: 2 };
    jest.mocked(taskRepository.load).mockResolvedValue([original]);
    jest.mocked(taskRepository.move).mockResolvedValue({ task: moved, previous: original });
    jest.mocked(taskRepository.restore).mockResolvedValue({ ...original, updatedAt: 3 });
    await mountBoard();
    await fireEvent.press(screen.getByRole('button', { name: 'Empezar: Comprar pan' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar a vista compacta' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Deshacer' }));
    expect(taskRepository.restore).toHaveBeenCalledWith(original, 2);
    expect(screen.getByRole('header', { name: `${STATUS_LABELS.pending}, 1 tareas` })).toBeTruthy();
  });

  it('keeps compact mode after creation and returns the new task to Pending', async () => {
    const created: Task = { id: 'new', title: 'Nueva idea', description: 'Un detalle', status: 'pending', createdAt: 2, updatedAt: 2, columnEnteredAt: 2 };
    jest.mocked(preferencesRepository.loadViewMode).mockResolvedValue('compact');
    jest.mocked(taskRepository.create).mockResolvedValue(created);
    function CreateProbe() {
      const { create } = useTasks();
      return <Button title="Simular guardado" onPress={() => void create({ title: created.title, description: created.description, status: 'pending' })} />;
    }
    await render(<BoardPreferencesProvider><ThemeProvider><TasksProvider><BoardScreen /><CreateProbe /></TasksProvider></ThemeProvider></BoardPreferencesProvider>);
    await act(async () => { await fireEvent.press(screen.getByRole('button', { name: 'Simular guardado' })); });
    expect(screen.getByRole('button', { name: 'Cambiar a vista detallada' })).toHaveAccessibilityValue({ text: 'Vista actual: compacta' });
    expect(screen.getByRole('button', { name: `Editar: Nueva idea. ${STATUS_LABELS.pending}` })).toBeTruthy();
    expect(screen.queryByText(created.description)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar a vista detallada' }));
    expect(screen.getByTestId('board-pager').props.initialPage).toBe(0);
  });

  it('toggles a persisted dark theme without changing the board mode or selection', async () => {
    const pager = await mountBoard();
    await fireEvent(pager, 'pageSelected', { nativeEvent: { position: 2 } });
    await fireEvent.press(screen.getByRole('switch', { name: 'Modo oscuro' }));
    expect(screen.getByRole('switch', { name: 'Modo oscuro', checked: true })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Mi tablero' })).toHaveStyle({ color: darkColors.text });
    expect(preferencesRepository.saveThemeMode).toHaveBeenCalledWith('dark');
    expect(screen.getByRole('tab', { name: 'Hecho, 0 tareas', selected: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar a vista compacta' }));
    expect(screen.getByRole('header', { name: 'Mi tablero' })).toHaveStyle({ color: darkColors.text });
    await fireEvent.press(screen.getByRole('switch', { name: 'Modo oscuro' }));
    expect(screen.getByRole('header', { name: 'Mi tablero' })).toHaveStyle({ color: lightColors.text });
    expect(screen.getByRole('button', { name: 'Cambiar a vista detallada' })).toHaveAccessibilityValue({ text: 'Vista actual: compacta' });
  });

  it('restores dark appearance in both the board and task form', async () => {
    jest.mocked(preferencesRepository.loadThemeMode).mockResolvedValue('dark');
    await render(<BoardPreferencesProvider><ThemeProvider><TasksProvider><BoardScreen /><TaskForm /></TasksProvider></ThemeProvider></BoardPreferencesProvider>);
    expect(screen.getByRole('switch', { name: 'Modo oscuro', checked: true })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Mi tablero' })).toHaveStyle({ color: darkColors.text });
    expect(screen.getByLabelText('Título')).toHaveStyle({ backgroundColor: darkColors.surface, color: darkColors.text });
    expect(screen.getByLabelText('Descripción opcional').props.keyboardAppearance).toBe('dark');
  });

  it('retains the previous theme when persistence fails and lets the user retry', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.mocked(preferencesRepository.saveThemeMode).mockRejectedValueOnce(new Error('Storage unavailable'));
    await mountBoard();
    await fireEvent.press(screen.getByRole('switch', { name: 'Modo oscuro' }));
    expect(screen.getByRole('switch', { name: 'Modo oscuro', checked: false })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Mi tablero' })).toHaveStyle({ color: lightColors.text });
    expect(alert).toHaveBeenCalledWith('No se pudo cambiar de tema', expect.any(String));
    await fireEvent.press(screen.getByRole('switch', { name: 'Modo oscuro' }));
    expect(screen.getByRole('switch', { name: 'Modo oscuro', checked: true })).toBeTruthy();
    alert.mockRestore();
  });

  it('explains the icon action on long press without switching until tapped', async () => {
    await mountBoard();
    const viewButton = screen.getByRole('button', { name: 'Cambiar a vista compacta' });
    await fireEvent(viewButton, 'longPress');
    expect(screen.getByText('Vista compacta')).toBeTruthy();
    expect(preferencesRepository.saveViewMode).not.toHaveBeenCalled();
    await fireEvent.press(viewButton);
    expect(screen.queryByText('Vista compacta')).toBeNull();
    expect(screen.getByRole('button', { name: 'Cambiar a vista detallada' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '＋ Nueva tarea' })).toBeTruthy();
    expect(screen.queryByText('EN FOCO')).toBeNull();
    expect(screen.queryByText('Poco a poco, todo sale.')).toBeNull();
  });

  it.each(['detailed', 'compact'] as const)('deletes and restores a card in %s mode through its accessible action', async mode => {
    const original: Task = { id: 'one', title: 'Comprar pan', description: '', status: 'pending', createdAt: 1, updatedAt: 1, columnEnteredAt: 1 };
    jest.mocked(taskRepository.load).mockResolvedValue([original]);
    jest.mocked(taskRepository.removeWithSnapshot).mockResolvedValue(original);
    jest.mocked(taskRepository.restoreDeleted).mockResolvedValue({ ...original, updatedAt: 2 });
    jest.mocked(preferencesRepository.loadViewMode).mockResolvedValue(mode);
    await render(<BoardPreferencesProvider><ThemeProvider><TasksProvider><BoardScreen /></TasksProvider></ThemeProvider></BoardPreferencesProvider>);
    await fireEvent(screen.getByRole('button', { name: /^Editar: Comprar pan/ }), 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
    expect(taskRepository.removeWithSnapshot).toHaveBeenCalledWith(original.id);
    expect(screen.queryByRole('button', { name: /^Editar: Comprar pan/ })).toBeNull();
    expect(screen.getByText('Tarea eliminada')).toBeTruthy();
    // Changing views keeps the deletion Undo available.
    await fireEvent.press(screen.getByRole('button', { name: /Cambiar a vista/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Deshacer' }));
    expect(taskRepository.restoreDeleted).toHaveBeenCalledWith(original);
    expect(screen.getByRole('button', { name: /^Editar: Comprar pan/ })).toBeTruthy();
  });

  it('temporarily disables the native pager for touches starting on a card', async () => {
    const original: Task = { id: 'one', title: 'Comprar pan', description: '', status: 'pending', createdAt: 1, updatedAt: 1, columnEnteredAt: 1 };
    jest.mocked(taskRepository.load).mockResolvedValue([original]);
    await mountBoard();
    const card = screen.getByTestId('swipe-one');
    await act(() => card.props.onTouchStart({ nativeEvent: { touches: [{}] } }));
    expect(mockSetScrollEnabled).toHaveBeenLastCalledWith(false);
    await act(() => card.props.onTouchEnd({ nativeEvent: { touches: [] } }));
    expect(mockSetScrollEnabled).toHaveBeenLastCalledWith(true);
    expect(mockSetPage).not.toHaveBeenCalled();
    expect(mockSetPageWithoutAnimation).not.toHaveBeenCalled();
  });

  it('restores independent scroll positions when switching between both views', async () => {
    const statuses = ['pending', 'in_progress', 'done'] as const;
    jest.mocked(taskRepository.load).mockResolvedValue(Array.from({ length: 36 }, (_, index): Task => ({
      id: `scroll-${index}`, title: `Tarea ${index}`, description: '', status: statuses[Math.floor(index / 12)],
      createdAt: index + 1, updatedAt: index + 1, columnEnteredAt: index + 1,
    })));
    await mountBoard();
    const scrollEvent = (y: number) => ({ nativeEvent: {
      contentOffset: { x: 0, y }, contentSize: { width: 360, height: 2000 },
      layoutMeasurement: { width: 360, height: 600 }, zoomScale: 1,
    } });
    await fireEvent.scroll(screen.getByTestId('detailed-list-pending'), scrollEvent(210));
    await fireEvent(screen.getByTestId('board-pager'), 'pageSelected', { nativeEvent: { position: 1 } });
    await fireEvent.scroll(screen.getByTestId('detailed-list-in_progress'), scrollEvent(120));
    await fireEvent(screen.getByTestId('board-pager'), 'pageSelected', { nativeEvent: { position: 2 } });
    await fireEvent.scroll(screen.getByTestId('detailed-list-done'), scrollEvent(280));
    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar a vista compacta' }));
    await fireEvent.scroll(screen.getByTestId('compact-board'), scrollEvent(340));
    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar a vista detallada' }));
    expect(screen.getByTestId('board-pager').props.initialPage).toBe(2);
    expect(screen.getByTestId('detailed-list-done').props.contentOffset).toEqual({ x: 0, y: 280 });
    await fireEvent(screen.getByTestId('board-pager'), 'pageSelected', { nativeEvent: { position: 1 } });
    expect(screen.getByTestId('detailed-list-in_progress').props.contentOffset).toEqual({ x: 0, y: 120 });
    await fireEvent(screen.getByTestId('board-pager'), 'pageSelected', { nativeEvent: { position: 0 } });
    expect(screen.getByTestId('detailed-list-pending').props.contentOffset).toEqual({ x: 0, y: 210 });
    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar a vista compacta' }));
    expect(screen.getByTestId('compact-board').props.contentOffset).toEqual({ x: 0, y: 340 });
  });

  it('does not jump compact back to the top on remount after an earlier creation', async () => {
    const created: Task = { id: 'new-scroll', title: 'Nueva tarea', description: '', status: 'pending', createdAt: 20, updatedAt: 20, columnEnteredAt: 20 };
    jest.mocked(taskRepository.load).mockResolvedValue(Array.from({ length: 12 }, (_, index): Task => ({
      ...created, id: `existing-${index}`, title: `Tarea ${index}`, createdAt: index + 1, updatedAt: index + 1, columnEnteredAt: index + 1,
    })));
    jest.mocked(preferencesRepository.loadViewMode).mockResolvedValue('compact');
    jest.mocked(taskRepository.create).mockResolvedValue(created);
    const scrollTo = jest.fn();
    // Observe native scroll commands: checking only contentOffset would miss a later forced reset.
    const responder = jest.spyOn(SectionList.prototype, 'getScrollResponder').mockReturnValue(
      { scrollTo } as unknown as ReturnType<SectionList<Task>['getScrollResponder']>,
    );
    function CreateProbe() {
      const { create } = useTasks();
      return <Button title="Crear para probar scroll" onPress={() => void create(created)} />;
    }
    try {
      await render(<BoardPreferencesProvider><ThemeProvider><TasksProvider><BoardScreen /><CreateProbe /></TasksProvider></ThemeProvider></BoardPreferencesProvider>);
      expect(scrollTo).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByRole('button', { name: 'Crear para probar scroll' }));
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
      await fireEvent.scroll(screen.getByTestId('compact-board'), { nativeEvent: {
        contentOffset: { x: 0, y: 240 }, contentSize: { width: 360, height: 2000 },
        layoutMeasurement: { width: 360, height: 600 }, zoomScale: 1,
      } });
      await fireEvent.press(screen.getByRole('button', { name: 'Cambiar a vista detallada' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Cambiar a vista compacta' }));
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('compact-board').props.contentOffset).toEqual({ x: 0, y: 240 });
    } finally {
      responder.mockRestore();
    }
  });

  it('floats Undo outside the fixed New task footer', async () => {
    const original: Task = { id: 'one', title: 'Comprar pan', description: '', status: 'pending', createdAt: 1, updatedAt: 1, columnEnteredAt: 1 };
    jest.mocked(taskRepository.load).mockResolvedValue([original]);
    jest.mocked(taskRepository.removeWithSnapshot).mockResolvedValue(original);
    await mountBoard();
    await fireEvent(screen.getByRole('button', { name: /^Editar: Comprar pan/ }), 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
    expect(within(screen.getByTestId('board-footer')).queryByRole('button', { name: 'Deshacer' })).toBeNull();
    expect(within(screen.getByTestId('board-content')).getByRole('button', { name: 'Deshacer' })).toBeTruthy();
    expect(within(screen.getByTestId('board-footer')).getByRole('button', { name: '＋ Nueva tarea' })).toBeTruthy();
  });
});
