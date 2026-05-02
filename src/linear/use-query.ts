import { useEffect, useState } from "react"
import { peek, peekStale, subscribe } from "./cache"
import { beginRequest, recordError } from "./activity"

export function useCachedQuery<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(() => peekStale<T>(key) ?? null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(() => !peekStale<T>(key))

  useEffect(() => {
    let cancelled = false
    let requestId = 0

    const load = () => {
      const request = ++requestId
      setRefreshing(true)
      const end = beginRequest()
      fetcher()
        .then((d) => {
          if (cancelled || request !== requestId) return
          setData(d)
          setError(null)
        })
        .catch((e) => {
          const message = recordError(e)
          if (!cancelled && request === requestId) setError(message)
        })
        .finally(() => {
          end()
          if (!cancelled && request === requestId) setRefreshing(false)
        })
    }

    const syncFromCache = () => {
      const cached = peekStale<T>(key)
      setData(cached ?? null)
      if (cached !== undefined) {
        setError(null)
        setRefreshing(false)
      } else {
        load()
      }
    }

    const fresh = peek<T>(key)
    if (fresh !== undefined) {
      setData(fresh)
      setError(null)
      setRefreshing(false)
    } else {
      const cached = peekStale<T>(key)
      setData(cached ?? null)
      load()
    }

    const unsubscribe = subscribe(key, syncFromCache)
    return () => {
      cancelled = true
      requestId += 1
      unsubscribe()
    }
  }, [key])

  return { data, error, refreshing }
}
