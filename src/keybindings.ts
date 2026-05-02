import type { KeyEvent } from "@opentui/core"
import { isRecord, readJsonConfig, writeJsonConfig } from "./config-files"

export const KEY_COMMANDS = [
  { key: "globalHelp", label: "Toggle help" },
  { key: "globalSettings", label: "Open settings" },
  { key: "globalNewIssue", label: "New top-level issue" },
  { key: "viewFilter", label: "Filter issues" },
  { key: "viewGroup", label: "Group issues" },
  { key: "viewOrder", label: "Order issues" },
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
  viewOrder: "ctrl+o",
  issueStatus: "s",
  issueAssign: "a",
  issueComment: "c",
  issueNewSubIssue: "n",
  issueOpen: "o",
  issueCopyId: "Y",
  issueCopyBranch: "y",
  issueSwitchBranch: "B",
}

const shiftedSymbolBase: Record<string, string> = {
  "~": "`",
  "!": "1",
  "@": "2",
  "#": "3",
  "$": "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(": "9",
  ")": "0",
  "_": "-",
  "+": "=",
  "{": "[",
  "}": "]",
  "|": "\\",
  ":": ";",
  "\"": "'",
  "<": ",",
  ">": ".",
  "?": "/",
}

export function commandLabel(command: KeyCommand): string {
  return KEY_COMMANDS.find((item) => item.key === command)?.label ?? command
}

export function loadKeybindings(): Keybindings {
  const parsed = readJsonConfig("keybindings.json")
  if (!isRecord(parsed)) return defaultKeybindings

  const next = { ...defaultKeybindings }
  for (const command of KEY_COMMANDS) {
    const value = parsed[command.key]
    if (typeof value === "string" && value.trim()) {
      next[command.key] = value.trim()
    }
  }
  return next
}

export function saveKeybindings(keybindings: Keybindings): void {
  writeJsonConfig("keybindings.json", keybindings)
}

export function matchesKeyBinding(key: KeyEvent, binding: string): boolean {
  const parts = binding.trim().split("+").map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) return false

  const keyToken = parts[parts.length - 1]!
  const modifiers = new Set(parts.slice(0, -1).map((part) => part.toLowerCase()))
  const expectsCtrl = modifiers.has("ctrl")
  const expectsMeta = modifiers.has("alt") || modifiers.has("meta")
  if (expectsCtrl !== key.ctrl) return false
  if (expectsMeta !== key.meta) return false

  const isSingleAlpha = /^[a-z]$/i.test(keyToken)
  if (isSingleAlpha) {
    const expectsShift =
      modifiers.has("shift") ||
      keyToken === keyToken.toUpperCase() && keyToken !== keyToken.toLowerCase()
    const sameKey = key.name.toLowerCase() === keyToken.toLowerCase()
    if (!sameKey) return false
    if (expectsShift) return key.shift || key.name === keyToken
    return !key.shift && key.name === keyToken.toLowerCase()
  }

  const shiftedBase = shiftedSymbolBase[keyToken]
  const matchesToken = key.name === keyToken || key.sequence === keyToken || key.raw === keyToken
  if (shiftedBase) return matchesToken || key.shift && key.name === shiftedBase
  if (modifiers.has("shift")) return key.shift && matchesToken
  return !key.shift && matchesToken
}
