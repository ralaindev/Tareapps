import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router, usePreventRemove } from 'expo-router';
import { Alert } from 'react-native';
import { TaskForm } from '../src/components/TaskForm';
import type { useTasks } from '../src/features/tasks/TasksProvider';
import { STATUSES, STATUS_LABELS, type Task } from '../src/features/tasks/model';

jest.mock('expo-router', () => ({
  router: { dismissTo: jest.fn() },
  usePreventRemove: jest.fn(),
}));
jest.mock('../src/features/tasks/TasksProvider', () => ({
  useTasks: () => mockTasks,
}));
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual<typeof import('react-native-safe-area-context/jest/mock')>(
    'react-native-safe-area-context/jest/mock',
  ).default,
);

const original: Task = {
  id: 'task-one', title: 'Comprar pan', description: 'En la panadería',
  status: 'in_progress', createdAt: 1, updatedAt: 2, columnEnteredAt: 2,
};
const mockTasks = {
  create: jest.fn<ReturnType<typeof useTasks>['create']>(),
  update: jest.fn<ReturnType<typeof useTasks>['update']>(),
  remove: jest.fn<ReturnType<typeof useTasks>['remove']>(),
  busy: false,
};
const disablePrevention = jest.fn<() => void>();
let preventionEnabled: boolean;
let preventExit: NonNullable<Parameters<typeof usePreventRemove>[1]>;

