import { theme } from "../theme"

const SECTIONS: { heading: string; rows: [string, string][] }[] = [
  {
    heading: "views",
    rows: [
      ["m", "my issues"],
      ["i", "inbox"],
      ["p", "projects"],
      ["c", "cycles"],
      ["/", "search"],
    ],
  },
  {
    heading: "navigation",
    rows: [
      ["j / ↓", "down"],
      ["k / ↑", "up"],
      ["g", "top"],
      ["G", "bottom"],
      ["enter / l", "open"],
      ["esc / h", "back"],
    ],
  },
  {
    heading: "issue rows",
    rows: [
      ["s", "change status"],
      ["a", "reassign"],
      ["o", "open in browser"],
      ["y", "copy issue id"],
      ["b", "copy branch"],
      ["B", "switch branch"],
      ["f", "filter issues"],
      ["ctrl+g", "group issues"],
    ],
  },
  {
    heading: "issue detail",
    rows: [
      ["s", "change status"],
      ["a", "reassign"],
      ["c", "comment"],
      ["o", "open in browser"],
      ["y", "copy issue id"],
      ["b", "copy branch"],
      ["B", "switch branch"],
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
      ["esc", "leave search"],
    ],
  },
  {
    heading: "global",
    rows: [
      ["n", "new issue"],
      ["?", "toggle help"],
      ["q", "quit"],
    ],
  },
]

export function Help() {
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
      {SECTIONS.map((section) => (
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
