import { useEffect, useState } from "react"
import { useKeyboard } from "@opentui/react"
import {
  searchIssuesQuery,
  searchKey,
  type IssueRow,
} from "../linear/queries"
import { peek } from "../linear/cache"
import { IssueList } from "../components/issue-list"
import { theme } from "../theme"

type Mode = "input" | "results"

export function Search({ active }: { active: boolean }) {
  const [query, setQuery] = useState("")
  const [rows, setRows] = useState<IssueRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [mode, setMode] = useState<Mode>("input")

  useEffect(() => {
    if (!query.trim()) {
      setRows(null)
      setError(null)
      setPending(false)
      return
    }
    const cached = peek<IssueRow[]>(searchKey(query))
    if (cached) {
      setRows(cached)
      setError(null)
      setPending(false)
      return
    }
    setPending(true)
    let cancelled = false
    const t = setTimeout(() => {
      searchIssuesQuery(query)
        .then((r) => {
          if (cancelled) return
          setRows(r)
          setError(null)
          setPending(false)
        })
        .catch((e) => {
          if (cancelled) return
          setError(String(e?.message ?? e))
          setPending(false)
        })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  useKeyboard((key) => {
    if (!active) return
    if (key.name === "tab") {
      setMode((m) =>
        m === "input" && rows && rows.length > 0 ? "results" : "input",
      )
    }
  })

  const inputFocused = active && mode === "input"
  const resultsActive = active && mode === "results"

  return (
    <box style={{ flexDirection: "column", flexGrow: 1, padding: 1 }}>
      <text fg={theme.fg} attributes={1}>Search</text>
      <text fg={theme.fgMuted}>
        {mode === "input"
          ? "type · tab → results · esc leaves"
          : "j/k navigate · enter open · tab back to input · esc leaves"}
      </text>
      <text fg={theme.fgMuted}> </text>
      <box
        style={{
          flexDirection: "row",
          borderStyle: "single",
          borderColor: inputFocused ? theme.borderActive : theme.border,
          paddingLeft: 1,
          paddingRight: 1,
        }}
      >
        <text fg={theme.accent}>/ </text>
        <input
          value={query}
          onInput={setQuery}
          focused={inputFocused}
          placeholder="search issues…"
        />
      </box>
      <text fg={theme.fgMuted}> </text>
      {!query.trim() ? (
        <text fg={theme.fgDim}>start typing to search</text>
      ) : (
        <IssueList
          title=""
          subtitle={
            pending
              ? "searching…"
              : rows
              ? `${rows.length} results${mode === "input" ? " · tab to navigate" : ""}`
              : undefined
          }
          rows={rows}
          error={error}
          active={resultsActive}
        />
      )}
    </box>
  )
}
