import { describe, expect, it } from '@jest/globals';
import { STATUSES, STATUS_LABELS, sortTasks, validateTaskInput, type Task } from '../src/features/tasks/model';
import { tasksReducer } from '../src/features/tasks/reducer';

const input = { title: '  Preparar entrega  ', description: '  Notas  ', status: 'pending' as const };
const task = (id: string, columnEnteredAt: number): Task => ({
  ...input, id, columnEnteredAt, createdAt: 1, updatedAt: 2,
});

describe('task model (no mocks)', () => {
  it('exposes ordered statuses and Spanish labels', () => {
    expect(STATUSES).toEqual(['pending', 'in_progress', 'done']);
    expect(STATUSES.map((status) => STATUS_LABELS[status])).toEqual(['Pendiente', 'En progreso', 'Hecho']);
  });

  it('trims the title, preserves description whitespace, and leaves input untouched', () => {
    expect(validateTaskInput(input)).toEqual({ ...input, title: 'Preparar entrega' });
    expect(input.title).toBe('  Preparar entrega  ');
    expect(validateTaskInput({ ...input, title: ` ${'a'.repeat(120)} `, description: 'b'.repeat(2000) }).title).toHaveLength(120);
    expect(validateTaskInput({ ...input, title: 'a', description: '' }).description).toBe('');
  });

  it.each([
    [null, /datos/],
    [{ ...input, title: ' \n\t ' }, /título/],
    [{ ...input, title: 'a'.repeat(121) }, /título/],
    [{ ...input, title: 123 }, /título/],
    [{ ...input, description: 'a'.repeat(2001) }, /descripción/],
    [{ ...input, description: null }, /descripción/],
    [{ ...input, status: 'archived' }, /estado/],
    [{ ...input, status: undefined }, /estado/],
  ])('rejects invalid input %j with a Spanish Error', (invalid: unknown, message: unknown) => {
    expect(() => validateTaskInput(invalid)).toThrow(message as RegExp);
  });

  it('sorts newest first, breaks ties by ascending ID, and preserves equal-key order without mutation', () => {
    const first = task('a', 20);
    const second = { ...first, title: 'Segundo' };
    const original = [task('z', 10), task('b', 20), first, second, task('x', 30)];
    const before = [...original];
    expect(sortTasks(original)).toEqual([original[4], first, second, original[1], original[0]]);
    expect(original).toEqual(before);
  });

  it('loads, replaces rather than duplicates, reorders moves, and removes immutably', () => {
    const initial = [task('a', 10), task('b', 20)];
    const loaded = tasksReducer([], { type: 'load', tasks: initial });
    expect(loaded.map(({ id }) => id)).toEqual(['b', 'a']);
    const moved = { ...initial[0], columnEnteredAt: 30, status: 'done' as const };
    const updated = tasksReducer(loaded, { type: 'upsert', task: moved });
    expect(updated).toEqual([moved, initial[1]]);
    expect(tasksReducer(updated, { type: 'remove', id: 'a' })).toEqual([initial[1]]);
    expect(initial[0].status).toBe('pending');
  });
});
