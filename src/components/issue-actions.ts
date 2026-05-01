import { useRenderer } from "@opentui/react"
import type { KeyEvent } from "@opentui/core"
import type { IssueTarget } from "../state/store"
import { useStore } from "../state/store"
import type { IssueDetailData, IssueRow } from "../linear/queries"

export function targetFromRow(row: IssueRow): IssueTarget {
  return {
    issueId: row.issue.id,
    identifier: row.issue.identifier,
    title: row.issue.title,
    url: row.issue.url,
    teamId: row.team?.id ?? row.issue.teamId ?? null,
  }
}

export function targetFromDetail(detail: IssueDetailData): IssueTarget {
  return {
    issueId: detail.issue.id,
    identifier: detail.issue.identifier,
    title: detail.issue.title,
    url: detail.issue.url,
    teamId: detail.team?.id ?? detail.issue.teamId ?? null,
  }
}

async function openUrl(url: string): Promise<void> {
  if (!url) throw new Error("issue URL is not available yet")
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

export function useIssueActions() {
  const renderer = useRenderer()
  const { setModal, addToast } = useStore()

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
      const copied = renderer.copyToClipboardOSC52(target.identifier)
      if (!copied) await copyWithSystemClipboard(target.identifier)
      addToast(`copied ${target.identifier}`, "success")
    } catch (e) {
      addToast(String(e instanceof Error ? e.message : e), "error")
    }
  }

  return {
    handleIssueKey(key: KeyEvent, target: IssueTarget, allowComment = false) {
      switch (key.name) {
        case "s":
          setModal({ type: "status", target })
          return true
        case "a":
          setModal({ type: "assignee", target })
          return true
        case "o":
          void openIssue(target)
          return true
        case "y":
          void copyIdentifier(target)
          return true
        case "c":
          if (!allowComment) return false
          setModal({ type: "comment", target })
          return true
        default:
          return false
      }
    },
  }
}
