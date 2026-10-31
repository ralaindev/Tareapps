import { sortTasks, type Task } from './model';

export type TasksAction =
  | { type: 'load'; tasks: Task[] }
  | { type: 'upsert'; task: Task }
  | { type: 'remove'; id: string };

export function tasksReducer(state: Task[], action: TasksAction): Task[] {
  switch (action.type) {
    case 'load':
      return sortTasks(action.tasks);
    case 'upsert':
      return sortTasks([...state.filter((task) => task.id !== action.task.id), action.task]);
    case 'remove':
      return state.filter((task) => task.id !== action.id);
  }
}
