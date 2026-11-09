import { describe, expect, it } from '@jest/globals';
import { filterTasks, normalizeSearch } from '../src/features/tasks/search';
import type { Task } from '../src/features/tasks/model';

const tasks: Task[] = [
  { id: 'b', title: 'Revisión del salón', description: '', status: 'pending', createdAt: 1, updatedAt: 2, columnEnteredAt: 1 },
  { id: 'a', title: 'Comprar pan', description: 'Llevar CAFÉ para mañana', status: 'done', createdAt: 1, updatedAt: 2, columnEnteredAt: 3 },
];

describe('Task search', () => {
  it('matches partial literal phrases in title or description without case or accents', () => {
    expect(filterTasks(tasks, '  REVISION DEL  ')).toEqual([tasks[0]]);
    expect(filterTasks(tasks, 'cafe para')).toEqual([tasks[1]]);
    expect(filterTasks(tasks, 'revisio\u0301n')).toEqual([tasks[0]]);
  });

  it('does not tokenize, interpret regex, or join title and description', () => {
    expect(filterTasks(tasks, 'revision salon')).toEqual([]);
    expect(filterTasks(tasks, '.*')).toEqual([]);
    expect(filterTasks(tasks, 'pan llevar')).toEqual([]);
  });

  it('treats whitespace-only input as no search and preserves order, identity and data', () => {
    const snapshot = JSON.stringify(tasks);
    expect(filterTasks(tasks, '  \n ')).toEqual(tasks);
    expect(filterTasks(tasks, 'a').map(task => task.id)).toEqual(['b', 'a']);
    expect(filterTasks(tasks, 'a')[0]).toBe(tasks[0]);
    expect(JSON.stringify(tasks)).toBe(snapshot);
    expect(normalizeSearch('  ÁÉÍÓÚ Ü Ñ  ')).toBe('aeiou u n');
  });
});
