import { useSyncExternalStore } from "react"
import { getActivitySnapshot, subscribeActivity } from "../linear/activity"
import { getViewer, VIEWER_KEY } from "../linear/queries"
import { useCachedQuery } from "../linear/use-query"
import { useStore, type View } from "../state/store"
import { useGitSummary } from "../git/use-git-summary"
import { useCurrentPullRequest } from "../github/use-current-pr"
import { groupByLabel, orderByLabel, statusFilterLabel } from "../viewing/preferences"
import { theme } from "../theme"

const viewLabels: Record<View, string> = {
  "my-issues": "My Issues",
  issues: "Issues",
  triage: "Triage",
  inbox: "Inbox",
  projects: "Projects",
  cycles: "Cycles",
  git: "Git",
  search: "Search",
}

function ellipsize(value: string, max: number): string {
  if (value.length <= max) return value
  if (max <= 1) return value.slice(0, max)
  return `${value.slice(0, max - 1)}…`
}

export function StatusLine() {
  const { view, selectedIssueId, selectedProjectId, viewingPreferences } = useStore()
  const { data: viewer } = useCachedQuery(VIEWER_KEY, getViewer)
  const git = useGitSummary()
  const pullRequest = useCurrentPullRequest()
  const activity = useSyncExternalStore(
    subscribeActivity,
    getActivitySnapshot,
    getActivitySnapshot,
  )

  const location = selectedIssueId
    ? "Issue Detail"
    : selectedProjectId
    ? "Project Issues"
    : viewLabels[view]
  const user = viewer?.displayName ?? "Linear"
  const syncText = activity.pending > 0 ? `sync ${activity.pending}` : "idle"
  const filter = viewingPreferences.filter.trim()
  const viewingText = [
    filter ? `filter ${ellipsize(filter, 24)}` : null,
    viewingPreferences.statusFilter ? `status ${statusFilterLabel(viewingPreferences.statusFilter)}` : null,
    viewingPreferences.groupBy !== "none" ? `group ${groupByLabel(viewingPreferences.groupBy)}` : null,
    viewingPreferences.orderBy !== "none" ? `order ${orderByLabel(viewingPreferences.orderBy)}` : null,
  ].filter(Boolean).join(" · ")
  const gitBits = git?.available
    ? [
        `git ${ellipsize(git.branch, 24)}`,
        git.dirtyCount > 0 ? `+${git.dirtyCount}` : "clean",
        git.ahead > 0 ? `up ${git.ahead}` : null,
        git.behind > 0 ? `down ${git.behind}` : null,
        git.issueIdentifier,
      ].filter(Boolean).join(" ")
    : ""
  const prBits = pullRequest
    ? `gh #${pullRequest.number} ${pullRequest.isDraft ? "DRAFT" : pullRequest.state} ${pullRequest.checks}`
    : ""
  const errorText = activity.lastError
    ? `last error: ${ellipsize(activity.lastError, 72)}`
    : "no recent errors"

  return (
    <box
      style={{
        width: "100%",
        height: 1,
        flexDirection: "row",
        backgroundColor: theme.bgPanel,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <text fg={theme.fgDim}>{user}</text>
      <text fg={theme.fgMuted}>  ·  </text>
      <text fg={theme.fg}>{location}</text>
      <text fg={theme.fgMuted}>  ·  </text>
      {gitBits ? (
        <>
          <text fg={git?.dirtyCount ? theme.warn : theme.fgMuted}>{gitBits}</text>
          <text fg={theme.fgMuted}>  ·  </text>
        </>
      ) : null}
      {prBits ? (
        <>
          <text fg={pullRequest?.checks.includes("fail") ? theme.danger : theme.fgMuted}>{prBits}</text>
          <text fg={theme.fgMuted}>  ·  </text>
        </>
      ) : null}
      {viewingText ? (
        <>
          <text fg={theme.warn}>{viewingText}</text>
          <text fg={theme.fgMuted}>  ·  </text>
        </>
      ) : null}
      <text fg={activity.pending > 0 ? theme.accent : theme.fgMuted}>{syncText}</text>
      <text fg={theme.fgMuted}>  ·  </text>
      <text fg={activity.lastError ? theme.danger : theme.fgMuted}>{errorText}</text>
      <text fg={theme.fgMuted} style={{ flexGrow: 1 }}> </text>
    </box>
  )
}
