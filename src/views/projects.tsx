import {
  getProjects,
  getProjectIssues,
  PROJECTS_KEY,
  projectIssuesKey,
  type ProjectRow,
  type IssueRow,
} from "../linear/queries"
import { useCachedQuery } from "../linear/use-query"
import { ProjectList } from "../components/project-list"
import { IssueList } from "../components/issue-list"
import { useStore } from "../state/store"

function ProjectsTopLevel({ active }: { active: boolean }) {
  const { data, error } = useCachedQuery<ProjectRow[]>(PROJECTS_KEY, getProjects)
  return <ProjectList rows={data} error={error} active={active} />
}

function ProjectIssues({ projectId, active }: { projectId: string; active: boolean }) {
  const { data, error } = useCachedQuery<IssueRow[]>(
    projectIssuesKey(projectId),
    () => getProjectIssues(projectId),
  )
  return (
    <IssueList
      title="Project Issues"
      subtitle="esc to go back"
      rows={data}
      error={error}
      active={active}
    />
  )
}

export function Projects({ active }: { active: boolean }) {
  const { selectedProjectId } = useStore()
  return selectedProjectId ? (
    <ProjectIssues projectId={selectedProjectId} active={active} />
  ) : (
    <ProjectsTopLevel active={active} />
  )
}
