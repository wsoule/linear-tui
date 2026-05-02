import type { ReactNode } from "react"

type TextLineProps = {
  children?: ReactNode
  fg?: string
  attributes?: number
}

export function TextLine({ children = "", fg, attributes }: TextLineProps) {
  return (
    <text
      fg={fg}
      attributes={attributes}
      truncate
      style={{ width: "100%", height: 1 }}
    >
      {children}
    </text>
  )
}
