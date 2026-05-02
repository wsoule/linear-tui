import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

export const GROUP_OPTIONS = [
  { key: "none", label: "None" },
  { key: "status", label: "Status" },
  { key: "assignee", label: "Assignee" },
  { key: "priority", label: "Priority" },
  { key: "team", label: "Team" },
] as const

export const ORDER_OPTIONS = [
  { key: "none", label: "Default" },
  { key: "status", label: "Status" },
  { key: "assignee", label: "Assignee" },
  { key: "priority", label: "Priority" },
  { key: "team", label: "Team" },
  { key: "identifier", label: "Issue ID" },
  { key: "title", label: "Title" },
] as const

export type IssueGroupBy = typeof GROUP_OPTIONS[number]["key"]
export type IssueOrderBy = typeof ORDER_OPTIONS[number]["key"]

export type ViewingPreferences = {
  filter: string
  groupBy: IssueGroupBy
  orderBy: IssueOrderBy
}

export const defaultViewingPreferences: ViewingPreferences = {
  filter: "",
  groupBy: "none",
  orderBy: "none",
}

function preferencesPath(): string | null {
  const home = process.env.HOME
  if (!home) return null
  return join(home, ".config", "linear-tui", "viewing.json")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isIssueGroupBy(value: unknown): value is IssueGroupBy {
  return typeof value === "string" && GROUP_OPTIONS.some((option) => option.key === value)
}

export function isIssueOrderBy(value: unknown): value is IssueOrderBy {
  return typeof value === "string" && ORDER_OPTIONS.some((option) => option.key === value)
}

export function groupByLabel(groupBy: IssueGroupBy): string {
  return GROUP_OPTIONS.find((option) => option.key === groupBy)?.label ?? "None"
}

export function orderByLabel(orderBy: IssueOrderBy): string {
  return ORDER_OPTIONS.find((option) => option.key === orderBy)?.label ?? "Default"
}

export function loadViewingPreferences(): ViewingPreferences {
  const path = preferencesPath()
  if (!path || !existsSync(path)) return defaultViewingPreferences

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"))
    if (!isRecord(parsed)) return defaultViewingPreferences
    return {
      filter: typeof parsed.filter === "string" ? parsed.filter : "",
      groupBy: isIssueGroupBy(parsed.groupBy) ? parsed.groupBy : "none",
      orderBy: isIssueOrderBy(parsed.orderBy) ? parsed.orderBy : "none",
    }
  } catch {
    return defaultViewingPreferences
  }
}

export function saveViewingPreferences(preferences: ViewingPreferences): void {
  const path = preferencesPath()
  if (!path) return

  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `${JSON.stringify(preferences, null, 2)}\n`)
  } catch {
    // Viewing preferences are convenience state; failing to persist them should not break the TUI.
  }
}
