import type { TaskStatus } from './model';

type ScrollKey = TaskStatus | 'compact';

/** Session-only UI memory. Updating scroll offsets never triggers a React render. */
export class BoardScrollMemory {
  private offsets = new Map<ScrollKey, number>();

  get(key: ScrollKey): number { return this.offsets.get(key) ?? 0; }
  set(key: ScrollKey, offset: number): void { this.offsets.set(key, Math.max(0, offset)); }
  resetForCreation(): void { this.set('pending', 0); this.set('compact', 0); }
}
