import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { KeyEvent } from "@opentui/core"

export const KEY_COMMANDS = [
  { key: "globalHelp", label: "Toggle help" },
  { key: "globalSettings", label: "Open settings" },
  { key: "globalNewIssue", label: "New top-level issue" },
  { key: "viewFilter", label: "Filter issues" },
  { key: "viewGroup", label: "Group issues" },
  { key: "issueStatus", label: "Change status" },
  { key: "issueAssign", label: "Reassign" },
  { key: "issueComment", label: "Comment" },
  { key: "issueNewSubIssue", label: "New sub-issue" },
  { key: "issueOpen", label: "Open in browser" },
  { key: "issueCopyId", label: "Copy issue id" },
  { key: "issueCopyBranch", label: "Copy branch name" },
  { key: "issueSwitchBranch", label: "Switch branch" },
] as const

export type KeyCommand = typeof KEY_COMMANDS[number]["key"]
export type Keybindings = Record<KeyCommand, string>

export const defaultKeybindings: Keybindings = {
  globalHelp: "?",
  globalSettings: ",",
  globalNewIssue: "N",
  viewFilter: "f",
  viewGroup: "ctrl+g",
  issueStatus: "s",
  issueAssign: "a",
  issueComment: "c",
  issueNewSubIssue: "n",
  issueOpen: "o",
  issueCopyId: "Y",
  issueCopyBranch: "y",
  issueSwitchBranch: "B",
}

function keybindingsPath(): string | null {
  const home = process.env.HOME
  if (!home) return null
  return join(home, ".config", "linear-tui", "keybindings.json")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function commandLabel(command: KeyCommand): string {
  return KEY_COMMANDS.find((item) => item.key === command)?.label ?? command
}

export function loadKeybindings(): Keybindings {
  const path = keybindingsPath()
  if (!path || !existsSync(path)) return defaultKeybindings

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"))
    if (!isRecord(parsed)) return defaultKeybindings
    const next = { ...defaultKeybindings }
    for (const command of KEY_COMMANDS) {
      const value = parsed[command.key]
      if (typeof value === "string" && value.trim()) {
        next[command.key] = value.trim()
      }
    }
    return next
  } catch {
    return defaultKeybindings
  }
}

export function saveKeybindings(keybindings: Keybindings): void {
  const path = keybindingsPath()
  if (!path) return

  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `${JSON.stringify(keybindings, null, 2)}\n`)
  } catch {
    // Keybindings are user convenience state; failed persistence should not break the TUI.
  }
}

export function matchesKeyBinding(key: KeyEvent, binding: string): boolean {
  const parts = binding.trim().split("+").map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) return false

  const keyToken = parts[parts.length - 1]!
  const modifiers = new Set(parts.slice(0, -1).map((part) => part.toLowerCase()))
  if (modifiers.has("ctrl") && !key.ctrl) return false
  if ((modifiers.has("alt") || modifiers.has("meta")) && !key.meta) return false

  const wantsShift = modifiers.has("shift") || keyToken.length === 1 && keyToken === keyToken.toUpperCase() && keyToken !== keyToken.toLowerCase()
  if (wantsShift) {
    return key.name === keyToken || key.name.toLowerCase() === keyToken.toLowerCase() && key.shift
  }
  return key.name === keyToken
}
