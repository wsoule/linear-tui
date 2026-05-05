import { useEffect, useState } from "react"
import { useKeyboard } from "@opentui/react"
import type { Issue } from "@linear/sdk"
import { createGhPullRequest, openGhPullRequestChecks, type GhPullRequest } from "../github/cli"
import { useCurrentPullRequest } from "../github/use-current-pr"
import { useGitSummary } from "../git/use-git-summary"
import { getIssueDetail, resolveIssueIdentifier, type IssueDetailData } from "../linear/queries"
import { actorName, describeIssueHistory } from "../linear/history"
import { openUrl, targetFromDetail, useIssueActions } from "../components/issue-actions"
import { StatusBadge } from "../components/status-badge"
import { useStore } from "../state/store"
import { isVimAcceptKey } from "../keybindings"
import { theme } from "../theme"

function ellipsize(value: string, max: number): string {
  if (value.length <= max) return value
  if (max <= 1) return value.slice(0, max)
  return `${value.slice(0, max - 1)}…`
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString()
}

export function WorkView({ active }: { active: boolean }) {
  const git = useGitSummary()
  const pullRequest = useCurrentPullRequest()
  const { setSelectedIssueId, setView, addToast, keybindings, reloadToken } = useStore()
  const { handleIssueKey } = useIssueActions()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [detail, setDetail] = useState<IssueDetailData | null>(null)
  const [issueError, setIssueError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIssue(null)
    setDetail(null)
    setIssueError(null)

    const identifier = git?.issueIdentifier
    if (!identifier) return

    resolveIssueIdentifier(identifier)
      .then(async (resolved) => {
        if (cancelled) return
        setIssue(resolved)
        const nextDetail = await getIssueDetail(resolved.id)
        if (!cancelled) setDetail(nextDetail)
      })
      .catch((e) => {
        if (!cancelled) setIssueError(String(e instanceof Error ? e.message : e))
      })

    return () => {
      cancelled = true
    }
  }, [git?.issueIdentifier, reloadToken])

  const openPullRequest = (pr: GhPullRequest) => {
    void openUrl(pr.url)
      .then(() => addToast(`opened PR #${pr.number}`, "success"))
      .catch((e) => addToast(String(e instanceof Error ? e.message : e), "error"))
  }

  const createOrOpenPullRequest = () => {
    if (pullRequest) {
      openPullRequest(pullRequest)
      return
    }
    if (!git?.available || !git.branch) {
      addToast("no current branch", "error")
      return
    }
    addToast(`opening PR create for ${git.branch}`, "info")
    createGhPullRequest(git.branch)
      .then(() => addToast(`opened PR create for ${git.branch}`, "success"))
      .catch((e) => addToast(String(e instanceof Error ? e.message : e), "error"))
  }

  const openChecks = () => {
    if (!pullRequest) {
      addToast("no GitHub PR for current branch", "error")
      return
    }
    openGhPullRequestChecks(pullRequest.number)
      .then(() => addToast(`opened checks for PR #${pullRequest.number}`, "success"))
      .catch((e) => addToast(String(e instanceof Error ? e.message : e), "error"))
  }

  useKeyboard((key) => {
    if (!active) return
    if (detail && handleIssueKey(key, targetFromDetail(detail), true, true)) return
    if (key.name === "return" || key.name === "l" || isVimAcceptKey(key)) {
      if (detail) setSelectedIssueId(detail.issue.id)
      else if (issue) setSelectedIssueId(issue.id)
      return
    }
    if (key.name === "b") {
      setView("git")
      return
    }
    if (key.name === "o" && pullRequest) {
      openPullRequest(pullRequest)
      return
    }
    if (key.name === "v") {
      openChecks()
      return
    }
    if (key.name === "P" || key.name === "p" && key.shift) {
      createOrOpenPullRequest()
    }
  })

  const dirty = git?.available && git.dirtyCount > 0 ? `${git.dirtyCount} changed` : "clean"
  const sync = git?.available
    ? [
        dirty,
        git.ahead > 0 ? `ahead ${git.ahead}` : null,
        git.behind > 0 ? `behind ${git.behind}` : null,
      ].filter(Boolean).join(" · ")
    : "git unavailable"

  return (
    <box style={{ flexDirection: "column", flexGrow: 1, padding: 1 }}>
      <text fg={theme.fg} attributes={1}>Current Work</text>
      <text fg={theme.fgMuted}>
        {`enter issue · b branches · o PR · P create PR · v checks · ${keybindings.issueSwitchBranch} issue branch`}
      </text>
      <text fg={theme.fgMuted}> </text>

      <text fg={theme.fgMuted}>───── branch ─────</text>
      {git?.available ? (
        <>
          <text fg={theme.fg}>{git.branch}</text>
          <text fg={git.dirtyCount > 0 ? theme.warn : theme.fgMuted}>{sync}</text>
          <text fg={git.issueIdentifier ? theme.warn : theme.fgDim}>
            {git.issueIdentifier ? `linked issue id ${git.issueIdentifier}` : "no Linear issue id in branch name"}
          </text>
        </>
      ) : (
        <text fg={theme.fgDim}>not inside a git repository</text>
      )}

      <text fg={theme.fgMuted}> </text>
      <text fg={theme.fgMuted}>───── GitHub PR ─────</text>
      {pullRequest ? (
        <>
          <text fg={theme.fg}>
            {`#${pullRequest.number} ${pullRequest.isDraft ? "DRAFT" : pullRequest.state} ${ellipsize(pullRequest.title, 96)}`}
          </text>
          <text fg={pullRequest.checks.includes("fail") ? theme.danger : theme.fgMuted}>
            {`${pullRequest.checks}${pullRequest.reviewDecision ? ` · ${pullRequest.reviewDecision}` : ""}`}
          </text>
          <text fg={theme.fgMuted}>{pullRequest.url}</text>
        </>
      ) : (
        <text fg={theme.fgDim}>no PR found for the current branch</text>
      )}

      <text fg={theme.fgMuted}> </text>
      <text fg={theme.fgMuted}>───── Linear issue ─────</text>
      {issueError ? (
        <text fg={theme.danger}>error: {issueError}</text>
      ) : detail ? (
        <>
          <box style={{ flexDirection: "row" }}>
            <text fg={theme.fgMuted}>{detail.issue.identifier}  </text>
            <StatusBadge state={detail.state} />
            <text fg={theme.fg}>{` ${detail.issue.title}`}</text>
          </box>
          <text fg={theme.fgMuted}>
            {`assignee ${detail.assignee?.displayName ?? "-"} · priority ${detail.issue.priorityLabel} · cycle ${detail.cycle ? `Cycle ${detail.cycle.number}` : "-"}`}
          </text>
          <text fg={theme.fgDim}>{ellipsize(detail.issue.description ?? "(no description)", 140)}</text>
        </>
      ) : git?.issueIdentifier ? (
        <text fg={theme.fgDim}>loading {git.issueIdentifier}</text>
      ) : (
        <text fg={theme.fgDim}>name the branch like LIN-123 to link current work to Linear</text>
      )}

      {detail ? (
        <>
          <text fg={theme.fgMuted}> </text>
          <text fg={theme.fgMuted}>───── recent activity ─────</text>
          {detail.history.length === 0 ? (
            <text fg={theme.fgDim}>(none)</text>
          ) : (
            detail.history.slice(0, 6).map((history) => (
              <box key={history.id} style={{ flexDirection: "row" }}>
                <text fg={theme.fgMuted}>{`${formatDate(history.createdAt)}  `}</text>
                <text fg={theme.accent}>{actorName(history)}</text>
                <text fg={theme.fg}>{`  ${describeIssueHistory(history)}`}</text>
              </box>
            ))
          )}
        </>
      ) : null}
    </box>
  )
}
