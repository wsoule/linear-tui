import {
  type Attachment,
  type Cycle,
  type Issue,
  type IssueRelation,
  type User,
  type WorkflowState,
  type Team,
  type Project,
  IssueNotification,
} from "@linear/sdk"
import { linear } from "./client"
import { cacheKeys, cached, peekStale, remember } from "./cache"
import { trackRequest } from "./activity"

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

export type IssueCommentRow = {
  comment: { body: string; createdAt: Date }
  user: User | undefined
}

export type IssueRelationRow = {
  relation: IssueRelation
  issue: Issue | undefined
  relatedIssue: Issue | undefined
  direction: "outbound" | "inbound"
}

export type IssueDetailData = {
  issue: Issue
  state: WorkflowState | undefined
  assignee: User | undefined
  team: Team | undefined
  cycle: Cycle | undefined
  comments: IssueCommentRow[]
  children: IssueRow[]
  relations: IssueRelationRow[]
  attachments: Attachment[]
}

type CreateIssueInput = {
  id?: string
  teamId: string
  title?: string
  description?: string
  priority?: number
  parentId?: string
  cycleId?: string
}

export async function enrichIssue(issue: Issue): Promise<IssueRow> {
  const [state, assignee, team] = await Promise.all([
    issue.state,
    issue.assignee,
    issue.team,
  ])
  return { issue, state, assignee, team }
}

async function enrich(issues: Issue[]): Promise<IssueRow[]> {
  return Promise.all(
    issues.map((issue) => enrichIssue(issue)),
  )
}

export const MY_ISSUES_KEY = "my-issues"
export const ISSUES_KEY = "issues"
export const TRIAGE_KEY = "triage"
export const INBOX_KEY = "inbox"
export const PROJECTS_KEY = "projects"
export const CYCLE_KEY = "cycle"
export const CYCLES_KEY = "cycles"
export const VIEWER_KEY = "viewer"
export const VIEWER_TEAMS_KEY = "viewer-teams"
export const issueDetailKey = (id: string) => `issue:${id}`
export const projectIssuesKey = (id: string) => `project-issues:${id}`
export const cycleIssuesKey = (id: string) => `cycle-issues:${id}`
export const searchKey = (q: string) => `search:${q}`
export const teamStatesKey = (id: string) => `team-states:${id}`
export const teamMembersKey = (id: string) => `team-members:${id}`
export const teamCyclesKey = (id: string) => `team-cycles:${id}`

export type CycleViewData = {
  team: Team | undefined
  cycles: Cycle[]
  activeCycleId: string | null
}

export async function getViewer(): Promise<User> {
  return linear.viewer
}

export async function getViewerTeams(): Promise<Team[]> {
  return cached(VIEWER_TEAMS_KEY, async () => {
    const me = await linear.viewer
    const conn = await me.teams({ first: 50 })
    return conn.nodes
  }, 5 * 60_000)
}

export async function getMyIssues(): Promise<IssueRow[]> {
  return cached(MY_ISSUES_KEY, async () => {
    const me = await linear.viewer
    const conn = await me.assignedIssues({ first: 50 })
    return enrich(conn.nodes)
  })
}

export async function getIssues(): Promise<IssueRow[]> {
  return cached(ISSUES_KEY, async () => {
    const conn = await linear.issues({ first: 100, includeArchived: false })
    return enrich(conn.nodes)
  })
}

