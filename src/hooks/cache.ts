// Session-lifetime caches for data hooks. Entries live until the app
// restarts or a hook asks for a refresh.

type Listener = () => void;

// Every cache, so a change of signed-in user can empty them all at once.
const registry = new Set<ResourceCache<unknown>>();

/**
 * Empties every cache without notifying listeners. Call when the signed-in
 * user changes; the screens that listened belong to the previous user's tree
 * and are about to unmount.
 */
export function resetAllCaches(): void {
  registry.forEach((c) => c.reset());
}

export class ResourceCache<T> {
  private values = new Map<string, T>();
  private inflight = new Map<string, Promise<T>>();
  private listeners = new Set<Listener>();
  /** Bumped by reset() so requests started before it can't write back. */
  private generation = 0;

  constructor() {
    registry.add(this as ResourceCache<unknown>);
  }

  reset(): void {
    this.generation += 1;
    this.values.clear();
    this.inflight.clear();
  }

  get(key: string): T | undefined {
    return this.values.get(key);
  }

  has(key: string): boolean {
    return this.values.has(key);
  }

  set(key: string, value: T): void {
    this.values.set(key, value);
    this.listeners.forEach((l) => l());
  }

  delete(key: string): void {
    this.values.delete(key);
    this.listeners.forEach((l) => l());
  }

  clear(): void {
    this.values.clear();
    this.inflight.clear();
    this.listeners.forEach((l) => l());
  }

  /** Returns the cached value, or loads it once even when several callers ask at the same time. */
  load(key: string, loader: () => Promise<T>, force = false): Promise<T> {
    if (!force && this.values.has(key)) return Promise.resolve(this.values.get(key) as T);
    const pending = this.inflight.get(key);
    if (pending && !force) return pending;
    const generation = this.generation;
    const p = loader()
      .then((value) => {
        // A response for the previous user must not land in the new user's cache.
        if (generation === this.generation) this.set(key, value);
        return value;
      })
      .finally(() => {
        if (generation === this.generation) this.inflight.delete(key);
      });
    this.inflight.set(key, p);
    return p;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

/** Runs `tasks` with at most `limit` in flight. Failed tasks resolve to undefined. */
export async function runLimited<T>(tasks: (() => Promise<T>)[], limit: number): Promise<(T | undefined)[]> {
  const results: (T | undefined)[] = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      try {
        results[i] = await tasks[i]();
      } catch {
        results[i] = undefined;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

export interface HookResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function errorMessage(err: unknown, fallback = "Couldn't load this."): string {
  return err instanceof Error ? err.message : fallback;
}
