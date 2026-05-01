import { useEffect, useState } from "react"
import { peek } from "./cache"

export function useCachedQuery<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(() => peek<T>(key) ?? null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cached = peek<T>(key)
    if (cached) {
      setData(cached)
      setError(null)
      return
    }
    setData(null)
    setError(null)
    let cancelled = false
    fetcher()
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(String(e?.message ?? e)) })
    return () => { cancelled = true }
  }, [key])

  return { data, error }
}
