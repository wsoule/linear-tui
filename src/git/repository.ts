export type GitSummary = {
  available: boolean
  branch: string
  dirtyCount: number
  ahead: number
  behind: number
  issueIdentifier: string | null
}

export type GitBranch = {
  name: string
  current: boolean
  upstream: string
  shortSha: string
  relativeDate: string
  subject: string
  issueIdentifier: string | null
}

const textDecoder = new TextDecoder()

async function runGit(args: string[]): Promise<string> {
  const proc = Bun.spawn(["git", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).arrayBuffer(),
    new Response(proc.stderr).arrayBuffer(),
    proc.exited,
  ])
  if (code !== 0) {
    const message = textDecoder.decode(stderr).trim()
    throw new Error(message || `git ${args.join(" ")} failed`)
  }
  return textDecoder.decode(stdout).trimEnd()
}

export function issueIdentifierFromBranch(branchName: string): string | null {
  const match = branchName.match(/(^|[^a-z0-9])([a-z][a-z0-9]+)-(\d+)(?=$|[^a-z0-9])/i)
  if (!match) return null
  return `${match[2]!.toUpperCase()}-${match[3]}`
}

export async function getGitSummary(): Promise<GitSummary> {
  try {
    const output = await runGit(["status", "--short", "--branch"])
    const lines = output.split("\n").filter(Boolean)
    const header = lines[0]?.replace(/^##\s*/, "") ?? ""
    const branch = header.startsWith("HEAD ")
      ? "detached"
      : header.split("...")[0]?.split(" ")[0] || "unknown"
    const ahead = Number(header.match(/ahead (\d+)/)?.[1] ?? 0)
    const behind = Number(header.match(/behind (\d+)/)?.[1] ?? 0)
    return {
      available: true,
      branch,
      dirtyCount: Math.max(0, lines.length - 1),
      ahead,
      behind,
      issueIdentifier: issueIdentifierFromBranch(branch),
    }
  } catch {
    return {
      available: false,
      branch: "",
      dirtyCount: 0,
      ahead: 0,
      behind: 0,
      issueIdentifier: null,
    }
  }
}

export async function getGitBranches(): Promise<GitBranch[]> {
  const output = await runGit([
    "for-each-ref",
    "--sort=-committerdate",
    "--format=%(refname:short)%09%(HEAD)%09%(upstream:short)%09%(objectname:short)%09%(committerdate:relative)%09%(contents:subject)",
    "refs/heads",
  ])

  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [name = "", head = "", upstream = "", shortSha = "", relativeDate = "", subject = ""] =
        line.split("\t")
      return {
        name,
        current: head.trim() === "*",
        upstream,
        shortSha,
        relativeDate,
        subject,
        issueIdentifier: issueIdentifierFromBranch(name),
      }
    })
    .sort((a, b) => Number(b.current) - Number(a.current))
}
