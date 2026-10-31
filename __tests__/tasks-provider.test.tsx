import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, render, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { TasksProvider, useTasks } from '../src/features/tasks/TasksProvider';
import type { Task, TaskInput } from '../src/features/tasks/model';
import type { taskRepository } from '../src/features/tasks/repository';

jest.mock('../src/features/tasks/repository', () => ({ taskRepository: {} }));

const input: TaskInput = { title: 'Primera', description: '', status: 'pending' };
const original: Task = { ...input, id: 'one', createdAt: 1, updatedAt: 1, columnEnteredAt: 1 };
const moved: Task = { ...original, status: 'done', updatedAt: 2, columnEnteredAt: 2 };
let context: ReturnType<typeof useTasks>;
let screenReaderChanged: (enabled: boolean) => void;
let unsubscribe: ReturnType<typeof jest.fn>;

function Probe() {
  const value = useTasks();
  useEffect(() => { context = value; }, [value]);
  return null;
}

function makeRepository() {
  return {
    load: jest.fn<typeof taskRepository.load>().mockResolvedValue([original]),
    create: jest.fn<typeof taskRepository.create>().mockResolvedValue({ ...original, id: 'two' }),
    update: jest.fn<typeof taskRepository.update>().mockResolvedValue({ ...moved, title: 'Editada', updatedAt: 3 }),
    remove: jest.fn<typeof taskRepository.remove>().mockResolvedValue(undefined),
    removeWithSnapshot: jest.fn<typeof taskRepository.removeWithSnapshot>().mockResolvedValue(original),
    restoreDeleted: jest.fn<typeof taskRepository.restoreDeleted>().mockResolvedValue({ ...original, updatedAt: 3 }),
    move: jest.fn<typeof taskRepository.move>().mockResolvedValue({ task: moved, previous: original }),
    restore: jest.fn<typeof taskRepository.restore>().mockResolvedValue({ ...original, updatedAt: 3 }),
  };
}

async function mount(repository: ReturnType<typeof makeRepository>) {
  await render(<TasksProvider repository={repository}><Probe /></TasksProvider>);
  await waitFor(() => expect(context.loading).toBe(false));
}

beforeEach(() => {
  unsubscribe = jest.fn();
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((...[_event, listener]: Parameters<typeof AccessibilityInfo.addEventListener>) => {
    screenReaderChanged = listener as (enabled: boolean) => void;
    return { remove: unsubscribe };
  });
});

