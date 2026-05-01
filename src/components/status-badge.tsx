import type { WorkflowState } from "@linear/sdk"
import { theme } from "../theme"

const GLYPHS: Record<string, string> = {
  backlog: "○",
  unstarted: "○",
  started: "◐",
  completed: "●",
  canceled: "⊘",
  triage: "△",
}

export function StatusBadge({ state }: { state: WorkflowState | undefined }) {
  if (!state) return <text fg={theme.fgMuted}>?</text>
  const glyph = GLYPHS[state.type] ?? "○"
  return <text fg={state.color ?? theme.fgDim}>{glyph}</text>
}
