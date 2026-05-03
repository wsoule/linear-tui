import { useEffect, useState } from "react"
import { getGhCurrentPullRequest, type GhPullRequest } from "./cli"

export function useCurrentPullRequest(intervalMs = 60000): GhPullRequest | null {
  const [pullRequest, setPullRequest] = useState<GhPullRequest | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = () => {
      void getGhCurrentPullRequest()
        .then((next) => {
          if (!cancelled) setPullRequest(next)
        })
        .catch(() => {
          if (!cancelled) setPullRequest(null)
        })
    }

    load()
    const interval = setInterval(load, intervalMs)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [intervalMs])

  return pullRequest
}
