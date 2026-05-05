import type { IssueHistory } from "@linear/sdk"

function priorityName(priority: number | null | undefined): string {
  switch (priority) {
    case 1: return "Urgent"
    case 2: return "High"
    case 3: return "Medium"
    case 4: return "Low"
    case 0: return "No priority"
    default: return "priority"
  }
}

export function actorName(history: IssueHistory): string {
  const actors = history.actors ?? []
  if (actors.length > 0) return actors.map((actor) => actor.displayName).join(", ")
  return history.botActor?.name ?? "Linear"
}

export function describeIssueHistory(history: IssueHistory): string {
  const changes: string[] = []
  if (history.fromTitle !== undefined || history.toTitle !== undefined) changes.push("renamed issue")
  if (history.updatedDescription) changes.push("updated description")
  if (history.fromStateId !== undefined || history.toStateId !== undefined) changes.push("changed status")
  if (history.fromAssigneeId !== undefined || history.toAssigneeId !== undefined) changes.push("changed assignee")
  if (history.fromCycleId !== undefined || history.toCycleId !== undefined) changes.push("changed cycle")
  if (history.fromPriority !== undefined || history.toPriority !== undefined) {
    changes.push(`priority ${priorityName(history.fromPriority)} -> ${priorityName(history.toPriority)}`)
  }
  if (history.addedLabels && history.addedLabels.length > 0) {
    changes.push(`added ${history.addedLabels.length} label${history.addedLabels.length === 1 ? "" : "s"}`)
  }
  if (history.removedLabels && history.removedLabels.length > 0) {
    changes.push(`removed ${history.removedLabels.length} label${history.removedLabels.length === 1 ? "" : "s"}`)
  }
  if (history.attachmentId) changes.push("updated attachment")
  if (history.archived === true) changes.push("archived issue")
  if (history.archived === false) changes.push("unarchived issue")
  if (history.trashed === true) changes.push("trashed issue")
  if (history.trashed === false) changes.push("restored issue")
  if (history.autoClosed) changes.push("auto-closed issue")
  if (history.autoArchived) changes.push("auto-archived issue")
  return changes.length > 0 ? changes.join(", ") : "updated issue"
}
