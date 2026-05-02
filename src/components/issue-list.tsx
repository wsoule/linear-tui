import { useMemo } from "react"
import { useKeyboard } from "@opentui/react"
import type { Cycle } from "@linear/sdk"
import { primeIssueDetail, type IssueRow } from "../linear/queries"
import { SelectableList } from "./selectable-list"
import { StatusBadge } from "./status-badge"
import { useStore, type StatusFilterOption } from "../state/store"
import { targetFromRow, useIssueActions } from "./issue-actions"
import {
  groupByLabel,
  orderByLabel,
  statusFilterLabel,
  type IssueGroupBy,
  type IssueOrderBy,
} from "../viewing/preferences"
import { matchesKeyBinding } from "../keybindings"
import { theme } from "../theme"

type Props = {
  title: string
  subtitle?: string
  rows: IssueRow[] | null
  error: string | null
  active: boolean
  emptyText?: string
  cycle?: Cycle | null
}

type IssueListItem =
  | { type: "group"; id: string; label: string; count: number }
  | { type: "issue"; row: IssueRow }

const NO_STATUS_FILTER = "__none__"

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

function statusMatches(row: IssueRow, statusFilter: string): boolean {
  if (!statusFilter) return true
  if (statusFilter === NO_STATUS_FILTER) return !row.state
  return row.state?.name === statusFilter || row.state?.type === statusFilter
}

function filterRows(rows: IssueRow[], filter: string, statusFilter: string): IssueRow[] {
  const needle = filter.trim().toLowerCase()
  return rows.filter((row) => {
    if (!statusMatches(row, statusFilter)) return false
    if (!needle) return true
    return issueSearchText(row).includes(needle)
  })
}

function statusOptions(rows: IssueRow[] | null): StatusFilterOption[] {
  if (!rows) return []
  const seen = new Set<string>()
  const options: StatusFilterOption[] = []
  for (const row of rows) {
    const value = row.state?.name ?? NO_STATUS_FILTER
    if (seen.has(value)) continue
    seen.add(value)
    options.push({
      label: row.state?.name ?? "No status",
      value,
      description: row.state?.type ?? "",
    })
  }
  return options.sort((a, b) => a.label.localeCompare(b.label))
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

function statusRank(row: IssueRow): number {
  const type = row.state?.type ?? ""
  const ranks: Record<string, number> = {
    triage: 0,
    backlog: 1,
    unstarted: 2,
    started: 3,
    completed: 4,
    canceled: 5,
  }
  return ranks[type] ?? 99
}

function orderText(row: IssueRow, orderBy: IssueOrderBy): string {
  switch (orderBy) {
    case "status":
      return `${statusRank(row)}:${row.state?.position ?? 999}:${row.state?.name ?? ""}`
    case "assignee":
      return row.assignee?.displayName ?? "zzzzzzzz-unassigned"
    case "priority":
      return String(row.issue.priority === 0 ? 99 : row.issue.priority).padStart(2, "0")
    case "team":
      return row.team?.key ?? "zzzzzzzz-no-team"
    case "identifier":
      return row.issue.identifier
    case "title":
      return row.issue.title
    case "none":
      return ""
  }
}

function sortRows(rows: IssueRow[], orderBy: IssueOrderBy): IssueRow[] {
  if (orderBy === "none") return rows
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const av = orderText(a.row, orderBy)
      const bv = orderText(b.row, orderBy)
      const byValue = av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" })
      return byValue || a.index - b.index
    })
    .map(({ row }) => row)
}

function issueItems(rows: IssueRow[], groupBy: IssueGroupBy, orderBy: IssueOrderBy): IssueListItem[] {
  if (groupBy === "none") return sortRows(rows, orderBy).map((row) => ({ type: "issue", row }))

  const groups = new Map<string, IssueRow[]>()
  for (const row of rows) {
    const key = groupValue(row, groupBy)
    const groupRows = groups.get(key)
    if (groupRows) groupRows.push(row)
    else groups.set(key, [row])
  }

  return [...groups.entries()].flatMap(([label, groupRows]) => [
    { type: "group" as const, id: `${groupBy}:${label}`, label, count: groupRows.length },
    ...sortRows(groupRows, orderBy).map((row) => ({ type: "issue" as const, row })),
  ])
}

export function IssueList({ title, subtitle, rows, error, active, emptyText, cycle }: Props) {
  const { setSelectedIssueId, setModal, viewingPreferences, keybindings } = useStore()
  const { handleIssueKey } = useIssueActions()
  const filteredRows = useMemo(
    () => rows ? filterRows(rows, viewingPreferences.filter, viewingPreferences.statusFilter) : null,
    [rows, viewingPreferences.filter, viewingPreferences.statusFilter],
  )
  const statuses = useMemo(() => statusOptions(rows), [rows])
  const items = useMemo(
    () => filteredRows ? issueItems(filteredRows, viewingPreferences.groupBy, viewingPreferences.orderBy) : null,
    [filteredRows, viewingPreferences.groupBy, viewingPreferences.orderBy],
  )

  useKeyboard((key) => {
    if (!active) return
    if (matchesKeyBinding(key, keybindings.viewFilter)) {
      setModal({ type: "filter" })
      return
    }
    if (matchesKeyBinding(key, keybindings.viewStatusFilter)) {
      setModal({ type: "status-filter", statuses })
      return
    }
    if (matchesKeyBinding(key, keybindings.viewGroup)) {
      setModal({ type: "group" })
      return
    }
    if (matchesKeyBinding(key, keybindings.viewOrder)) {
      setModal({ type: "order" })
    }
  })

  const filterActive = Boolean(viewingPreferences.filter.trim())
  const statusFilterActive = Boolean(viewingPreferences.statusFilter)
  const groupActive = viewingPreferences.groupBy !== "none"
  const orderActive = viewingPreferences.orderBy !== "none"
  const countText = rows
    ? filterActive || statusFilterActive
      ? `${filteredRows?.length ?? 0}/${rows.length} issues`
      : `${rows.length} issues`
    : undefined
  const controls = [
    countText,
    filterActive ? `filter: ${viewingPreferences.filter.trim()}` : null,
    statusFilterActive ? `status: ${statusFilterLabel(viewingPreferences.statusFilter)}` : null,
    groupActive ? `group: ${groupByLabel(viewingPreferences.groupBy)}` : null,
    orderActive ? `order: ${orderByLabel(viewingPreferences.orderBy)}` : null,
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
      emptyText={filterActive || statusFilterActive ? "no issues match filter" : emptyText}
      getId={(item) => item.type === "group" ? item.id : item.row.issue.id}
      isSelectable={(item) => item.type === "issue"}
      onSelect={(item) => {
        if (item.type !== "issue") return
        primeIssueDetail(item.row, cycle)
        setSelectedIssueId(item.row.issue.id)
      }}
      onKey={(key, item) => {
        if (item.type !== "issue") return false
        return handleIssueKey(key, targetFromRow(item.row, cycle))
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
