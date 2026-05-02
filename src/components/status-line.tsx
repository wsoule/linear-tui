import { useSyncExternalStore } from "react"
import { getActivitySnapshot, subscribeActivity } from "../linear/activity"
import { getViewer, VIEWER_KEY } from "../linear/queries"
import { useCachedQuery } from "../linear/use-query"
import { useStore, type View } from "../state/store"
import { groupByLabel, orderByLabel } from "../viewing/preferences"
import { theme } from "../theme"

const viewLabels: Record<View, string> = {
  "my-issues": "My Issues",
  inbox: "Inbox",
  projects: "Projects",
  cycles: "Current Cycle",
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
    viewingPreferences.groupBy !== "none" ? `group ${groupByLabel(viewingPreferences.groupBy)}` : null,
    viewingPreferences.orderBy !== "none" ? `order ${orderByLabel(viewingPreferences.orderBy)}` : null,
  ].filter(Boolean).join(" · ")
  const errorText = activity.lastError
    ? `last error: ${ellipsize(activity.lastError, 72)}`
    : "no recent errors"

  return (
    <box
      style={{
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
      {viewingText ? (
        <>
          <text fg={theme.warn}>{viewingText}</text>
          <text fg={theme.fgMuted}>  ·  </text>
        </>
      ) : null}
      <text fg={activity.pending > 0 ? theme.accent : theme.fgMuted}>{syncText}</text>
      <text fg={theme.fgMuted}>  ·  </text>
      <text fg={activity.lastError ? theme.danger : theme.fgMuted}>{errorText}</text>
    </box>
  )
}