function alertButton(text: string) {
  const calls = jest.mocked(Alert.alert).mock.calls;
  const button = calls[calls.length - 1]?.[2]?.find(candidate => candidate.text === text);
  if (!button) throw new Error(`Missing alert button: ${text}`);
  return button;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTasks.busy = false;
  mockTasks.create.mockReset().mockResolvedValue(original);
  mockTasks.update.mockReset().mockResolvedValue(original);
  mockTasks.remove.mockReset().mockResolvedValue(undefined);
  jest.mocked(usePreventRemove).mockImplementation((enabled, callback) => {
    preventionEnabled = enabled;
    if (!callback) throw new Error('TaskForm must register an exit prevention callback');
    preventExit = callback;
    return disablePrevention;
  });
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

describe('TaskForm', () => {
  it('keeps saving outside the scrolling fields and deletion separate from the primary action', async () => {
    await render(<TaskForm task={original} />);
    const fields = screen.getByTestId('task-form-fields');
    const saveBar = screen.getByTestId('task-form-save-bar');
    expect(within(fields).queryByRole('button', { name: 'Guardar cambios' })).toBeNull();
    expect(within(saveBar).getByRole('button', { name: 'Guardar cambios' })).toBeTruthy();
    expect(within(saveBar).queryByRole('button', { name: 'Eliminar tarea' })).toBeNull();
    expect(within(fields).getByRole('button', { name: 'Eliminar tarea' })).toBeTruthy();
  });
  it('rejects a whitespace-only title without creating or navigating', async () => {
    await render(<TaskForm />);
    expect(preventionEnabled).toBe(false);
    expect(screen.getByRole('button', { name: 'Crear tarea' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Título'), '  \n\t ');
    await fireEvent.changeText(screen.getByLabelText('Descripción opcional'), 'Un detalle');
    expect(screen.getByRole('button', { name: 'Crear tarea' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Crear tarea' }));
    expect(mockTasks.create).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('preserves both fields and shows the error when creation fails', async () => {
    mockTasks.create.mockRejectedValueOnce(new Error('No se pudo guardar la tarea'));
    await render(<TaskForm />);
    await fireEvent.changeText(screen.getByLabelText('Título'), '  Una idea  ');
    await fireEvent.changeText(screen.getByLabelText('Descripción opcional'), 'Detalles\npara mañana');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear tarea' }));
    expect(mockTasks.create).toHaveBeenCalledWith({
      title: '  Una idea  ', description: 'Detalles\npara mañana', status: 'pending',
    });
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar la tarea');
    expect(screen.getByLabelText('Título')).toHaveDisplayValue('  Una idea  ');
    expect(screen.getByLabelText('Descripción opcional')).toHaveDisplayValue('Detalles\npara mañana');
    expect(screen.getByRole('button', { name: 'Crear tarea' })).toBeEnabled();
    expect(preventionEnabled).toBe(true);
    expect(disablePrevention).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('creates in pending and navigates only after persistence succeeds', async () => {
    let resolve!: (task: Task) => void;
    mockTasks.create.mockImplementationOnce(() => new Promise<Task>(done => { resolve = done; }));
    await render(<TaskForm />);
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Nueva idea');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear tarea' }));
    expect(mockTasks.create).toHaveBeenCalledWith({ title: 'Nueva idea', description: '', status: 'pending' });
    expect(router.dismissTo).not.toHaveBeenCalled();
    await act(async () => { resolve(original); });
    expect(disablePrevention).toHaveBeenCalledTimes(1);
    expect(preventionEnabled).toBe(false);
    expect(router.dismissTo).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });

  it.each(STATUSES)('saves edited fields with status %s and navigates after success', async status => {
    await render(<TaskForm task={original} />);
    expect(screen.getByLabelText('Título')).toHaveDisplayValue(original.title);
    expect(screen.getByLabelText('Descripción opcional')).toHaveDisplayValue(original.description);
    expect(screen.getByRole('radio', { name: STATUS_LABELS[original.status] })).toBeChecked();
    expect(preventionEnabled).toBe(false);
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Comprar fruta');
    await fireEvent.changeText(screen.getByLabelText('Descripción opcional'), 'Manzanas y peras');
    await fireEvent.press(screen.getByRole('radio', { name: STATUS_LABELS[status] }));
    expect(screen.getByRole('radio', { name: STATUS_LABELS[status] })).toBeChecked();
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(mockTasks.update).toHaveBeenCalledTimes(1);
    expect(mockTasks.update).toHaveBeenCalledWith(original.id, {
      title: 'Comprar fruta', description: 'Manzanas y peras', status,
    });
    expect(mockTasks.create).not.toHaveBeenCalled();
    expect(disablePrevention).toHaveBeenCalledTimes(1);
    expect(preventionEnabled).toBe(false);
    expect(router.dismissTo).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).toHaveBeenCalledWith('/');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps dirty edits on cancellation and repeats the blocked exit only on discard', async () => {
    const repeat = jest.fn();
    await render(<TaskForm task={original} />);
    await fireEvent.changeText(screen.getByLabelText('Descripción opcional'), 'Otro detalle');
    expect(preventionEnabled).toBe(true);
    await act(() => { preventExit({ data: { action: { type: 'GO_BACK' } }, repeat }); });
    expect(Alert.alert).toHaveBeenLastCalledWith(
      '¿Descartar los cambios?', 'Los cambios sin guardar se perderán.', expect.any(Array),
    );
    expect(alertButton('Seguir editando').style).toBe('cancel');
    await act(() => { alertButton('Seguir editando').onPress?.(); });
    expect(repeat).not.toHaveBeenCalled();
    expect(preventionEnabled).toBe(true);
    expect(screen.getByLabelText('Descripción opcional')).toHaveDisplayValue('Otro detalle');
    await act(() => { preventExit({ data: { action: { type: 'GO_BACK' } }, repeat }); });
    expect(alertButton('Descartar').style).toBe('destructive');
    await act(() => { alertButton('Descartar').onPress?.(); });
    expect(repeat).toHaveBeenCalledTimes(1);
    expect(preventionEnabled).toBe(false);
    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(mockTasks.update).not.toHaveBeenCalled();
    expect(mockTasks.remove).not.toHaveBeenCalled();
  });

  it('disables actions and silently blocks exit while busy', async () => {
    mockTasks.busy = true;
    const repeat = jest.fn();
    await render(<TaskForm task={original} />);
    expect(preventionEnabled).toBe(true);
    expect(screen.getByLabelText('Título')).toHaveProp('editable', false);
    expect(screen.getByLabelText('Descripción opcional')).toHaveProp('editable', false);
    for (const name of ['Cancelar', 'Guardando…', 'Eliminar tarea']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
      await fireEvent.press(screen.getByRole('button', { name }));
    }
    for (const status of STATUSES) {
      expect(screen.getByRole('radio', { name: STATUS_LABELS[status] })).toBeDisabled();
    }
    await act(() => { preventExit({ data: { action: { type: 'GO_BACK' } }, repeat }); });
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(repeat).not.toHaveBeenCalled();
    expect(mockTasks.update).not.toHaveBeenCalled();
    expect(mockTasks.remove).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('cancels deletion without removing, then removes only after confirmation', async () => {
    let resolve!: () => void;
    mockTasks.remove.mockImplementationOnce(() => new Promise<void>(done => { resolve = done; }));
    await render(<TaskForm task={original} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar tarea' }));
    expect(Alert.alert).toHaveBeenLastCalledWith(
      '¿Eliminar tarea?', `Se eliminará «${original.title}».`, expect.any(Array),
    );
    expect(mockTasks.remove).not.toHaveBeenCalled();
    expect(alertButton('Cancelar').style).toBe('cancel');
    await act(() => { alertButton('Cancelar').onPress?.(); });
    expect(mockTasks.remove).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar tarea' }));
    expect(alertButton('Eliminar').style).toBe('destructive');
    await act(() => { alertButton('Eliminar').onPress?.(); });
    expect(mockTasks.remove).toHaveBeenCalledTimes(1);
    expect(mockTasks.remove).toHaveBeenCalledWith(original.id);
    expect(router.dismissTo).not.toHaveBeenCalled();
    await act(async () => { resolve(); });
    expect(disablePrevention).toHaveBeenCalledTimes(1);
    expect(preventionEnabled).toBe(false);
    expect(router.dismissTo).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });

  it('shows a deletion error and keeps the form open when removal fails', async () => {
    mockTasks.remove.mockRejectedValueOnce(new Error('No se pudo eliminar la tarea'));
    await render(<TaskForm task={original} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar tarea' }));
    await act(() => { alertButton('Eliminar').onPress?.(); });
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo eliminar la tarea');
    expect(screen.getByLabelText('Título')).toHaveDisplayValue(original.title);
    expect(disablePrevention).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });
});
