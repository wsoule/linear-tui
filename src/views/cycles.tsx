import { useEffect, useState } from "react"
import { useKeyboard } from "@opentui/react"
import type { Cycle } from "@linear/sdk"
import {
  cycleIssuesKey,
  getCycleIssuesForCycle,
  getViewerCycleData,
  CYCLES_KEY,
  type CycleViewData,
  type IssueRow,
} from "../linear/queries"
import { useCachedQuery } from "../linear/use-query"
import { IssueList } from "../components/issue-list"

function cycleLabel(cycle: Cycle): string {
  return cycle.name ? `Cycle ${cycle.number} - ${cycle.name}` : `Cycle ${cycle.number}`
}

function isCycleBackKey(key: { name: string; sequence?: string; raw?: string }) {
  return key.name === "[" || key.sequence === "[" || key.raw === "["
}

function isCycleForwardKey(key: { name: string; sequence?: string; raw?: string }) {
  return key.name === "]" || key.sequence === "]" || key.raw === "]"
}

export function Cycles({ active }: { active: boolean }) {
  const { data: cycleData, error: cycleError } = useCachedQuery<CycleViewData>(
    CYCLES_KEY,
    getViewerCycleData,
  )
  const cycles = cycleData?.cycles ?? []
  const activeIndex = Math.max(
    0,
    cycleData?.activeCycleId
      ? cycles.findIndex((cycle) => cycle.id === cycleData.activeCycleId)
      : cycles.findIndex((cycle) => cycle.isActive),
  )
  const [cycleIndex, setCycleIndex] = useState<number | null>(null)
  const selectedIndex = cycles.length === 0
    ? 0
    : Math.max(0, Math.min(cycles.length - 1, cycleIndex ?? activeIndex))
  const selectedCycle = cycles[selectedIndex]
  const { data: issues, error: issuesError } = useCachedQuery<IssueRow[]>(
    selectedCycle ? cycleIssuesKey(selectedCycle.id) : "cycle-issues:none",
    () => selectedCycle ? getCycleIssuesForCycle(selectedCycle) : Promise.resolve([]),
  )

  useEffect(() => {
    if (cycleIndex === null || cycles.length === 0 || cycleIndex < cycles.length) return
    setCycleIndex(cycles.length - 1)
  }, [cycleIndex, cycles.length])

  useKeyboard((key) => {
    if (!active || cycles.length <= 1) return
    if (!isCycleBackKey(key) && !isCycleForwardKey(key)) return
    const direction = isCycleBackKey(key) ? -1 : 1
    setCycleIndex((current) => {
      const start = current ?? selectedIndex
      return (start + direction + cycles.length) % cycles.length
    })
  })

  const subtitle = [
    cycleData?.team?.key,
    selectedCycle ? cycleLabel(selectedCycle) : null,
    cycles.length > 1 ? "[ / ] switch cycles" : null,
  ].filter(Boolean).join(" · ")

  return (
    <IssueList
      title="Cycles"
      subtitle={subtitle || undefined}
      rows={selectedCycle ? issues : cycleData ? [] : null}
      error={cycleError ?? issuesError}
      active={active}
      emptyText={selectedCycle ? "no issues in this cycle" : "no cycles"}
      cycle={selectedCycle}
    />
  )
}
