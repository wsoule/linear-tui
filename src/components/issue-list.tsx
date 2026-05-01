import { primeIssueDetail, type IssueRow } from "../linear/queries"
import { SelectableList } from "./selectable-list"
import { StatusBadge } from "./status-badge"
import { useStore } from "../state/store"
import { targetFromRow, useIssueActions } from "./issue-actions"
import { theme } from "../theme"

type Props = {
  title: string
  subtitle?: string
  rows: IssueRow[] | null
  error: string | null
  active: boolean
  emptyText?: string
}

export function IssueList({ title, subtitle, rows, error, active, emptyText }: Props) {
  const { setSelectedIssueId } = useStore()
  const { handleIssueKey } = useIssueActions()
  return (
    <SelectableList<IssueRow>
      title={title}
      subtitle={subtitle ?? (rows ? `${rows.length} issues` : undefined)}
      items={rows}
      error={error}
      active={active}
      emptyText={emptyText}
      getId={(r) => r.issue.id}
      onSelect={(r) => {
        primeIssueDetail(r)
        setSelectedIssueId(r.issue.id)
      }}
      onKey={(key, r) => handleIssueKey(key, targetFromRow(r))}
      renderRow={(r) => (
        <>
          <text fg={theme.fgMuted}>{` ${r.issue.identifier.padEnd(10)} `}</text>
          <StatusBadge state={r.state} />
          <text fg={theme.fg}>{` ${r.issue.title}`}</text>
          <text fg={theme.fgMuted}>{`  @${r.assignee?.displayName ?? "—"}`}</text>
        </>
      )}
    />
  )
}
