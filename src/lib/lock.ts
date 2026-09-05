const chains = new Map<string, Promise<unknown>>();

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve();
  const current = previous.then(fn, fn);
  chains.set(
    key,
    current.then(
      () => undefined,
      () => undefined,
    ),
  );
  return current;
}
