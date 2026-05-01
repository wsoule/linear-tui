import { useEffect, useRef, useState, type ReactNode } from "react"
import { useKeyboard } from "@opentui/react"
import type { KeyEvent, ScrollBoxRenderable } from "@opentui/core"
import { theme } from "../theme"

type Props<T> = {
  title: string
  subtitle?: string
  items: T[] | null
  error: string | null
  active: boolean
  emptyText?: string
  getId: (item: T) => string
  renderRow: (item: T, selected: boolean) => ReactNode
  onSelect: (item: T) => void
  onKey?: (key: KeyEvent, item: T) => boolean
}

export function SelectableList<T>({
  title,
  subtitle,
  items,
  error,
  active,
  emptyText = "(none)",
  getId,
  renderRow,
  onSelect,
  onKey,
}: Props<T>) {
  const [index, setIndex] = useState(0)
  const scrollRef = useRef<ScrollBoxRenderable | null>(null)

  useEffect(() => {
    if (items && index >= items.length) setIndex(Math.max(0, items.length - 1))
  }, [items, index])

  useEffect(() => {
    if (!items || items.length === 0) return
    const item = items[index]
    if (!item) return
    scrollRef.current?.scrollChildIntoView(`row-${getId(item)}`)
  }, [index, items, getId])

  useKeyboard((key) => {
    if (!active || !items || items.length === 0) return
    const selectedItem = items[index]!
    if (onKey?.(key, selectedItem)) return
    switch (key.name) {
      case "j":
      case "down":
        setIndex((i) => Math.min(items.length - 1, i + 1)); break
      case "k":
      case "up":
        setIndex((i) => Math.max(0, i - 1)); break
      case "g":
        setIndex(0); break
      case "G":
        setIndex(items.length - 1); break
      case "return":
      case "l":
        onSelect(selectedItem); break
    }
  })

  return (
    <box style={{ flexDirection: "column", flexGrow: 1, padding: 1 }}>
      <text fg={theme.fg} attributes={1}>{title}</text>
      <text fg={theme.fgMuted}>
        {subtitle ?? (items ? `${items.length} items` : "no local data yet")}
      </text>
      <text fg={theme.fgMuted}> </text>
      {error ? (
        <text fg={theme.danger}>error: {error}</text>
      ) : !items ? (
        <text fg={theme.fgDim}>no cached rows yet</text>
      ) : items.length === 0 ? (
        <text fg={theme.fgDim}>{emptyText}</text>
      ) : (
        <scrollbox ref={scrollRef} style={{ flexGrow: 1 }} stickyScroll={false}>
          {items.map((item, i) => {
            const selected = i === index
            const id = getId(item)
            return (
              <box
                key={id}
                id={`row-${id}`}
                style={{
                  flexDirection: "row",
                  backgroundColor: selected ? theme.bgSelected : theme.bg,
                  paddingLeft: 1,
                  paddingRight: 1,
                }}
              >
                <text fg={selected ? theme.accent : theme.fgMuted}>
                  {selected ? "▌" : " "}
                </text>
                {renderRow(item, selected)}
              </box>
            )
          })}
        </scrollbox>
      )}
    </box>
  )
}
