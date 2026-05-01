import { useRef } from "react"
import { useKeyboard } from "@opentui/react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { getIssueDetail, issueDetailKey, type IssueDetailData } from "../linear/queries"
import { useCachedQuery } from "../linear/use-query"
import { StatusBadge } from "../components/status-badge"
import { targetFromDetail, useIssueActions } from "../components/issue-actions"
import { theme } from "../theme"

export function IssueDetail({ issueId, active }: { issueId: string; active: boolean }) {
  const { data: detail, error } = useCachedQuery<IssueDetailData>(
    issueDetailKey(issueId),
    () => getIssueDetail(issueId),
  )
  const scrollRef = useRef<ScrollBoxRenderable | null>(null)
  const { handleIssueKey } = useIssueActions()

  useKeyboard((key) => {
    if (!active) return
    if (detail && handleIssueKey(key, targetFromDetail(detail), true)) return
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

  if (!detail && error) {
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
        <text fg={theme.fgDim}>no cached issue data yet</text>
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
      <text fg={theme.fgMuted}>s status · a assign · c comment · o open · y copy · esc back</text>
    </scrollbox>
  )
}
