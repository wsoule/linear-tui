import { useStore, type View } from "../state/store"
import { theme } from "../theme"

const ITEMS: { view: View; label: string; key: string }[] = [
  { view: "my-issues", label: "My Issues", key: "m" },
  { view: "inbox", label: "Inbox", key: "i" },
  { view: "projects", label: "Projects", key: "p" },
  { view: "cycles", label: "Cycles", key: "c" },
  { view: "search", label: "Search", key: "/" },
]

export function Sidebar() {
  const { view, selectedIssueId, keybindings } = useStore()
  const activeView = selectedIssueId ? null : view

  return (
    <box
      style={{
        width: 22,
        flexDirection: "column",
        padding: 1,
        borderStyle: "single",
        borderColor: theme.border,
        backgroundColor: theme.bgPanel,
      }}
    >
      <text fg={theme.accent} attributes={1}>linear-tui</text>
      <text fg={theme.fgMuted}> </text>
      {ITEMS.map((item) => {
        const active = item.view === activeView
        return (
          <box
            key={item.view}
            style={{
              flexDirection: "row",
              backgroundColor: active ? theme.bgSelected : undefined,
            }}
          >
            <text fg={theme.fgMuted}>{` ${item.key} `}</text>
            <text fg={active ? theme.fg : theme.fgDim}>{item.label}</text>
          </box>
        )
      })}
      <text fg={theme.fgMuted}> </text>
      <text fg={theme.fgMuted}>{` ${keybindings.globalNewIssue}  new issue`}</text>
      <text fg={theme.fgMuted}>{` ${keybindings.globalSettings}  settings`}</text>
      <text fg={theme.fgMuted}>{` ${keybindings.globalHelp}  help`}</text>
      <text fg={theme.fgMuted}> q  quit</text>
    </box>
  )
}
