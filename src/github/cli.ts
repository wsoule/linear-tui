export type GhPullRequest = {
  number: number
  title: string
  headRefName: string
  state: string
  url: string
  isDraft: boolean
  reviewDecision: string | null
  checks: string
}

type GhPullRequestPayload = Omit<GhPullRequest, "checks"> & {
  statusCheckRollup?: unknown[]
}

const textDecoder = new TextDecoder()

async function runGh(args: string[], allowedExitCodes = [0]): Promise<string> {
  const proc = Bun.spawn(["gh", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).arrayBuffer(),
    new Response(proc.stderr).arrayBuffer(),
    proc.exited,
  ])
  if (!allowedExitCodes.includes(code)) {
    const message = textDecoder.decode(stderr).trim()
    throw new Error(message || `gh ${args.join(" ")} failed`)
  }
  return textDecoder.decode(stdout).trimEnd()
}

function stringValue(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null
  const next = (value as Record<string, unknown>)[key]
  return typeof next === "string" ? next : null
}

function summarizeChecks(checks: unknown[] | undefined): string {
  if (!checks || checks.length === 0) return "checks -"

  let failed = 0
  let pending = 0
  let passed = 0
  for (const check of checks) {
    const conclusion = stringValue(check, "conclusion") ?? stringValue(check, "state")
    const status = stringValue(check, "status")
    if (conclusion === "FAILURE" || conclusion === "FAILED" || conclusion === "ERROR" || conclusion === "CANCELLED") {
      failed += 1
    } else if (!conclusion || status && status !== "COMPLETED") {
      pending += 1
    } else {
      passed += 1
    }
  }

  if (failed > 0) return `checks fail ${failed}`
  if (pending > 0) return `checks wait ${pending}`
  return `checks pass ${passed}`
}

function normalizePullRequest(payload: GhPullRequestPayload): GhPullRequest {
  return {
    number: payload.number,
    title: payload.title,
    headRefName: payload.headRefName,
    state: payload.state,
    url: payload.url,
    isDraft: payload.isDraft,
    reviewDecision: payload.reviewDecision,
    checks: summarizeChecks(payload.statusCheckRollup),
  }
}

export async function getGhPullRequests(): Promise<GhPullRequest[]> {
  const output = await runGh([
    "pr",
    "list",
    "--state",
    "all",
    "--limit",
    "100",
    "--json",
    "number,title,headRefName,state,url,isDraft,reviewDecision,statusCheckRollup",
  ])
  const parsed = JSON.parse(output || "[]") as GhPullRequestPayload[]
  return parsed.map(normalizePullRequest)
}

export async function getGhCurrentPullRequest(): Promise<GhPullRequest | null> {
  try {
    const output = await runGh([
      "pr",
      "view",
      "--json",
      "number,title,headRefName,state,url,isDraft,reviewDecision,statusCheckRollup",
    ])
    return normalizePullRequest(JSON.parse(output) as GhPullRequestPayload)
  } catch (e) {
    const message = String(e instanceof Error ? e.message : e)
    if (message.includes("no pull requests found")) return null
    throw e
  }
}

export async function openGhPullRequest(branchOrNumber: string | number): Promise<void> {
  await runGh(["pr", "view", String(branchOrNumber), "--web"])
}

export async function openGhPullRequestChecks(branchOrNumber: string | number): Promise<void> {
  await runGh(["pr", "checks", String(branchOrNumber), "--web"], [0, 8])
}

export async function createGhPullRequest(branchName: string): Promise<void> {
  await runGh(["pr", "create", "--web", "--head", branchName])
}