export async function getTriageIssues(): Promise<IssueRow[]> {
  return cached(TRIAGE_KEY, async () => {
    const conn = await linear.issues({
      first: 100,
      includeArchived: false,
      filter: { state: { type: { eq: "triage" } } },
    })
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

export async function getTeamCycles(teamId: string): Promise<Cycle[]> {
  return cached(teamCyclesKey(teamId), async () => {
    const team = await linear.team(teamId)
    const conn = await team.cycles({ first: 50, includeArchived: false })
    return conn.nodes.sort((a, b) => a.number - b.number)
  }, 5 * 60_000)
}

export async function getViewerCycleData(): Promise<CycleViewData> {
  return cached(CYCLES_KEY, async () => {
    const me = await linear.viewer
    const teams = await me.teams({ first: 1 })
    const team = teams.nodes[0]
    if (!team) return { team: undefined, cycles: [], activeCycleId: null }
    const [cycles, activeCycle] = await Promise.all([
      getTeamCycles(team.id),
      team.activeCycle,
    ])
    return {
      team,
      cycles,
      activeCycleId: activeCycle?.id ?? cycles.find((cycle) => cycle.isActive)?.id ?? null,
    }
  }, 60_000)
}

export async function getCycleIssuesForCycle(cycle: Cycle): Promise<IssueRow[]> {
  return cached(cycleIssuesKey(cycle.id), async () => {
    const conn = await cycle.issues({ first: 100, includeArchived: false })
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

async function loadIssueDetail(id: string): Promise<IssueDetailData> {
  const issue = await linear.issue(id)
  const [state, assignee, team, cycle, comments, children, attachments, relations, inverseRelations] = await Promise.all([
    issue.state,
    issue.assignee,
    issue.team,
    issue.cycle,
    issue.comments({ first: 50 }),
    issue.children({ first: 50 }),
    issue.attachments({ first: 50 }),
    issue.relations({ first: 50 }),
    issue.inverseRelations({ first: 50 }),
  ])
  const [enrichedComments, enrichedChildren, enrichedRelations] = await Promise.all([
    Promise.all(
      comments.nodes.map(async (c) => ({
        comment: c,
        user: await c.user,
      })),
    ),
    enrich(children.nodes),
    Promise.all(
      [
        ...relations.nodes.map((relation) => ({ relation, direction: "outbound" as const })),
        ...inverseRelations.nodes.map((relation) => ({ relation, direction: "inbound" as const })),
      ].map(async ({ relation, direction }) => ({
        relation,
        direction,
        issue: await relation.issue,
        relatedIssue: await relation.relatedIssue,
      })),
    ),
  ])
  return {
    issue,
    state,
    assignee,
    team,
    cycle,
    comments: enrichedComments,
    children: enrichedChildren,
    relations: enrichedRelations,
    attachments: attachments.nodes,
  }
}

export async function getIssueDetail(id: string): Promise<IssueDetailData> {
  return cached(issueDetailKey(id), () => loadIssueDetail(id))
}

export async function refreshIssueDetail(id: string): Promise<IssueDetailData> {
  return remember(issueDetailKey(id), await loadIssueDetail(id))
}

export async function getTeamStates(teamId: string): Promise<WorkflowState[]> {
  return cached(teamStatesKey(teamId), async () => {
    const team = await linear.team(teamId)
    const conn = await team.states({ first: 50 })
    return conn.nodes.sort((a, b) => a.position - b.position)
  }, 5 * 60_000)
}

export async function getTeamMembers(teamId: string): Promise<User[]> {
  return cached(teamMembersKey(teamId), async () => {
    const team = await linear.team(teamId)
    const conn = await team.members({ first: 100 })
    return conn.nodes
      .filter((user) => user.active && user.isAssignable)
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
  }, 5 * 60_000)
}

type IssueCachePatch = {
  issue?: Issue
  state?: WorkflowState
  assignee?: User | null
  cycle?: Cycle | null
}

function isIssueRow(value: unknown): value is IssueRow {
  return (
    typeof value === "object" &&
    value !== null &&
    "issue" in value &&
    typeof (value as { issue?: { id?: unknown } }).issue?.id === "string"
  )
}

function isIssueDetail(value: unknown): value is IssueDetailData {
  return isIssueRow(value) && Array.isArray((value as { comments?: unknown }).comments)
}

export function patchIssueCaches(issueId: string, patch: IssueCachePatch): () => void {
  const snapshots: [string, unknown][] = []

  for (const key of cacheKeys()) {
    const current = peekStale<unknown>(key)
    if (current === undefined) continue

    let next: unknown = current
    if (Array.isArray(current) && current.some((item) => isIssueRow(item) && item.issue.id === issueId)) {
      next = current.map((item) => {
        if (!isIssueRow(item) || item.issue.id !== issueId) return item
        return {
          ...item,
          issue: patch.issue ?? item.issue,
          state: patch.state ?? item.state,
          assignee: "assignee" in patch ? patch.assignee ?? undefined : item.assignee,
        } satisfies IssueRow
      })
    } else if (key === issueDetailKey(issueId) && isIssueDetail(current)) {
      next = {
        ...current,
        issue: patch.issue ?? current.issue,
        state: patch.state ?? current.state,
        assignee: "assignee" in patch ? patch.assignee ?? undefined : current.assignee,
        cycle: "cycle" in patch ? patch.cycle ?? undefined : current.cycle,
      } satisfies IssueDetailData
    }

    if (next !== current) {
      snapshots.push([key, current])
      remember(key, next)
    }
  }

  return () => {
    for (const [key, value] of snapshots.reverse()) remember(key, value)
  }
}

export function rememberIssueDetail(detail: IssueDetailData): void {
  remember(issueDetailKey(detail.issue.id), detail)
}

export function primeIssueDetail(row: IssueRow, cycle?: Cycle | null): void {
  const key = issueDetailKey(row.issue.id)
  if (peekStale<IssueDetailData>(key)) return
  rememberIssueDetail({
    ...row,
    cycle: cycle ?? undefined,
    comments: [],
    children: [],
    relations: [],
    attachments: [],
  })
}

export function appendCommentCache(
  issueId: string,
  comment: IssueCommentRow,
): () => void {
  const current = peekStale<IssueDetailData>(issueDetailKey(issueId))
  if (!current) return () => {}
  remember(issueDetailKey(issueId), {
    ...current,
    comments: [...current.comments, comment],
  })
  return () => remember(issueDetailKey(issueId), current)
}

export function addIssueRowToCaches(row: IssueRow, cycleId = row.issue.cycleId): void {
  const prepend = (rows: IssueRow[]) => [
    row,
    ...rows.filter((current) => current.issue.id !== row.issue.id),
  ]

  const allIssues = peekStale<IssueRow[]>(ISSUES_KEY)
  if (allIssues) remember(ISSUES_KEY, prepend(allIssues))
  if (row.state?.type === "triage") {
    const triageIssues = peekStale<IssueRow[]>(TRIAGE_KEY)
    if (triageIssues) remember(TRIAGE_KEY, prepend(triageIssues))
  }
  if (cycleId) {
    const cycleIssues = peekStale<IssueRow[]>(cycleIssuesKey(cycleId))
    if (cycleIssues) remember(cycleIssuesKey(cycleId), prepend(cycleIssues))
  }
  if (row.assignee?.isMe) {
    const current = peekStale<IssueRow[]>(MY_ISSUES_KEY)
    if (current) remember(MY_ISSUES_KEY, prepend(current))
  }
  primeIssueDetail(row)
}

export async function updateIssueState(
  issueId: string,
  state: WorkflowState,
): Promise<void> {
  await trackRequest(async () => {
    await linear.updateIssue(issueId, { stateId: state.id })
    await refreshIssueDetail(issueId)
  })
}

export async function updateIssueAssignee(
  issueId: string,
  assignee: User | null,
): Promise<void> {
  await trackRequest(async () => {
    await linear.updateIssue(issueId, { assigneeId: assignee?.id ?? null })
    await refreshIssueDetail(issueId)
  })
}

export async function updateIssueCycle(
  issueId: string,
  cycle: Cycle | null,
): Promise<void> {
  await trackRequest(async () => {
    await linear.updateIssue(issueId, { cycleId: cycle?.id ?? null })
    await refreshIssueDetail(issueId)
  })
}

export async function updateIssuePriority(
  issueId: string,
  priority: number,
): Promise<void> {
  await trackRequest(async () => {
    await linear.updateIssue(issueId, { priority })
    await refreshIssueDetail(issueId)
  })
}

export async function updateIssueText(
  issueId: string,
  title: string,
  description: string,
): Promise<void> {
  await trackRequest(async () => {
    await linear.updateIssue(issueId, {
      title,
      description: description || null,
    })
    await refreshIssueDetail(issueId)
  })
}

export async function createIssueComment(
  issueId: string,
  body: string,
): Promise<void> {
  await trackRequest(async () => {
    await linear.createComment({ issueId, body })
    await refreshIssueDetail(issueId)
  })
}

export async function createIssue(input: CreateIssueInput): Promise<IssueRow> {
  return trackRequest(async () => {
    const payload = await linear.createIssue(input)
    const issue = await payload.issue
    if (!issue) throw new Error("Linear did not return the created issue")
    const row = await enrichIssue(issue)
    addIssueRowToCaches(row, input.cycleId)
    return row
  })
}
