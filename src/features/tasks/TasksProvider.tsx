import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { STATUS_LABELS, type Task, type TaskInput, type TaskStatus } from './model';
import { tasksReducer } from './reducer';
import { taskRepository } from './repository';
import { BoardScrollMemory } from './scrollMemory';

type UndoSnapshot = {
  kind: 'move';
  previous: Task;
  expectedUpdatedAt: number;
} | { kind: 'delete'; previous: Task };

interface TasksContextValue {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  busy: boolean;
  reload: () => Promise<void>;
  create: (input: TaskInput) => Promise<Task>;
  update: (id: string, input: TaskInput) => Promise<Task>;
  remove: (id: string) => Promise<void>;
  removeWithUndo: (id: string) => Promise<void>;
  move: (id: string, status: TaskStatus) => Promise<void>;
  undo: () => Promise<void>;
  undoNotice: { taskId: string; message: string } | null;
  dismissUndo: () => void;
  selectedColumn: number;
  setSelectedColumn: (column: number) => void;
  creationRevision: number;
  scrollMemory: BoardScrollMemory;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children, repository = taskRepository }: {
  children: ReactNode;
  repository?: typeof taskRepository;
}) {
  const [tasks, dispatch] = useReducer(tasksReducer, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const busyRef = useRef(true);
  const [selectedColumn, setSelectedColumn] = useState(0);
  const [creationRevision, setCreationRevision] = useState(0);
  const [scrollMemory] = useState(() => new BoardScrollMemory());
  // Unknown accessibility state keeps Undo available until the query completes.
  const [screenReader, setScreenReader] = useState<boolean | null>(null);
  const [snapshot, setSnapshot] = useState<UndoSnapshot | null>(null);
  const snapshotRef = useRef<UndoSnapshot | null>(null);
  const expiresAt = useRef<number | null>(null);

  const dismissUndo = useCallback(() => {
    snapshotRef.current = null;
    expiresAt.current = null;
    setSnapshot(null);
  }, []);

  const invalidateUndo = useCallback((id: string) => {
    if (snapshotRef.current?.previous.id === id) dismissUndo();
  }, [dismissUndo]);

  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
      changed = true;
      if (active) setScreenReader(enabled);
    });
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (active && !changed) setScreenReader(enabled);
    }).catch(() => {
      // If detection fails, preserve the accessible, non-expiring notice.
    });
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    expiresAt.current = null;
    if (!snapshot || screenReader !== false) return;
    expiresAt.current = Date.now() + 6000;
    const timer = setTimeout(() => {
      if (snapshotRef.current === snapshot) dismissUndo();
    }, 6000);
    return () => { clearTimeout(timer); };
  }, [snapshot, screenReader, dismissUndo]);

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    if (busyRef.current) throw new Error('Hay una operación en curso. Inténtalo de nuevo.');
    busyRef.current = true;
    setBusy(true);
    try {
      return await operation();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const reload = useCallback(() => run(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await repository.load();
      dispatch({ type: 'load', tasks: loaded });
    } catch {
      setError('No se pudieron cargar las tareas. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }), [repository, run]);

  useEffect(() => {
    let active = true;
    busyRef.current = true;
    async function loadInitialTasks() {
      try {
        const loaded = await repository.load();
        if (active) {
          dispatch({ type: 'load', tasks: loaded });
          setError(null);
        }
      } catch {
        if (active) setError('No se pudieron cargar las tareas. Inténtalo de nuevo.');
      } finally {
        if (active) {
          busyRef.current = false;
          setBusy(false);
          setLoading(false);
        }
      }
    }
    void loadInitialTasks();
    return () => { active = false; };
  }, [repository]);

  const create = useCallback((input: TaskInput) => run(async () => {
    const task = await repository.create(input);
    scrollMemory.resetForCreation();
    dispatch({ type: 'upsert', task });
    setSelectedColumn(0);
    setCreationRevision(revision => revision + 1);
    return task;
  }), [repository, run, scrollMemory]);

  const update = useCallback((id: string, input: TaskInput) => run(async () => {
    const task = await repository.update(id, input);
    dispatch({ type: 'upsert', task });
    invalidateUndo(id);
    return task;
  }), [repository, run, invalidateUndo]);

  const remove = useCallback((id: string) => run(async () => {
    await repository.remove(id);
    dispatch({ type: 'remove', id });
    invalidateUndo(id);
  }), [repository, run, invalidateUndo]);

  const removeWithUndo = useCallback((id: string) => run(async () => {
    const previous = await repository.removeWithSnapshot(id);
    dispatch({ type: 'remove', id });
    const next: UndoSnapshot = { kind: 'delete', previous: { ...previous } };
    snapshotRef.current = next;
    setSnapshot(next);
    AccessibilityInfo.announceForAccessibility(`Tarea eliminada: ${previous.title}. Puedes deshacer el borrado.`);
  }), [repository, run]);

  const move = useCallback((id: string, status: TaskStatus) => run(async () => {
    const { task, previous } = await repository.move(id, status);
    dispatch({ type: 'upsert', task });
    invalidateUndo(id);
    const next: UndoSnapshot = { kind: 'move', previous: { ...previous }, expectedUpdatedAt: task.updatedAt };
    snapshotRef.current = next;
    setSnapshot(next);
    AccessibilityInfo.announceForAccessibility(`Tarea movida a ${STATUS_LABELS[task.status]}. Puedes deshacer el movimiento.`);
  }), [repository, run, invalidateUndo]);

  const undo = useCallback(() => run(async () => {
    const current = snapshotRef.current;
    if (!current) throw new Error('No hay ninguna acción para deshacer.');
    if (expiresAt.current !== null && Date.now() >= expiresAt.current) {
      dismissUndo();
      throw new Error('El plazo para deshacer ha terminado.');
    }
    // Keep the snapshot on failure, so storage errors can be retried.
    const task = current.kind === 'delete'
      ? await repository.restoreDeleted(current.previous)
      : await repository.restore(current.previous, current.expectedUpdatedAt);
    dispatch({ type: 'upsert', task });
    if (snapshotRef.current === current) dismissUndo();
    AccessibilityInfo.announceForAccessibility(current.kind === 'delete' ? 'Tarea restaurada.' : 'Movimiento deshecho.');
  }), [repository, run, dismissUndo]);

  const value = useMemo<TasksContextValue>(() => ({
    tasks, loading, error, busy, reload, create, update, remove, removeWithUndo, move, undo,
    undoNotice: snapshot ? {
      taskId: snapshot.previous.id,
      message: snapshot.kind === 'delete' ? 'Tarea eliminada' : 'Tarea movida',
    } : null,
    dismissUndo, selectedColumn, setSelectedColumn, creationRevision, scrollMemory,
  }), [tasks, loading, error, busy, reload, create, update, remove, removeWithUndo, move, undo, snapshot, dismissUndo, selectedColumn, creationRevision, scrollMemory]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const context = useContext(TasksContext);
  if (!context) throw new Error('useTasks debe usarse dentro de TasksProvider.');
  return context;
}
