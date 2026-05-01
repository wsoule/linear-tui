import type { ProjectRow } from "../linear/queries"
import { SelectableList } from "./selectable-list"
import { useStore } from "../state/store"
import { theme } from "../theme"

const STATE_COLOR: Record<string, string> = {
  planned: "#8a8a96",
  started: "#5e6ad2",
  paused: "#f2c94c",
  completed: "#4cb782",
  canceled: "#5c5c66",
  backlog: "#8a8a96",
}

function progressBar(progress: number, width = 8): string {
  const filled = Math.round(progress * width)
  return "█".repeat(filled) + "░".repeat(width - filled)
}

type Props = {
  rows: ProjectRow[] | null
  error: string | null
  active: boolean
}

export function ProjectList({ rows, error, active }: Props) {
  const { setSelectedProjectId } = useStore()
  return (
    <SelectableList<ProjectRow>
      title="Projects"
      subtitle={rows ? `${rows.length} projects` : undefined}
      items={rows}
      error={error}
      active={active}
      getId={(r) => r.project.id}
      onSelect={(r) => setSelectedProjectId(r.project.id)}
      renderRow={(r) => {
        const pct = Math.round((r.project.progress ?? 0) * 100)
        const stateColor = STATE_COLOR[r.project.state] ?? theme.fgDim
        return (
          <>
            <text fg={stateColor}>{` ● `}</text>
            <text fg={theme.fg}>{r.project.name.padEnd(28).slice(0, 28)}</text>
            <text fg={theme.fgMuted}>{` ${progressBar(r.project.progress ?? 0)} `}</text>
            <text fg={theme.fgDim}>{`${String(pct).padStart(3)}%`}</text>
            <text fg={theme.fgMuted}>{`  lead: ${r.lead?.displayName ?? "—"}`}</text>
          </>
        )
      }}
    />
  )
}
