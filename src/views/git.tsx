import { useEffect, useState } from "react"
import { getGitBranches, switchGitBranch, type GitBranch } from "../git/repository"
import {
  createGhPullRequest,
  getGhPullRequests,
  openGhPullRequestChecks,
  type GhPullRequest,
} from "../github/cli"
import { resolveIssueIdentifier } from "../linear/queries"
import { SelectableList } from "../components/selectable-list"
import { openUrl } from "../components/issue-actions"
import { useStore } from "../state/store"
import { matchesKeyBinding } from "../keybindings"
import { theme } from "../theme"

type BranchRow = GitBranch & {
  pullRequest: GhPullRequest | null
}

function ellipsize(value: string, max: number): string {
  if (value.length <= max) return value
  if (max <= 1) return value.slice(0, max)
  return `${value.slice(0, max - 1)}…`
}

export function GitView({ active }: { active: boolean }) {
  const { setSelectedIssueId, addToast, keybindings, reloadToken, requestReload } = useStore()
  const [branches, setBranches] = useState<BranchRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ghError, setGhError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    setGhError(null)
    Promise.all([
      getGitBranches(),
      getGhPullRequests().catch((e) => {
        return {
          pullRequests: [] as GhPullRequest[],
          error: String(e instanceof Error ? e.message : e),
        }
      }),
    ])
      .then(([gitBranches, gh]) => {
        if (cancelled) return
        const pullRequests = Array.isArray(gh) ? gh : gh.pullRequests
        setGhError(Array.isArray(gh) ? null : gh.error)
        const prsByBranch = new Map(pullRequests.map((pr) => [pr.headRefName, pr]))
        setBranches(gitBranches.map((branch) => ({
          ...branch,
          pullRequest: prsByBranch.get(branch.name) ?? null,
        })))
      })
      .catch((e) => {
        if (cancelled) return
        setBranches([])
        setError(String(e instanceof Error ? e.message : e))
      })
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const openIssueForBranch = (branch: BranchRow) => {
    if (!branch.issueIdentifier) {
      addToast(`no Linear issue id in ${branch.name}`, "error")
      return
    }
    addToast(`opening ${branch.issueIdentifier}`, "info")
    resolveIssueIdentifier(branch.issueIdentifier)
      .then((issue) => {
        setSelectedIssueId(issue.id)
      })
      .catch((e) => {
        addToast(String(e instanceof Error ? e.message : e), "error")
      })
  }

  const openPullRequest = (branch: BranchRow) => {
    if (!branch.pullRequest) {
      addToast(`no GitHub PR for ${branch.name}`, "error")
      return
    }
    void openUrl(branch.pullRequest.url)
      .then(() => addToast(`opened PR #${branch.pullRequest?.number}`, "success"))
      .catch((e) => addToast(String(e instanceof Error ? e.message : e), "error"))
  }

  const checkoutBranch = (branch: BranchRow) => {
    addToast(`switching to ${branch.name}`, "info")
    switchGitBranch(branch.name)
      .then(() => {
        requestReload()
        addToast(`switched to ${branch.name}`, "success")
      })
      .catch((e) => addToast(String(e instanceof Error ? e.message : e), "error"))
  }

  const createOrOpenPullRequest = (branch: BranchRow) => {
    if (branch.pullRequest) {
      openPullRequest(branch)
      return
    }
    addToast(`opening PR create for ${branch.name}`, "info")
    createGhPullRequest(branch.name)
      .then(() => addToast(`opened PR create for ${branch.name}`, "success"))
      .catch((e) => addToast(String(e instanceof Error ? e.message : e), "error"))
  }

  const openChecks = (branch: BranchRow) => {
    if (!branch.pullRequest) {
      addToast(`no GitHub PR for ${branch.name}`, "error")
      return
    }
    openGhPullRequestChecks(branch.pullRequest.number)
      .then(() => addToast(`opened checks for PR #${branch.pullRequest?.number}`, "success"))
      .catch((e) => addToast(String(e instanceof Error ? e.message : e), "error"))
  }

  return (
    <SelectableList<BranchRow>
      title="Git"
      subtitle={
        branches
          ? [
              `${branches.length} branches`,
              "enter opens linked issue",
              `${keybindings.issueSwitchBranch} switches branch`,
              "o opens PR",
              "P creates PR",
              "v opens checks",
              "r reloads",
              ghError ? "gh unavailable" : null,
            ].filter(Boolean).join(" · ")
          : undefined
      }
      items={branches}
      error={error}
      active={active}
      emptyText="no local branches"
      getId={(branch) => branch.name}
      onSelect={openIssueForBranch}
      onKey={(key, branch) => {
        if (matchesKeyBinding(key, keybindings.issueSwitchBranch)) {
          checkoutBranch(branch)
          return true
        }
        if (key.name === "o") {
          openPullRequest(branch)
          return true
        }
        if (key.name === "v") {
          openChecks(branch)
          return true
        }
        if (key.name === "P" || key.name === "p" && key.shift) {
          createOrOpenPullRequest(branch)
          return true
        }
        return false
      }}
      renderRow={(branch) => (
        <box style={{ flexDirection: "row" }}>
          <text fg={branch.current ? theme.accent : theme.fgMuted}>
            {branch.current ? " current " : "         "}
          </text>
          <text fg={theme.fg}>{ellipsize(branch.name, 34).padEnd(34)}</text>
          <text fg={branch.issueIdentifier ? theme.warn : theme.fgMuted}>
            {` ${branch.issueIdentifier ?? "—"}`.padEnd(12)}
          </text>
          <text fg={branch.pullRequest ? theme.success : theme.fgMuted}>
            {branch.pullRequest
              ? ` #${branch.pullRequest.number} ${branch.pullRequest.isDraft ? "DRAFT" : branch.pullRequest.state}`.padEnd(16)
              : " —".padEnd(16)}
          </text>
          <text fg={branch.pullRequest?.checks.includes("fail") ? theme.danger : theme.fgMuted}>
            {` ${branch.pullRequest?.checks ?? "checks -"}`.padEnd(16)}
          </text>
          <text fg={theme.fgMuted}>{` ${branch.shortSha}`}</text>
          <text fg={theme.fgDim}>{` ${ellipsize(branch.relativeDate, 16).padEnd(16)}`}</text>
          <text fg={theme.fgMuted}>{` ${ellipsize(branch.subject, 72)}`}</text>
        </box>
      )}
    />
  )
}
