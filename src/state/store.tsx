import { createContext, useContext, useState, type ReactNode } from "react"

export type View = "my-issues" | "inbox" | "projects" | "cycles" | "search"

type Store = {
  view: View
  setView: (v: View) => void
  selectedIssueId: string | null
  setSelectedIssueId: (id: string | null) => void
  selectedProjectId: string | null
  setSelectedProjectId: (id: string | null) => void
  helpVisible: boolean
  setHelpVisible: (v: boolean) => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("my-issues")
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [helpVisible, setHelpVisible] = useState(false)

  const setViewWrapped = (v: View) => {
    setSelectedProjectId(null)
    setView(v)
  }

  return (
    <Ctx.Provider
      value={{
        view,
        setView: setViewWrapped,
        selectedIssueId,
        setSelectedIssueId,
        selectedProjectId,
        setSelectedProjectId,
        helpVisible,
        setHelpVisible,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useStore(): Store {
  const v = useContext(Ctx)
  if (!v) throw new Error("StoreProvider missing")
  return v
}
