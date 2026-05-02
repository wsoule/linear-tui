import { isRecord, readJsonConfig, writeJsonConfig } from "../config-files"

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
  const parsed = readJsonConfig("viewing.json")
  if (!isRecord(parsed)) return defaultViewingPreferences

  return {
    filter: typeof parsed.filter === "string" ? parsed.filter : "",
    groupBy: isIssueGroupBy(parsed.groupBy) ? parsed.groupBy : "none",
    orderBy: isIssueOrderBy(parsed.orderBy) ? parsed.orderBy : "none",
  }
}

export function saveViewingPreferences(preferences: ViewingPreferences): void {
  writeJsonConfig("viewing.json", preferences)
}
