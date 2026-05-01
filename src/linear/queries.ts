import {
  type Issue,
  type User,
  type WorkflowState,
  type Team,
  type Project,
  IssueNotification,
} from "@linear/sdk"
import { linear } from "./client"
import { cached } from "./cache"

export type IssueRow = {
  issue: Issue
  state: WorkflowState | undefined
  assignee: User | undefined
  team: Team | undefined
}

export type ProjectRow = {
  project: Project
  lead: User | undefined
}

async function enrich(issues: Issue[]): Promise<IssueRow[]> {
  return Promise.all(
    issues.map(async (issue) => {
      const [state, assignee, team] = await Promise.all([
        issue.state,
        issue.assignee,
        issue.team,
      ])
      return { issue, state, assignee, team }
    }),
  )
}

export const MY_ISSUES_KEY = "my-issues"
export const INBOX_KEY = "inbox"
export const PROJECTS_KEY = "projects"
export const CYCLE_KEY = "cycle"
export const issueDetailKey = (id: string) => `issue:${id}`
export const projectIssuesKey = (id: string) => `project-issues:${id}`
export const searchKey = (q: string) => `search:${q}`

export async function getViewer(): Promise<User> {
  return linear.viewer
}

export async function getMyIssues(): Promise<IssueRow[]> {
  return cached(MY_ISSUES_KEY, async () => {
    const me = await linear.viewer
    const conn = await me.assignedIssues({ first: 50 })
    return enrich(conn.nodes)
  })
}

export async function getInbox(): Promise<IssueRow[]> {
  return cached(INBOX_KEY, async () => {
    const conn = await linear.notifications({ first: 50 })
    const issues: Issue[] = []
    const seen = new Set<string>()
    for (const n of conn.nodes) {
      if (!(n instanceof IssueNotification)) continue
      const issue = await n.issue
      if (!issue || seen.has(issue.id)) continue
      seen.add(issue.id)
      issues.push(issue)
    }
    return enrich(issues)
  })
}

export async function getProjects(): Promise<ProjectRow[]> {
  return cached(PROJECTS_KEY, async () => {
    const conn = await linear.projects({ first: 50 })
    return Promise.all(
      conn.nodes.map(async (project) => ({
        project,
        lead: await project.lead,
      })),
    )
  })
}

export async function getProjectIssues(id: string): Promise<IssueRow[]> {
  return cached(projectIssuesKey(id), async () => {
    const project = await linear.project(id)
    const conn = await project.issues({ first: 50 })
    return enrich(conn.nodes)
  })
}

export async function getCycleIssues(): Promise<IssueRow[]> {
  return cached(CYCLE_KEY, async () => {
    const me = await linear.viewer
    const teams = await me.teams({ first: 1 })
    const team = teams.nodes[0]
    if (!team) return []
    const cycle = await team.activeCycle
    if (!cycle) return []
    const conn = await cycle.issues({ first: 50 })
    return enrich(conn.nodes)
  })
}

export async function searchIssuesQuery(query: string): Promise<IssueRow[]> {
  if (!query.trim()) return []
  return cached(
    searchKey(query),
    async () => {
      const result = await linear.searchIssues(query, { first: 30 })
      return enrich(result.nodes as unknown as Issue[])
    },
    10_000,
  )
}

export async function getIssueDetail(id: string) {
  return cached(issueDetailKey(id), async () => {
    const issue = await linear.issue(id)
    const [state, assignee, team, comments] = await Promise.all([
      issue.state,
      issue.assignee,
      issue.team,
      issue.comments({ first: 50 }),
    ])
    const enrichedComments = await Promise.all(
      comments.nodes.map(async (c) => ({
        comment: c,
        user: await c.user,
      })),
    )
    return { issue, state, assignee, team, comments: enrichedComments }
  })
}
