import { useEffect, useState } from "react"
import { peekStale, subscribe } from "./cache"

export function useCachedQuery<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(() => peekStale<T>(key) ?? null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(() => !peekStale<T>(key))

  useEffect(() => {
    const syncFromCache = () => {
      const cached = peekStale<T>(key)
      setData(cached ?? null)
      if (cached !== undefined) {
        setError(null)
      }
    }

    const cached = peekStale<T>(key)
    if (cached !== undefined) {
      setData(cached)
      setError(null)
    } else {
      setData(null)
    }

    let cancelled = false
    setRefreshing(true)
    fetcher()
      .then((d) => {
        if (cancelled) return
        setData(d)
        setError(null)
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e))
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false)
      })

    const unsubscribe = subscribe(key, syncFromCache)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [key])

  return { data, error, refreshing }
}
