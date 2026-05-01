import { useKeyboard, useRenderer } from "@opentui/react"
import { Sidebar } from "./components/sidebar"
import { Help } from "./components/help"
import { MyIssues } from "./views/my-issues"
import { Inbox } from "./views/inbox"
import { Projects } from "./views/projects"
import { Cycles } from "./views/cycles"
import { Search } from "./views/search"
import { IssueDetail } from "./views/issue-detail"
import { MutationLayer, ToastView } from "./components/mutation-layer"
import { StatusLine } from "./components/status-line"
import { StoreProvider, useStore } from "./state/store"
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
    toast,
  } = useStore()

  const inSearchView = view === "search" && !selectedIssueId

  useKeyboard((key) => {
    if (helpVisible) {
      if (key.name === "escape" || key.name === "?") setHelpVisible(false)
      return
    }

    if (modal) return

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
      case "?": setHelpVisible(true); break
      case "n": setModal({ type: "new-issue" }); break
      case "m": setView("my-issues"); break
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
