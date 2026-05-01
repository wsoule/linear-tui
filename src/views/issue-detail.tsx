import { useEffect, useRef, useState } from "react"
import { useKeyboard } from "@opentui/react"
import type { ScrollBoxRenderable } from "@opentui/core"
import type { Issue, User, WorkflowState, Team } from "@linear/sdk"
import { getIssueDetail, issueDetailKey } from "../linear/queries"
import { peek } from "../linear/cache"
import { StatusBadge } from "../components/status-badge"
import { theme } from "../theme"

type Detail = {
  issue: Issue
  state: WorkflowState | undefined
  assignee: User | undefined
  team: Team | undefined
  comments: { comment: { body: string; createdAt: Date }; user: User | undefined }[]
}

export function IssueDetail({ issueId }: { issueId: string }) {
  const [detail, setDetail] = useState<Detail | null>(
    () => peek<Detail>(issueDetailKey(issueId)) ?? null,
  )
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<ScrollBoxRenderable | null>(null)

  useEffect(() => {
    setError(null)
    const cached = peek<Detail>(issueDetailKey(issueId))
    if (cached) {
      setDetail(cached)
      return
    }
    setDetail(null)
    let cancelled = false
    getIssueDetail(issueId)
      .then((d) => { if (!cancelled) setDetail(d as Detail) })
      .catch((e) => { if (!cancelled) setError(String(e?.message ?? e)) })
    return () => { cancelled = true }
  }, [issueId])

  useKeyboard((key) => {
    const sb = scrollRef.current
    if (!sb) return
    switch (key.name) {
      case "j":
      case "down":
        sb.scrollBy({ x: 0, y: 1 }); break
      case "k":
      case "up":
        sb.scrollBy({ x: 0, y: -1 }); break
      case "d":
        if (key.ctrl) sb.scrollBy({ x: 0, y: 10 }); break
      case "u":
        if (key.ctrl) sb.scrollBy({ x: 0, y: -10 }); break
      case "pagedown":
      case "space":
        sb.scrollBy(1, "viewport"); break
      case "pageup":
        sb.scrollBy(-1, "viewport"); break
      case "g":
        sb.scrollTo({ x: 0, y: 0 }); break
      case "G":
        sb.scrollTo({ x: 0, y: Number.MAX_SAFE_INTEGER }); break
    }
  })

  if (error) {
    return (
      <box style={{ padding: 1, flexDirection: "column" }}>
        <text fg={theme.danger}>error: {error}</text>
        <text fg={theme.fgMuted}>esc to go back</text>
      </box>
    )
  }
  if (!detail) {
    return (
      <box style={{ padding: 1 }}>
        <text fg={theme.fgDim}>loading issue…</text>
      </box>
    )
  }

  const { issue, state, assignee, team, comments } = detail

  return (
    <scrollbox ref={scrollRef} style={{ flexGrow: 1, padding: 1 }} stickyScroll={false}>
      <box style={{ flexDirection: "row" }}>
        <text fg={theme.fgMuted}>{issue.identifier}  </text>
        <StatusBadge state={state} />
        <text fg={theme.fgDim}>{` ${state?.name ?? "?"}`}</text>
      </box>
      <text fg={theme.fg} attributes={1}>{issue.title}</text>
      <text fg={theme.fgMuted}> </text>
      <box style={{ flexDirection: "row" }}>
        <text fg={theme.fgMuted}>team: </text>
        <text fg={theme.fgDim}>{team?.key ?? "?"}</text>
        <text fg={theme.fgMuted}>   assignee: </text>
        <text fg={theme.fgDim}>{assignee?.displayName ?? "—"}</text>
        <text fg={theme.fgMuted}>   priority: </text>
        <text fg={theme.priority[issue.priority] ?? theme.fgDim}>
          {issue.priorityLabel}
        </text>
      </box>
      <text fg={theme.fgMuted}> </text>
      <text fg={theme.fgMuted}>───── description ─────</text>
      <text fg={theme.fg}>{issue.description ?? "(no description)"}</text>
      <text fg={theme.fgMuted}> </text>
      <text fg={theme.fgMuted}>───── comments ({comments.length}) ─────</text>
      {comments.length === 0 ? (
        <text fg={theme.fgDim}>(none)</text>
      ) : (
        comments.map((c, i) => (
          <box key={i} style={{ flexDirection: "column", marginTop: 1 }}>
            <text fg={theme.accent}>
              {c.user?.displayName ?? "?"}
              <span fg={theme.fgMuted}>{`  ${new Date(c.comment.createdAt).toLocaleString()}`}</span>
            </text>
            <text fg={theme.fg}>{c.comment.body}</text>
          </box>
        ))
      )}
      <text fg={theme.fgMuted}> </text>
      <text fg={theme.fgMuted}>j/k scroll · ctrl+d/u half-page · g/G top/bottom · esc back</text>
    </scrollbox>
  )
}
