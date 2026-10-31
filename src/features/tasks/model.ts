export const STATUSES = ['pending', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  done: 'Hecho',
};

export interface TaskInput {
  title: string;
  description: string;
  status: TaskStatus;
}

export interface Task extends TaskInput {
  id: string;
  createdAt: number;
  updatedAt: number;
  columnEnteredAt: number;
}

export function validateTaskInput(input: unknown): TaskInput {
  if (!input || typeof input !== 'object') {
    throw new Error('Los datos de la tarea no son válidos.');
  }
  const { title, description, status } = input as Record<string, unknown>;
  if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 120) {
    throw new Error('El título debe tener entre 1 y 120 caracteres.');
  }
  if (typeof description !== 'string' || description.length > 2000) {
    throw new Error('La descripción debe tener como máximo 2000 caracteres.');
  }
  if (!STATUSES.includes(status as TaskStatus)) {
    throw new Error('El estado de la tarea no es válido.');
  }
  return { title: title.trim(), description, status: status as TaskStatus };
}

/** Newest column entry first; IDs use a locale-independent ascending tie-break. */
export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) =>
    b.columnEnteredAt - a.columnEnteredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}
