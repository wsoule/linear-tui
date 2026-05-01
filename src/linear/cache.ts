type Entry = { value: unknown; expiry: number }

const store = new Map<string, Entry>()

const DEFAULT_TTL = 30_000

export function peek<T>(key: string): T | undefined {
  const hit = store.get(key)
  if (!hit) return undefined
  if (hit.expiry <= Date.now()) {
    store.delete(key)
    return undefined
  }
  return hit.value as T
}

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL,
): Promise<T> {
  const fresh = peek<T>(key)
  if (fresh !== undefined) return fresh
  const value = await fetcher()
  store.set(key, { value, expiry: Date.now() + ttlMs })
  return value
}

export function invalidate(prefix?: string): void {
  if (!prefix) {
    store.clear()
    return
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
