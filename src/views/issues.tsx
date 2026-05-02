import { getIssues, ISSUES_KEY, type IssueRow } from "../linear/queries"
import { useCachedQuery } from "../linear/use-query"
import { IssueList } from "../components/issue-list"

export function Issues({ active }: { active: boolean }) {
  const { data, error } = useCachedQuery<IssueRow[]>(ISSUES_KEY, getIssues)
  return <IssueList title="Issues" rows={data} error={error} active={active} />
}
