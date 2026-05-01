import { getInbox, INBOX_KEY, type IssueRow } from "../linear/queries"
import { useCachedQuery } from "../linear/use-query"
import { IssueList } from "../components/issue-list"

export function Inbox({ active }: { active: boolean }) {
  const { data, error } = useCachedQuery<IssueRow[]>(INBOX_KEY, getInbox)
  return (
    <IssueList
      title="Inbox"
      rows={data}
      error={error}
      active={active}
      emptyText="inbox zero"
    />
  )
}
