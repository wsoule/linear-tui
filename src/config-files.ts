import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

export function configFilePath(fileName: string): string | null {
  const home = process.env.HOME
  if (!home) return null
  return join(home, ".config", "linear-tui", fileName)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function readJsonConfig(fileName: string): unknown {
  const path = configFilePath(fileName)
  if (!path || !existsSync(path)) return undefined

  try {
    return JSON.parse(readFileSync(path, "utf8"))
  } catch {
    return undefined
  }
}

export function writeJsonConfig(fileName: string, value: unknown): void {
  const path = configFilePath(fileName)
  if (!path) return

  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
  } catch {
    // User config is convenience state; failed persistence should not break the TUI.
  }
}
