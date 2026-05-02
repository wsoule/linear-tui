import { getTriageIssues, TRIAGE_KEY, type IssueRow } from "../linear/queries"
import { useCachedQuery } from "../linear/use-query"
import { IssueList } from "../components/issue-list"

export function Triage({ active }: { active: boolean }) {
  const { data, error } = useCachedQuery<IssueRow[]>(TRIAGE_KEY, getTriageIssues)
  return (
    <IssueList
      title="Triage"
      rows={data}
      error={error}
      active={active}
      emptyText="triage zero"
    />
  )
}
