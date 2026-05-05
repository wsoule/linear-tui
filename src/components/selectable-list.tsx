import { useEffect, useRef, useState, type ReactNode } from "react"
import { useKeyboard } from "@opentui/react"
import type { KeyEvent, ScrollBoxRenderable } from "@opentui/core"
import { isVimAcceptKey, isVimNextKey, isVimPreviousKey } from "../keybindings"
import { theme } from "../theme"
import { TextLine } from "./text-line"

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
  isSelectable?: (item: T) => boolean
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
  isSelectable,
}: Props<T>) {
  const [index, setIndex] = useState(0)
  const scrollRef = useRef<ScrollBoxRenderable | null>(null)
  const canSelect = (item: T) => isSelectable?.(item) ?? true

  const firstSelectableIndex = (items: T[]) => {
    const first = items.findIndex(canSelect)
    return first === -1 ? 0 : first
  }

  const lastSelectableIndex = (items: T[]) => {
    for (let i = items.length - 1; i >= 0; i -= 1) {
      if (canSelect(items[i]!)) return i
    }
    return 0
  }

  const nextSelectableIndex = (items: T[], start: number, direction: 1 | -1) => {
    for (let i = start + direction; i >= 0 && i < items.length; i += direction) {
      if (canSelect(items[i]!)) return i
    }
    return start
  }

  const nearestSelectableIndex = (items: T[], start: number) => {
    if (items.length === 0) return 0
    const clamped = Math.max(0, Math.min(items.length - 1, start))
    if (canSelect(items[clamped]!)) return clamped
    const forward = nextSelectableIndex(items, clamped, 1)
    if (forward !== clamped) return forward
    const backward = nextSelectableIndex(items, clamped, -1)
    if (backward !== clamped) return backward
    return 0
  }

  useEffect(() => {
    if (!items || items.length === 0) {
      if (index !== 0) setIndex(0)
      return
    }
    const nextIndex = nearestSelectableIndex(items, index)
    if (nextIndex !== index) setIndex(nextIndex)
  }, [items, index, isSelectable])

  useEffect(() => {
    if (!items || items.length === 0) return
    const item = items[index]
    if (!item) return
    scrollRef.current?.scrollChildIntoView(`row-${getId(item)}`)
  }, [index, items, getId])

  useKeyboard((key) => {
    if (!active || !items || items.length === 0) return
    const selectedItem = items[index]!
    if (!canSelect(selectedItem)) return
    if (onKey?.(key, selectedItem)) return
    if (isVimNextKey(key)) {
      setIndex((i) => nextSelectableIndex(items, i, 1))
      return
    }
    if (isVimPreviousKey(key)) {
      setIndex((i) => nextSelectableIndex(items, i, -1))
      return
    }
    if (isVimAcceptKey(key)) {
      onSelect(selectedItem)
      return
    }
    switch (key.name) {
      case "j":
      case "down":
        setIndex((i) => nextSelectableIndex(items, i, 1)); break
      case "k":
      case "up":
        setIndex((i) => nextSelectableIndex(items, i, -1)); break
      case "g":
        if (!key.ctrl && !key.meta) {
          setIndex(key.shift ? lastSelectableIndex(items) : firstSelectableIndex(items))
        }
        break
      case "return":
      case "l":
        onSelect(selectedItem); break
    }
  })

  return (
    <box style={{ flexDirection: "column", flexGrow: 1, padding: 1 }}>
      <TextLine fg={theme.fg} attributes={1}>{title}</TextLine>
      <TextLine fg={theme.fgMuted}>
        {subtitle ?? (items ? `${items.length} items` : "no local data yet")}
      </TextLine>
      <TextLine fg={theme.fgMuted}> </TextLine>
      {error ? (
        <TextLine fg={theme.danger}>error: {error}</TextLine>
      ) : !items ? (
        <TextLine fg={theme.fgDim}>no cached rows yet</TextLine>
      ) : items.length === 0 ? (
        <TextLine fg={theme.fgDim}>{emptyText}</TextLine>
      ) : (
        <scrollbox ref={scrollRef} style={{ flexGrow: 1 }} stickyScroll={false}>
          {items.map((item, i) => {
            const selected = i === index
            const id = getId(item)
            const selectable = canSelect(item)
            return (
              <box
                key={id}
                id={`row-${id}`}
                style={{
                  width: "100%",
                  flexDirection: "row",
                  backgroundColor: selected ? theme.bgSelected : theme.bg,
                  paddingLeft: 1,
                  paddingRight: 1,
                }}
              >
                <text fg={selected && selectable ? theme.accent : theme.fgMuted}>
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
