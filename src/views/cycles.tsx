import { getCycleIssues, CYCLE_KEY, type IssueRow } from "../linear/queries"
import { useCachedQuery } from "../linear/use-query"
import { IssueList } from "../components/issue-list"

export function Cycles({ active }: { active: boolean }) {
  const { data, error } = useCachedQuery<IssueRow[]>(CYCLE_KEY, getCycleIssues)
  return (
    <IssueList
      title="Current Cycle"
      rows={data}
      error={error}
      active={active}
      emptyText="no active cycle"
    />
  )
}
