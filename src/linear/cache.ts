type Entry = { value: unknown; expiry: number }

const store = new Map<string, Entry>()
const listeners = new Map<string, Set<() => void>>()

const DEFAULT_TTL = 30_000

export function peek<T>(key: string): T | undefined {
  const hit = store.get(key)
  if (!hit) return undefined
  if (hit.expiry <= Date.now()) return undefined
  return hit.value as T
}

export function peekStale<T>(key: string): T | undefined {
  return store.get(key)?.value as T | undefined
}

export function remember<T>(
  key: string,
  value: T,
  ttlMs: number = DEFAULT_TTL,
): T {
  store.set(key, { value, expiry: Date.now() + ttlMs })
  listeners.get(key)?.forEach((listener) => listener())
  return value
}

export function cacheKeys(): string[] {
  return [...store.keys()]
}

export function subscribe(key: string, listener: () => void): () => void {
  const set = listeners.get(key) ?? new Set<() => void>()
  set.add(listener)
  listeners.set(key, set)
  return () => {
    set.delete(listener)
    if (set.size === 0) listeners.delete(key)
  }
}

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL,
): Promise<T> {
  const fresh = peek<T>(key)
  if (fresh !== undefined) return fresh
  const value = await fetcher()
  return remember(key, value, ttlMs)
}

export function invalidate(prefix?: string): void {
  if (!prefix) {
    const keys = [...store.keys()]
    store.clear()
    keys.forEach((key) => listeners.get(key)?.forEach((listener) => listener()))
    return
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key)
      listeners.get(key)?.forEach((listener) => listener())
    }
  }
}