afterEach(async () => {
  await cleanup();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('TasksProvider', () => {
  it('blocks actions during the initial load and releases the guard when it completes', async () => {
    const repository = makeRepository();
    let resolve!: (tasks: Task[]) => void;
    repository.load.mockImplementationOnce(() => new Promise<Task[]>((done) => { resolve = done; }));
    await render(<TasksProvider repository={repository}><Probe /></TasksProvider>);
    expect(context.loading).toBe(true);
    expect(context.busy).toBe(true);
    await act(async () => { await expect(context.create(input)).rejects.toThrow(/operación en curso/); });
    expect(repository.create).not.toHaveBeenCalled();
    await act(async () => { resolve([original]); });
    expect(context.loading).toBe(false);
    expect(context.busy).toBe(false);
    expect(context.tasks).toEqual([original]);
    await act(async () => { await context.create(input); });
    expect(context.tasks).toHaveLength(2);
  });

  it('ignores an initial load completed after unmount and removes its accessibility listener', async () => {
    const repository = makeRepository();
    let resolve!: (tasks: Task[]) => void;
    repository.load.mockImplementationOnce(() => new Promise<Task[]>((done) => { resolve = done; }));
    const view = await render(<TasksProvider repository={repository}><Probe /></TasksProvider>);
    const pendingContext = context;
    await view.unmount();
    await act(async () => { resolve([original]); });
    expect(context).toBe(pendingContext);
    expect(context.tasks).toEqual([]);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('exposes friendly load errors and allows reload to recover', async () => {
    const repository = makeRepository();
    repository.load.mockRejectedValueOnce(new Error('SQLite unavailable'));
    await mount(repository);
    expect(context.tasks).toEqual([]);
    expect(context.error).toMatch(/No se pudieron cargar/);
    await act(async () => { await context.reload(); });
    expect(context.error).toBeNull();
    expect(context.tasks).toEqual([original]);
  });

  it('propagates creation failure without changing tasks or the selected column', async () => {
    const repository = makeRepository();
    const failure = new Error('No se pudo guardar');
    repository.create.mockRejectedValueOnce(failure);
    await mount(repository);
    await act(() => context.setSelectedColumn(2));
    await act(async () => { await expect(context.create(input)).rejects.toBe(failure); });
    expect(context.tasks).toEqual([original]);
    expect(context.selectedColumn).toBe(2);
    expect(context.busy).toBe(false);
    expect(repository.load).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate and overlapping actions synchronously before a render', async () => {
    const repository = makeRepository();
    let resolve!: (task: Task) => void;
    repository.create.mockImplementationOnce(() => new Promise<Task>((done) => { resolve = done; }));
    await mount(repository);
    await act(() => context.setSelectedColumn(2));
    let first!: Promise<Task>;
    await act(async () => {
      const create = context.create;
      first = create(input);
      await expect(create(input)).rejects.toThrow(/operación en curso/);
      await expect(context.remove(original.id)).rejects.toThrow(/operación en curso/);
    });
    expect(context.busy).toBe(true);
    expect(context.tasks).toEqual([original]);
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.remove).not.toHaveBeenCalled();
    await act(async () => { resolve({ ...original, id: 'two' }); await first; });
    expect(context.tasks).toHaveLength(2);
    expect(context.selectedColumn).toBe(0);
    expect(context.busy).toBe(false);
    expect(repository.load).toHaveBeenCalledTimes(1);
  });

  it('uses the persisted move snapshot and version, preserving Undo on restore failure', async () => {
    const repository = makeRepository();
    repository.restore.mockRejectedValueOnce(new Error('Almacenamiento no disponible'));
    await mount(repository);
    await act(async () => { await context.move(original.id, 'done'); });
    expect(context.tasks).toEqual([moved]);
    expect(context.undoNotice?.taskId).toBe(original.id);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(expect.stringContaining('Hecho'));
    await act(async () => { await expect(context.undo()).rejects.toThrow('Almacenamiento no disponible'); });
    expect(context.undoNotice?.taskId).toBe(original.id);
    expect(context.tasks).toEqual([moved]);
    await act(async () => { await context.undo(); });
    expect(repository.restore).toHaveBeenLastCalledWith(original, moved.updatedAt);
    expect(context.tasks).toEqual([{ ...original, updatedAt: 3 }]);
    expect(context.undoNotice).toBeNull();
    expect(repository.load).toHaveBeenCalledTimes(1);
  });

  it('preserves Undo after a failed edit and unrelated changes, invalidating after a successful same-task edit', async () => {
    const repository = makeRepository();
    repository.update.mockRejectedValueOnce(new Error('No guardado'));
    await mount(repository);
    await act(async () => { await context.move(original.id, 'done'); });
    await act(async () => { await expect(context.update(original.id, input)).rejects.toThrow('No guardado'); });
    expect(context.undoNotice?.taskId).toBe(original.id);
    await act(async () => { await context.remove('another'); });
    expect(context.undoNotice?.taskId).toBe(original.id);
    await act(async () => { await context.update(original.id, input); });
    expect(context.undoNotice).toBeNull();
    expect(context.tasks[0].title).toBe('Editada');
  });

  it('invalidates same-task Undo on removal and replaces the snapshot on a later move', async () => {
    const repository = makeRepository();
    await mount(repository);
    await act(async () => { await context.move(original.id, 'done'); });
    const next = { ...moved, status: 'in_progress' as const, updatedAt: 3, columnEnteredAt: 3 };
    repository.move.mockResolvedValueOnce({ task: next, previous: moved });
    await act(async () => { await context.move(original.id, 'in_progress'); });
    await act(async () => { await context.undo(); });
    expect(repository.restore).toHaveBeenCalledWith(moved, next.updatedAt);
    await act(async () => { await context.move(original.id, 'done'); });
    await act(async () => { await context.remove(original.id); });
    expect(context.undoNotice).toBeNull();
    expect(context.tasks).toEqual([]);
  });

  it('expires after six seconds and keeps screen-reader Undo indefinite until disabled', async () => {
    const repository = makeRepository();
    await mount(repository);
    jest.useFakeTimers();
    await act(async () => { await context.move(original.id, 'done'); });
    await act(() => { jest.advanceTimersByTime(5999); });
    expect(context.undoNotice).not.toBeNull();
    await act(() => { jest.advanceTimersByTime(1); });
    expect(context.undoNotice).toBeNull();
    await act(async () => { await context.move(original.id, 'done'); });
    await act(() => screenReaderChanged(true));
    await act(() => { jest.advanceTimersByTime(60000); });
    expect(context.undoNotice).not.toBeNull();
    await act(() => screenReaderChanged(false));
    await act(() => { jest.advanceTimersByTime(6000); });
    expect(context.undoNotice).toBeNull();
    await cleanup();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('offers deletion Undo, preserves selection and restores after a retryable storage error', async () => {
    const repository = makeRepository();
    await mount(repository);
    await act(() => context.setSelectedColumn(2));
    await act(async () => { await context.removeWithUndo(original.id); });
    expect(context.tasks).toEqual([]);
    expect(context.selectedColumn).toBe(2);
    expect(context.undoNotice?.message).toBe('Tarea eliminada');
    repository.restoreDeleted.mockRejectedValueOnce(new Error('Restore unavailable'));
    await act(async () => { await expect(context.undo()).rejects.toThrow('Restore unavailable'); });
    expect(context.undoNotice?.taskId).toBe(original.id);
    expect(context.tasks).toEqual([]);
    await act(async () => { await context.undo(); });
    expect(repository.restoreDeleted).toHaveBeenLastCalledWith(original);
    expect(context.tasks).toEqual([{ ...original, updatedAt: 3 }]);
    expect(context.undoNotice).toBeNull();
    expect(context.selectedColumn).toBe(2);
  });

  it('keeps task and previous Undo on failed deletion, then replaces Undo only on success', async () => {
    const repository = makeRepository();
    await mount(repository);
    await act(async () => { await context.move(original.id, 'done'); });
    repository.removeWithSnapshot.mockRejectedValueOnce(new Error('Delete unavailable'));
    await act(async () => { await expect(context.removeWithUndo(original.id)).rejects.toThrow('Delete unavailable'); });
    expect(context.tasks).toEqual([moved]);
    expect(context.undoNotice?.message).toBe('Tarea movida');
    repository.removeWithSnapshot.mockResolvedValueOnce(moved);
    await act(async () => { await context.removeWithUndo(original.id); });
    expect(context.undoNotice?.message).toBe('Tarea eliminada');
    await act(async () => { await context.undo(); });
    expect(repository.restoreDeleted).toHaveBeenCalledWith(moved);
    expect(repository.restore).not.toHaveBeenCalled();
  });

  it('expires deletion Undo after six seconds and keeps it available with a screen reader', async () => {
    const repository = makeRepository();
    await mount(repository);
    jest.useFakeTimers();
    await act(async () => { await context.removeWithUndo(original.id); });
    await act(() => { jest.advanceTimersByTime(6000); });
    expect(context.undoNotice).toBeNull();
    await act(() => screenReaderChanged(true));
    await act(async () => { await context.removeWithUndo(original.id); });
    await act(() => { jest.advanceTimersByTime(60000); });
    expect(context.undoNotice?.message).toBe('Tarea eliminada');
  });

  it('resets only Pending and compact scroll after creation, not after text edits', async () => {
    const repository = makeRepository();
    await mount(repository);
    context.scrollMemory.set('pending', 200);
    context.scrollMemory.set('compact', 300);
    context.scrollMemory.set('done', 400);
    await act(async () => { await context.update(original.id, input); });
    expect(context.scrollMemory.get('pending')).toBe(200);
    expect(context.scrollMemory.get('compact')).toBe(300);
    await act(async () => { await context.create(input); });
    expect(context.scrollMemory.get('pending')).toBe(0);
    expect(context.scrollMemory.get('compact')).toBe(0);
    expect(context.scrollMemory.get('done')).toBe(400);
  });

  it('preserves every scroll offset and creation revision when creating fails', async () => {
    const repository = makeRepository();
    repository.create.mockRejectedValueOnce(new Error('No se pudo guardar'));
    await mount(repository);
    context.scrollMemory.set('pending', 120);
    context.scrollMemory.set('in_progress', 240);
    context.scrollMemory.set('done', 360);
    context.scrollMemory.set('compact', 480);
    const revision = context.creationRevision;
    await act(async () => { await expect(context.create(input)).rejects.toThrow('No se pudo guardar'); });
    expect(context.creationRevision).toBe(revision);
    expect(context.tasks).toEqual([original]);
    expect(context.scrollMemory.get('pending')).toBe(120);
    expect(context.scrollMemory.get('in_progress')).toBe(240);
    expect(context.scrollMemory.get('done')).toBe(360);
    expect(context.scrollMemory.get('compact')).toBe(480);
  });
});
