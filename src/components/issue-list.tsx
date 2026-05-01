import { useMemo } from "react"
import { useKeyboard } from "@opentui/react"
import { primeIssueDetail, type IssueRow } from "../linear/queries"
import { SelectableList } from "./selectable-list"
import { StatusBadge } from "./status-badge"
import { useStore } from "../state/store"
import { targetFromRow, useIssueActions } from "./issue-actions"
import { groupByLabel, type IssueGroupBy } from "../viewing/preferences"
import { theme } from "../theme"

type Props = {
  title: string
  subtitle?: string
  rows: IssueRow[] | null
  error: string | null
  active: boolean
  emptyText?: string
}

type IssueListItem =
  | { type: "group"; id: string; label: string; count: number }
  | { type: "issue"; row: IssueRow }

function issueSearchText(row: IssueRow): string {
  return [
    row.issue.identifier,
    row.issue.title,
    row.issue.priorityLabel,
    row.state?.name,
    row.state?.type,
    row.assignee?.displayName,
    row.team?.key,
    row.team?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function filterRows(rows: IssueRow[], filter: string): IssueRow[] {
  const needle = filter.trim().toLowerCase()
  if (!needle) return rows
  return rows.filter((row) => issueSearchText(row).includes(needle))
}

function groupValue(row: IssueRow, groupBy: IssueGroupBy): string {
  switch (groupBy) {
    case "status":
      return row.state?.name ?? "No status"
    case "assignee":
      return row.assignee?.displayName ?? "Unassigned"
    case "priority":
      return row.issue.priorityLabel ?? "No priority"
    case "team":
      return row.team?.key ?? "No team"
    case "none":
      return ""
  }
}

function issueItems(rows: IssueRow[], groupBy: IssueGroupBy): IssueListItem[] {
  if (groupBy === "none") return rows.map((row) => ({ type: "issue", row }))

  const groups = new Map<string, IssueRow[]>()
  for (const row of rows) {
    const key = groupValue(row, groupBy)
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  return [...groups.entries()].flatMap(([label, groupRows]) => [
    { type: "group" as const, id: `${groupBy}:${label}`, label, count: groupRows.length },
    ...groupRows.map((row) => ({ type: "issue" as const, row })),
  ])
}

export function IssueList({ title, subtitle, rows, error, active, emptyText }: Props) {
  const { setSelectedIssueId, setModal, viewingPreferences } = useStore()
  const { handleIssueKey } = useIssueActions()
  const filteredRows = useMemo(
    () => rows ? filterRows(rows, viewingPreferences.filter) : null,
    [rows, viewingPreferences.filter],
  )
  const items = useMemo(
    () => filteredRows ? issueItems(filteredRows, viewingPreferences.groupBy) : null,
    [filteredRows, viewingPreferences.groupBy],
  )

  useKeyboard((key) => {
    if (!active) return
    if (key.name === "f") {
      setModal({ type: "filter" })
      return
    }
    if (key.ctrl && key.name === "g") {
      setModal({ type: "group" })
    }
  })

  const filterActive = Boolean(viewingPreferences.filter.trim())
  const groupActive = viewingPreferences.groupBy !== "none"
  const countText = rows
    ? filterActive
      ? `${filteredRows?.length ?? 0}/${rows.length} issues`
      : `${rows.length} issues`
    : undefined
  const controls = [
    countText,
    filterActive ? `filter: ${viewingPreferences.filter.trim()}` : null,
    groupActive ? `group: ${groupByLabel(viewingPreferences.groupBy)}` : null,
  ].filter(Boolean).join(" · ")
  const resolvedSubtitle = subtitle
    ? controls
      ? `${subtitle} · ${controls}`
      : subtitle
    : controls || undefined

  return (
    <SelectableList<IssueListItem>
      title={title}
      subtitle={resolvedSubtitle}
      items={items}
      error={error}
      active={active}
      emptyText={filterActive ? "no issues match filter" : emptyText}
      getId={(item) => item.type === "group" ? item.id : item.row.issue.id}
      isSelectable={(item) => item.type === "issue"}
      onSelect={(item) => {
        if (item.type !== "issue") return
        primeIssueDetail(item.row)
        setSelectedIssueId(item.row.issue.id)
      }}
      onKey={(key, item) => {
        if (item.type !== "issue") return false
        return handleIssueKey(key, targetFromRow(item.row))
      }}
      renderRow={(item) => item.type === "group" ? (
        <box style={{ flexDirection: "row" }}>
          <text fg={theme.accent}>{` ${item.label}`}</text>
          <text fg={theme.fgMuted}>{`  ${item.count}`}</text>
        </box>
      ) : (
        <IssueRowView row={item.row} />
      )}
    />
  )
}

function IssueRowView({ row }: { row: IssueRow }) {
  return (
    <>
      <text fg={theme.fgMuted}>{` ${row.issue.identifier.padEnd(10)} `}</text>
      <StatusBadge state={row.state} />
      <text fg={theme.fg}>{` ${row.issue.title}`}</text>
      <text fg={theme.fgMuted}>{`  @${row.assignee?.displayName ?? "-"}`}</text>
    </>
  )
}
