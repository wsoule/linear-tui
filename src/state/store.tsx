import { createContext, useContext, useState, type ReactNode } from "react"
import {
  loadKeybindings,
  saveKeybindings,
  type Keybindings,
  type KeyCommand,
} from "../keybindings"
import {
  loadViewingPreferences,
  saveViewingPreferences,
  type ViewingPreferences,
} from "../viewing/preferences"

export type View = "my-issues" | "issues" | "triage" | "inbox" | "projects" | "cycles" | "search"
export type IssueTarget = {
  issueId: string
  identifier: string
  title: string
  url: string
  teamId: string | null
  branchName: string
}

export type Modal =
  | { type: "status"; target: IssueTarget }
  | { type: "assignee"; target: IssueTarget }
  | { type: "comment"; target: IssueTarget }
  | { type: "edit-issue"; target: IssueTarget }
  | { type: "cycle"; target: IssueTarget }
  | { type: "new-issue"; parent?: IssueTarget }
  | { type: "filter" }
  | { type: "group" }
  | { type: "order" }
  | { type: "settings" }

export type Toast = {
  id: number
  message: string
  tone: "info" | "success" | "error"
}

type Store = {
  view: View
  setView: (v: View) => void
  selectedIssueId: string | null
  setSelectedIssueId: (id: string | null) => void
  selectedProjectId: string | null
  setSelectedProjectId: (id: string | null) => void
  helpVisible: boolean
  setHelpVisible: (v: boolean) => void
  modal: Modal | null
  setModal: (modal: Modal | null) => void
  viewingPreferences: ViewingPreferences
  setViewingPreferences: (
    next: ViewingPreferences | ((current: ViewingPreferences) => ViewingPreferences)
  ) => void
  keybindings: Keybindings
  setKeybinding: (command: KeyCommand, binding: string) => void
  toast: Toast | null
  addToast: (message: string, tone?: Toast["tone"]) => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("my-issues")
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [helpVisible, setHelpVisible] = useState(false)
  const [modal, setModal] = useState<Modal | null>(null)
  const [viewingPreferences, setViewingPreferencesState] =
    useState<ViewingPreferences>(loadViewingPreferences)
  const [keybindings, setKeybindings] = useState<Keybindings>(loadKeybindings)
  const [toast, setToast] = useState<Toast | null>(null)

  const setViewWrapped = (v: View) => {
    setSelectedProjectId(null)
    setView(v)
  }

  const addToast = (message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now()
    setToast({ id, message, tone })
    setTimeout(() => {
      setToast((current) => current?.id === id ? null : current)
    }, 3000)
  }

  const setViewingPreferences = (
    next: ViewingPreferences | ((current: ViewingPreferences) => ViewingPreferences),
  ) => {
    setViewingPreferencesState((current) => {
      const resolved = typeof next === "function" ? next(current) : next
      saveViewingPreferences(resolved)
      return resolved
    })
  }

  const setKeybinding = (command: KeyCommand, binding: string) => {
    setKeybindings((current) => {
      const next = {
        ...current,
        [command]: binding.trim(),
      }
      saveKeybindings(next)
      return next
    })
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
        modal,
        setModal,
        viewingPreferences,
        setViewingPreferences,
        keybindings,
        setKeybinding,
        toast,
        addToast,
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
