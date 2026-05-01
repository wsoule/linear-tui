import { useEffect, useState } from "react"
import { peek, peekStale, subscribe } from "./cache"
import { beginRequest, recordError } from "./activity"

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

    const fresh = peek<T>(key)
    if (fresh !== undefined) {
      setData(fresh)
      setError(null)
      setRefreshing(false)
      return subscribe(key, syncFromCache)
    }

    let cancelled = false
    const cached = peekStale<T>(key)
    setData(cached ?? null)
    setRefreshing(true)
    const end = beginRequest()
    fetcher()
      .then((d) => {
        if (cancelled) return
        setData(d)
        setError(null)
      })
      .catch((e) => {
        const message = recordError(e)
        if (!cancelled) setError(message)
      })
      .finally(() => {
        end()
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
