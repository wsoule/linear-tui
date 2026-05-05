import { theme } from "../theme"
import { useStore } from "../state/store"

export function Help() {
  const { keybindings } = useStore()
  const sections: { heading: string; rows: [string, string][] }[] = [
    {
      heading: "views",
      rows: [
        ["m", "my issues"],
        ["w", "current work"],
        ["x", "issues"],
        ["t", "triage"],
        ["i", "inbox"],
        ["p", "projects"],
        ["c", "cycles"],
        ["b", "git branches"],
        ["/", "search"],
      ],
    },
    {
      heading: "navigation",
      rows: [
        ["j / ↓", "down"],
        ["k / ↑", "up"],
        ["ctrl+n", "next"],
        ["ctrl+p", "previous"],
        ["ctrl+y", "accept"],
        ["g", "top"],
        ["G", "bottom"],
        ["enter / l", "open"],
        ["esc / h", "back"],
      ],
    },
    {
      heading: "issue rows",
      rows: [
        [keybindings.issueStatus, "change status"],
        [keybindings.issueAssign, "reassign"],
        [keybindings.issueEdit, "edit title/description"],
        [keybindings.issueCycle, "set cycle"],
        [keybindings.issueNewSubIssue, "new sub-issue"],
        [keybindings.issueOpen, "open in browser"],
        [keybindings.issueCopyBranch, "copy branch"],
        [keybindings.issueCopyId, "copy issue id"],
        [keybindings.issueSwitchBranch, "switch branch"],
        [keybindings.viewFilter, "filter issues"],
        [keybindings.viewStatusFilter, "filter by status"],
        [keybindings.viewGroup, "group issues"],
        [keybindings.viewOrder, "order issues"],
      ],
    },
    {
      heading: "issue detail",
      rows: [
        [keybindings.issueStatus, "change status"],
        [keybindings.issueAssign, "reassign"],
        [keybindings.issueEdit, "edit title/description"],
        [keybindings.issueCycle, "set cycle"],
        [keybindings.issuePriority, "set priority"],
        [keybindings.issueComment, "comment"],
        [keybindings.issueNewSubIssue, "new sub-issue"],
        [keybindings.issueOpen, "open in browser"],
        [keybindings.issueCopyBranch, "copy branch"],
        [keybindings.issueCopyId, "copy issue id"],
        [keybindings.issueSwitchBranch, "switch branch"],
        ["tab", "select attachment"],
        ["enter", "open attachment"],
        ["j / k", "scroll line"],
        ["ctrl+d / u", "scroll half-page"],
        ["space / pgdn", "scroll viewport"],
        ["g / G", "top / bottom"],
      ],
    },
    {
      heading: "search",
      rows: [
        ["tab", "toggle input ↔ results"],
        ["ctrl+n / p", "results"],
        ["ctrl+y", "open first result"],
        ["esc", "leave search"],
      ],
    },
    {
      heading: "git",
      rows: [
        ["b", "branches view"],
        ["enter", "open linked issue"],
        ["o", "open GitHub PR"],
        ["P", "create/open PR"],
        ["v", "open PR checks"],
        [keybindings.issueSwitchBranch, "switch branch"],
        ["r", "reload branches"],
      ],
    },
    {
      heading: "global",
      rows: [
        [keybindings.globalNewIssue, "new issue"],
        [keybindings.globalReload, "reload page"],
        [keybindings.globalCommandPalette, "command palette"],
        ["ctrl+n / p", "palette next / previous"],
        ["ctrl+y", "palette accept"],
        [keybindings.globalSettings, "settings"],
        [keybindings.globalHelp, "toggle help"],
        ["q", "quit"],
      ],
    },
  ]

  return (
    <box
      style={{
        position: "absolute",
        top: 2,
        left: 4,
        padding: 1,
        borderStyle: "double",
        borderColor: theme.borderActive,
        backgroundColor: theme.bgPanel,
        flexDirection: "column",
      }}
    >
      <text fg={theme.accent} attributes={1}>keys</text>
      {sections.map((section) => (
        <box key={section.heading} style={{ flexDirection: "column", marginTop: 1 }}>
          <text fg={theme.fgDim}>{section.heading}</text>
          {section.rows.map(([k, label]) => (
            <box key={k} style={{ flexDirection: "row" }}>
              <text fg={theme.warn}>{k.padEnd(14)}</text>
              <text fg={theme.fgDim}>{label}</text>
            </box>
          ))}
        </box>
      ))}
      <text fg={theme.fgMuted}> </text>
      <text fg={theme.fgMuted}>press ? or esc to close</text>
    </box>
  )
}
