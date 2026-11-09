import type { Task } from './model';

/** Literal phrase matching, insensitive to case and combining accents. */
export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function filterTasks(tasks: readonly Task[], query: string): Task[] {
  const term = normalizeSearch(query);
  return tasks.filter(task => !term || normalizeSearch(task.title).includes(term)
    || normalizeSearch(task.description).includes(term));
}
