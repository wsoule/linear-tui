import { useRenderer } from "@opentui/react"
import type { KeyEvent } from "@opentui/core"
import type { Cycle } from "@linear/sdk"
import type { IssueTarget } from "../state/store"
import { useStore } from "../state/store"
import type { IssueDetailData, IssueRow } from "../linear/queries"
import { matchesKeyBinding } from "../keybindings"

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

function branchName(identifier: string, title: string, linearBranchName?: string): string {
  if (linearBranchName) return linearBranchName
  const titleSlug = slug(title)
  return titleSlug ? `${identifier.toLowerCase()}-${titleSlug}` : identifier.toLowerCase()
}

export function targetFromRow(row: IssueRow, cycle?: Cycle | null): IssueTarget {
  return {
    issueId: row.issue.id,
    identifier: row.issue.identifier,
    title: row.issue.title,
    url: row.issue.url,
    teamId: row.team?.id ?? row.issue.teamId ?? null,
    branchName: branchName(row.issue.identifier, row.issue.title, row.issue.branchName),
    cycle,
  }
}

export function targetFromDetail(detail: IssueDetailData): IssueTarget {
  return {
    issueId: detail.issue.id,
    identifier: detail.issue.identifier,
    title: detail.issue.title,
    url: detail.issue.url,
    teamId: detail.team?.id ?? detail.issue.teamId ?? null,
    branchName: branchName(detail.issue.identifier, detail.issue.title, detail.issue.branchName),
    cycle: detail.cycle,
  }
}

export async function openUrl(url: string): Promise<void> {
  if (!url) throw new Error("URL is not available yet")
  const command =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
      ? ["cmd", "/c", "start", "", url]
      : ["xdg-open", url]
  const proc = Bun.spawn(command, { stdout: "ignore", stderr: "ignore" })
  const code = await proc.exited
  if (code !== 0) throw new Error("open command failed")
}

async function copyWithSystemClipboard(text: string): Promise<void> {
  if (process.platform !== "darwin") {
    throw new Error("terminal clipboard copy was not accepted")
  }
  const proc = Bun.spawn(["pbcopy"], {
    stdin: "pipe",
    stdout: "ignore",
    stderr: "ignore",
  })
  await proc.stdin.write(text)
  await proc.stdin.end()
  const code = await proc.exited
  if (code !== 0) throw new Error("pbcopy failed")
}

async function switchToBranch(branchName: string): Promise<void> {
  const existing = Bun.spawn(["git", "switch", branchName], {
    stdout: "ignore",
    stderr: "ignore",
  })
  if (await existing.exited === 0) return

  const created = Bun.spawn(["git", "switch", "-c", branchName], {
    stdout: "ignore",
    stderr: "ignore",
  })
  if (await created.exited !== 0) throw new Error("git branch switch failed")
}

export function useIssueActions() {
  const renderer = useRenderer()
  const { setModal, addToast, keybindings } = useStore()

  const copyToClipboard = async (text: string) => {
    const copied = renderer.copyToClipboardOSC52(text)
    if (!copied) await copyWithSystemClipboard(text)
  }

  const openIssue = async (target: IssueTarget) => {
    try {
      await openUrl(target.url)
      addToast(`opened ${target.identifier}`, "success")
    } catch (e) {
      addToast(String(e instanceof Error ? e.message : e), "error")
    }
  }

  const copyIdentifier = async (target: IssueTarget) => {
    try {
      await copyToClipboard(target.identifier)
      addToast(`copied ${target.identifier}`, "success")
    } catch (e) {
      addToast(String(e instanceof Error ? e.message : e), "error")
    }
  }

  const copyBranch = async (target: IssueTarget) => {
    try {
      await copyToClipboard(target.branchName)
      addToast(`copied ${target.branchName}`, "success")
    } catch (e) {
      addToast(String(e instanceof Error ? e.message : e), "error")
    }
  }

  const checkoutBranch = async (target: IssueTarget) => {
    try {
      await switchToBranch(target.branchName)
      addToast(`switched to ${target.branchName}`, "success")
    } catch (e) {
      addToast(String(e instanceof Error ? e.message : e), "error")
    }
  }

  return {
    handleIssueKey(
      key: KeyEvent,
      target: IssueTarget,
      allowComment = false,
      allowPriority = false,
    ) {
      if (matchesKeyBinding(key, keybindings.issueStatus)) {
        setModal({ type: "status", target })
        return true
      }
      if (matchesKeyBinding(key, keybindings.issueAssign)) {
        setModal({ type: "assignee", target })
        return true
      }
      if (matchesKeyBinding(key, keybindings.issueEdit)) {
        setModal({ type: "edit-issue", target })
        return true
      }
      if (matchesKeyBinding(key, keybindings.issueCycle)) {
        setModal({ type: "cycle", target })
        return true
      }
      if (matchesKeyBinding(key, keybindings.issuePriority)) {
        if (!allowPriority) return false
        setModal({ type: "priority", target })
        return true
      }
      if (matchesKeyBinding(key, keybindings.issueOpen)) {
        void openIssue(target)
        return true
      }
      if (matchesKeyBinding(key, keybindings.issueCopyId)) {
        void copyIdentifier(target)
        return true
      }
      if (matchesKeyBinding(key, keybindings.issueCopyBranch)) {
        void copyBranch(target)
        return true
      }
      if (matchesKeyBinding(key, keybindings.issueSwitchBranch)) {
        void checkoutBranch(target)
        return true
      }
      if (matchesKeyBinding(key, keybindings.issueNewSubIssue)) {
        setModal({ type: "new-issue", parent: target })
        return true
      }
      if (matchesKeyBinding(key, keybindings.issueComment)) {
        if (!allowComment) return false
        setModal({ type: "comment", target })
        return true
      }
      return false
    },
  }
}
