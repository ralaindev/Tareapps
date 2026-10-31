let tail: Promise<unknown> = Promise.resolve();

/** All repositories share this queue so queries cannot join another async transaction. */
export function enqueueDatabase<T>(operation: () => Promise<T>): Promise<T> {
  const result = tail.then(operation);
  tail = result.catch(() => undefined);
  return result;
}
