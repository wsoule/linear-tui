# linear-tui roadmap

## Phase 1 — foundation (DONE)

- Bun + TypeScript + OpenTUI React binding scaffold.
- `@linear/sdk` client with API-key bail on missing env.
- App shell: sidebar nav, view router, global keymap, help overlay.
- React-context store for `view`, `selectedIssueId`, `helpVisible`.
- **My Issues** view — assigned-to-viewer list with `j/k/g/G/enter`.
- **Issue detail** — title, meta (team / assignee / priority / state), description, comments.
- Reusable `IssueList` component with `active` prop to gate keyboard routing.

## Phase 2 — read views

All four reuse `IssueList`; the work is the queries plus a couple of minor UI affordances.

- **Inbox** — `linear.notifications({ first: 50 })`. Notifications wrap an issue + an actor; render as `[type] ISSUE-123 actor — title`. Add `r` to mark read (`notification.markAsRead()`).
- **Projects** — two-level: project list, enter drills into `project.issues({ first: 50 })`. Need a `viewMode: "list" | "project"` substate or a small breadcrumb stack in the store.
- **Cycles** — `team.activeCycle` per team; for the viewer's primary team, list `cycle.issues`. If the user is on multiple teams, show team picker first.
- **Search** — `/` opens an `<input>` at the top of the pane, 200ms debounce, `linear.searchIssues(query, { first: 30 })`. Show empty-state hints (try `assignee:me`, `state:in-progress`).

## Phase 3 — mutations (DONE)

This is the part that earns the TUI its keep over the web app.

- **Status change** — `s` on a list row or detail pane: popup `<select>` of `team.states.nodes` for that issue's team, then `issue.update({ stateId })`. Optimistic update.
- **Reassign** — `a`: popup `<select>` of `team.members`, then `issue.update({ assigneeId })`. Includes unassign.
- **Comment** — `c` on detail: `<textarea>` overlay, ctrl-enter to submit `linear.createComment({ issueId, body })`.
- **New issue** — `n`: full-screen form (team picker → title `<input>` → description `<textarea>` → priority `<select>`).
- **Open in browser** — `o`: opens `issue.url`.
- **Copy id** — `y`: writes `issue.identifier` to the terminal/system clipboard.

## Phase 4 — polish (DONE)

- **Status line** — bottom bar with viewer name, current view, subtle in-flight marker, last error.
- **In-memory cache** — small TTL'd map keyed by query so jumping list → detail → list doesn't re-fetch. Stale values render while fresh data syncs.
- **Optimistic updates** — DONE for Phase 3 issue state, assignee, comments, and new issue detail creation.
- **Toast** — DONE for Phase 3 mutation feedback and errors. Auto-dismiss after 3s.
- **Theme** — users can override the palette via `~/.config/linear-tui/theme.json`.

## Phase 5 — stretch

- **Triage queue** for teams the viewer triages.
- **Sub-issues** — collapsible tree in the list / detail.
- **Linked issues & relations** — render the relation graph inline.
- **Attachments** — list, open URL.
- **Offline queue** — buffer mutations when the network is down, replay on reconnect.
- **Multi-account** — switch between API keys / workspaces from the sidebar.

## Phase 6 - Viewing

 - **Filters** - allow for filtering on issues and save filters
 - **Grouping** - allow for grouping on issues and save groupings

## Known gotchas to keep in mind

- `useKeyboard` broadcasts to every mounted handler — every new keymap-owning component needs an `active` prop or equivalent guard, or it'll race with siblings.
- `@linear/sdk` returns lazy `Promise<Relation>` for everything; always batch with `Promise.all` on a row, never `await` in a `for` loop.
- OpenTUI's `<scrollbox>` doesn't auto-scroll the selected row into view — when adding longer lists (50+) we'll need to call `scrollChildIntoView` from a ref keyed on `selectedIndex`.
- Linear's REST/GraphQL rate limit is 1500 req/hr per key; the in-memory cache in Phase 4 isn't optional once we add live polling.
