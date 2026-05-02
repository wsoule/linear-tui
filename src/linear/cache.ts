type Entry = { value: unknown; expiry: number }

const store = new Map<string, Entry>()
const listeners = new Map<string, Set<() => void>>()

const DEFAULT_TTL = 30_000

function notify(key: string): void {
  listeners.get(key)?.forEach((listener) => listener())
}

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
  notify(key)
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
  const keys = new Set([...store.keys(), ...listeners.keys()])
  if (!prefix) {
    store.clear()
    keys.forEach(notify)
    return
  }
  for (const key of keys) {
    if (key.startsWith(prefix)) {
      store.delete(key)
      notify(key)
    }
  }
}
