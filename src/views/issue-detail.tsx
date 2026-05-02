import { useEffect, useRef, useState } from "react"
import { useKeyboard } from "@opentui/react"
import type { ScrollBoxRenderable } from "@opentui/core"
import type { Attachment, Issue } from "@linear/sdk"
import {
  getIssueDetail,
  issueDetailKey,
  type IssueDetailData,
  type IssueRelationRow,
  type IssueRow,
} from "../linear/queries"
import { useCachedQuery } from "../linear/use-query"
import { StatusBadge } from "../components/status-badge"
import { openUrl, targetFromDetail, useIssueActions } from "../components/issue-actions"
import { useStore } from "../state/store"
import { theme } from "../theme"

export function IssueDetail({ issueId, active }: { issueId: string; active: boolean }) {
  const { data: detail, error } = useCachedQuery<IssueDetailData>(
    issueDetailKey(issueId),
    () => getIssueDetail(issueId),
  )
  const scrollRef = useRef<ScrollBoxRenderable | null>(null)
  const [attachmentIndex, setAttachmentIndex] = useState(0)
  const { handleIssueKey } = useIssueActions()
  const { addToast, keybindings } = useStore()

  useEffect(() => {
    setAttachmentIndex(0)
  }, [issueId])

  useEffect(() => {
    const count = detail?.attachments?.length ?? 0
    if (count > 0 && attachmentIndex >= count) setAttachmentIndex(count - 1)
  }, [attachmentIndex, detail?.attachments?.length])

  const openAttachment = (attachment: Attachment) => {
    void openUrl(attachment.url)
      .then(() => addToast(`opened ${attachment.title}`, "success"))
      .catch((e) => addToast(String(e instanceof Error ? e.message : e), "error"))
  }

  useKeyboard((key) => {
    if (!active) return
    const attachments = detail?.attachments ?? []
    if (attachments.length > 0) {
      if (key.name === "tab") {
        setAttachmentIndex((i) => (i + 1) % attachments.length)
        return
      }
      if (key.name === "return") {
        openAttachment(attachments[attachmentIndex]!)
        return
      }
    }
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
        sb.scrollTo({ x: 0, y: key.shift ? Number.MAX_SAFE_INTEGER : 0 }); break
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

  const { issue, state, assignee, team } = detail
  const comments = detail.comments ?? []
  const children = detail.children ?? []
  const relations = detail.relations ?? []
  const attachments = detail.attachments ?? []

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
      {children.length > 0 ? (
        <>
          <text fg={theme.fgMuted}>───── sub-issues ({children.length}) ─────</text>
          {children.map((row) => <SubIssueRow key={row.issue.id} row={row} />)}
          <text fg={theme.fgMuted}> </text>
        </>
      ) : null}
      {relations.length > 0 ? (
        <>
          <text fg={theme.fgMuted}>───── relations ({relations.length}) ─────</text>
          {relations.map((row) => <RelationRow key={row.relation.id} row={row} currentIssue={issue} />)}
          <text fg={theme.fgMuted}> </text>
        </>
      ) : null}
      {attachments.length > 0 ? (
        <>
          <text fg={theme.fgMuted}>───── attachments ({attachments.length}) ─────</text>
          {attachments.map((attachment, i) => (
            <AttachmentRow
              key={attachment.id}
              attachment={attachment}
              selected={i === attachmentIndex}
            />
          ))}
          <text fg={theme.fgMuted}> </text>
        </>
      ) : null}
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
      <text fg={theme.fgMuted}>
        {`${keybindings.issueStatus} status · ${keybindings.issueAssign} assign · ${keybindings.issueComment} comment · ${keybindings.issueNewSubIssue} sub-issue · ${keybindings.issueCopyBranch} branch · ${keybindings.issueCopyId} id · esc back`}
      </text>
    </scrollbox>
  )
}

function SubIssueRow({ row }: { row: IssueRow }) {
  return (
    <box style={{ flexDirection: "row" }}>
      <text fg={theme.fgMuted}>{` ${row.issue.identifier.padEnd(10)} `}</text>
      <StatusBadge state={row.state} />
      <text fg={theme.fg}>{` ${row.issue.title}`}</text>
      <text fg={theme.fgMuted}>{`  @${row.assignee?.displayName ?? "-"}`}</text>
    </box>
  )
}

function relationTarget(row: IssueRelationRow, currentIssue: Issue): Issue | undefined {
  if (row.direction === "outbound") return row.relatedIssue
  if (row.issue?.id === currentIssue.id) return row.relatedIssue
  return row.issue
}

function RelationRow({ row, currentIssue }: { row: IssueRelationRow; currentIssue: Issue }) {
  const target = relationTarget(row, currentIssue)
  const direction = row.direction === "outbound" ? "->" : "<-"
  return (
    <box style={{ flexDirection: "row" }}>
      <text fg={theme.fgMuted}>{` ${row.relation.type.padEnd(10)} ${direction} `}</text>
      <text fg={theme.accent}>{target?.identifier ?? "unknown"}</text>
      <text fg={theme.fg}>{` ${target?.title ?? "(unavailable issue)"}`}</text>
    </box>
  )
}

function AttachmentRow({ attachment, selected }: { attachment: Attachment; selected: boolean }) {
  return (
    <box
      style={{
        flexDirection: "column",
        backgroundColor: selected ? theme.bgSelected : theme.bg,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <box style={{ flexDirection: "row" }}>
        <text fg={selected ? theme.accent : theme.fgMuted}>{selected ? "▌" : " "}</text>
        <text fg={theme.fg}>{attachment.title}</text>
        <text fg={theme.fgMuted}>{attachment.sourceType ? `  ${attachment.sourceType}` : ""}</text>
      </box>
      {attachment.subtitle ? <text fg={theme.fgDim}>{`  ${attachment.subtitle}`}</text> : null}
      <text fg={theme.fgMuted}>{`  ${attachment.url}`}</text>
    </box>
  )
}
