import { getMyIssues, MY_ISSUES_KEY, type IssueRow } from "../linear/queries"
import { useCachedQuery } from "../linear/use-query"
import { IssueList } from "../components/issue-list"

export function MyIssues({ active }: { active: boolean }) {
  const { data, error } = useCachedQuery<IssueRow[]>(MY_ISSUES_KEY, getMyIssues)
  return <IssueList title="My Issues" rows={data} error={error} active={active} />
}
