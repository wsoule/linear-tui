import { useKeyboard, useRenderer } from "@opentui/react"
import { Sidebar } from "./components/sidebar"
import { Help } from "./components/help"
import { MyIssues } from "./views/my-issues"
import { Issues } from "./views/issues"
import { Triage } from "./views/triage"
import { Inbox } from "./views/inbox"
import { Projects } from "./views/projects"
import { Cycles } from "./views/cycles"
import { Search } from "./views/search"
import { IssueDetail } from "./views/issue-detail"
import { MutationLayer, ToastView } from "./components/mutation-layer"
import { StatusLine } from "./components/status-line"
import { StoreProvider, useStore } from "./state/store"
import { matchesKeyBinding } from "./keybindings"
import { invalidate } from "./linear/cache"
import { theme } from "./theme"

function Shell() {
  const renderer = useRenderer()
  const {
    view,
    setView,
    selectedIssueId,
    setSelectedIssueId,
    selectedProjectId,
    setSelectedProjectId,
    helpVisible,
    setHelpVisible,
    modal,
    setModal,
    keybindings,
    toast,
    addToast,
  } = useStore()

  const inSearchView = view === "search" && !selectedIssueId

  useKeyboard((key) => {
    if (helpVisible) {
      if (key.name === "escape" || matchesKeyBinding(key, keybindings.globalHelp)) setHelpVisible(false)
      return
    }

    if (modal) return

    if (matchesKeyBinding(key, keybindings.globalHelp)) {
      setHelpVisible(true)
      return
    }

    if (matchesKeyBinding(key, keybindings.globalSettings)) {
      setModal({ type: "settings" })
      return
    }

    if (!inSearchView && matchesKeyBinding(key, keybindings.globalNewIssue)) {
      setModal({ type: "new-issue" })
      return
    }

    if (!inSearchView && matchesKeyBinding(key, keybindings.globalReload)) {
      invalidate()
      addToast("reloading page")
      return
    }

    if (key.name === "escape") {
      if (selectedIssueId) setSelectedIssueId(null)
      else if (selectedProjectId) setSelectedProjectId(null)
      else if (view === "search") setView("my-issues")
      return
    }

    if (selectedIssueId) {
      if (key.name === "h") setSelectedIssueId(null)
      return
    }

    if (inSearchView) return

    switch (key.name) {
      case "q": renderer.destroy(); break
      case "m": setView("my-issues"); break
      case "x": setView("issues"); break
      case "t": setView("triage"); break
      case "i": setView("inbox"); break
      case "p": setView("projects"); break
      case "c": setView("cycles"); break
      case "/": setView("search"); break
    }
  })

  const listActive = !selectedIssueId && !helpVisible && !modal

  let content
  if (selectedIssueId) {
    content = <IssueDetail issueId={selectedIssueId} active={!modal && !helpVisible} />
  } else if (view === "my-issues") {
    content = <MyIssues active={listActive} />
  } else if (view === "issues") {
    content = <Issues active={listActive} />
  } else if (view === "triage") {
    content = <Triage active={listActive} />
  } else if (view === "inbox") {
    content = <Inbox active={listActive} />
  } else if (view === "projects") {
    content = <Projects active={listActive} />
  } else if (view === "cycles") {
    content = <Cycles active={listActive} />
  } else if (view === "search") {
    content = <Search active={listActive} />
  }

  return (
    <box
      style={{
        flexDirection: "row",
        width: "100%",
        height: "100%",
        backgroundColor: theme.bg,
      }}
    >
      <Sidebar />
      <box style={{ flexDirection: "column", flexGrow: 1 }}>
        {content}
        <StatusLine />
      </box>
      <MutationLayer />
      {toast && <ToastView toast={toast} />}
      {helpVisible && <Help />}
    </box>
  )
}

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
