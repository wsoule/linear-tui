import { useEffect, useState } from "react"
import { getGitSummary, type GitSummary } from "./repository"

export function useGitSummary(intervalMs = 5000): GitSummary | null {
  const [summary, setSummary] = useState<GitSummary | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = () => {
      void getGitSummary().then((next) => {
        if (!cancelled) setSummary(next)
      })
    }

    load()
    const interval = setInterval(load, intervalMs)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [intervalMs])

  return summary
}
