import { useEffect, useRef, useState, type ReactNode } from "react"
import { useKeyboard } from "@opentui/react"
import type { Cycle, Issue, Team, User, WorkflowState } from "@linear/sdk"
import type { InputRenderable, SelectKeyBinding, TextareaRenderable } from "@opentui/core"
import { useStore, type IssueTarget, type StatusFilterOption, type Toast, type View } from "../state/store"
import {
  KEY_COMMANDS,
  commandLabel,
  isVimAcceptKey,
  isVimNextKey,
  isVimPreviousKey,
  type KeyCommand,
} from "../keybindings"
import {
  appendCommentCache,
  createIssue,
  createIssueComment,
  getIssueDetail,
  getTeamCycles,
  getTeamMembers,
  getTeamStates,
  getViewerTeams,
  issueDetailKey,
  patchIssueCaches,
  rememberIssueDetail,
  teamCyclesKey,
  teamMembersKey,
  teamStatesKey,
  updateIssueAssignee,
  updateIssueCycle,
  updateIssuePriority,
  updateIssueState,
  updateIssueText,
  VIEWER_TEAMS_KEY,
  type IssueDetailData,
} from "../linear/queries"
import { useCachedQuery } from "../linear/use-query"
import { invalidate } from "../linear/cache"
import {
  GROUP_OPTIONS,
  ORDER_OPTIONS,
  groupByLabel,
  orderByLabel,
  statusFilterLabel,
  type IssueGroupBy,
  type IssueOrderBy,
} from "../viewing/preferences"
import { theme } from "../theme"

const priorities = [
  { name: "No priority", value: 0 },
  { name: "Urgent", value: 1 },
  { name: "High", value: 2 },
  { name: "Medium", value: 3 },
  { name: "Low", value: 4 },
]

const VIM_SELECT_KEY_BINDINGS: SelectKeyBinding[] = [
  { name: "n", ctrl: true, action: "move-down" },
  { name: "p", ctrl: true, action: "move-up" },
  { name: "y", ctrl: true, action: "select-current" },
]

function priorityLabel(priority: number): string {
  return priorities.find((p) => p.value === priority)?.name ?? "No priority"
}

function cycleLabel(cycle: Cycle | null | undefined): string {
  if (!cycle) return "No cycle"
  return cycle.name ? `Cycle ${cycle.number} - ${cycle.name}` : `Cycle ${cycle.number}`
}

function submittedInputValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function useModalEscape() {
  const { setModal } = useStore()
  useKeyboard((key) => {
    if (key.name === "escape") setModal(null)
  })
}

function ModalFrame({
  title,
  subtitle,
  children,
  wide = false,
}: {
  title: string
  subtitle: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <box
      style={{
        position: "absolute",
        top: 2,
        left: wide ? 26 : 34,
        width: wide ? 72 : 54,
        padding: 1,
        borderStyle: "double",
        borderColor: theme.borderActive,
        backgroundColor: theme.bgPanel,
        flexDirection: "column",
        zIndex: 50,
      }}
    >
      <text fg={theme.accent} attributes={1}>{title}</text>
      <text fg={theme.fgMuted}>{subtitle}</text>
      <text fg={theme.fgMuted}> </text>
      {children}
      <text fg={theme.fgMuted}> </text>
      <text fg={theme.fgMuted}>esc cancel</text>
    </box>
  )
}

function useTargetDetail(target: IssueTarget) {
  return useCachedQuery<IssueDetailData>(
    issueDetailKey(target.issueId),
    () => getIssueDetail(target.issueId),
  )
}

function StatusModal({ target }: { target: IssueTarget }) {
  useModalEscape()
  const { setModal, addToast } = useStore()
  const detail = useTargetDetail(target)
  const teamId = target.teamId ?? detail.data?.team?.id ?? null
  const { data: states, error } = useCachedQuery<WorkflowState[]>(
    teamId ? teamStatesKey(teamId) : "team-states:none",
    () => teamId ? getTeamStates(teamId) : Promise.resolve([]),
  )

  const choose = (state: WorkflowState | null) => {
    if (!state) return
    setModal(null)
    const rollback = patchIssueCaches(target.issueId, { state })
    addToast(`${target.identifier} -> ${state.name}`, "info")
    updateIssueState(target.issueId, state)
      .then(() => addToast(`${target.identifier} updated`, "success"))
      .catch((e) => {
        rollback()
        addToast(String(e instanceof Error ? e.message : e), "error")
      })
  }

  return (
    <ModalFrame title="Change Status" subtitle={`${target.identifier}  ${target.title}`}>
      {error ? (
        <text fg={theme.danger}>error: {error}</text>
      ) : !states ? (
        <text fg={theme.fgDim}>no cached team states yet</text>
      ) : (
        <select
          focused
          keyBindings={VIM_SELECT_KEY_BINDINGS}
          width={48}
          height={Math.min(10, Math.max(3, states.length))}
          showDescription={false}
          selectedBackgroundColor={theme.bgSelected}
          selectedTextColor={theme.fg}
          textColor={theme.fgDim}
          options={states.map((state) => ({
            name: state.name,
            description: state.type,
            value: state,
          }))}
          onSelect={(_, option) => choose((option?.value as WorkflowState | undefined) ?? null)}
        />
      )}
    </ModalFrame>
  )
}

function AssigneeModal({ target }: { target: IssueTarget }) {
  useModalEscape()
  const { setModal, addToast } = useStore()
  const detail = useTargetDetail(target)
  const teamId = target.teamId ?? detail.data?.team?.id ?? null
  const { data: members, error } = useCachedQuery<User[]>(
    teamId ? teamMembersKey(teamId) : "team-members:none",
    () => teamId ? getTeamMembers(teamId) : Promise.resolve([]),
  )

  const choose = (assignee: User | null) => {
    setModal(null)
    const rollback = patchIssueCaches(target.issueId, { assignee })
    addToast(
      `${target.identifier} -> ${assignee?.displayName ?? "unassigned"}`,
      "info",
    )
    updateIssueAssignee(target.issueId, assignee)
      .then(() => addToast(`${target.identifier} updated`, "success"))
      .catch((e) => {
        rollback()
        addToast(String(e instanceof Error ? e.message : e), "error")
      })
  }

  return (
    <ModalFrame title="Reassign" subtitle={`${target.identifier}  ${target.title}`}>
      {error ? (
        <text fg={theme.danger}>error: {error}</text>
      ) : !members ? (
        <text fg={theme.fgDim}>no cached team members yet</text>
      ) : (
        <select
          focused
          keyBindings={VIM_SELECT_KEY_BINDINGS}
          width={48}
          height={Math.min(12, Math.max(3, members.length + 1))}
          showDescription={false}
          selectedBackgroundColor={theme.bgSelected}
          selectedTextColor={theme.fg}
          textColor={theme.fgDim}
          options={[
            { name: "Unassigned", description: "", value: null },
            ...members.map((member) => ({
              name: member.displayName,
              description: member.email,
              value: member,
            })),
          ]}
          onSelect={(_, option) => choose((option?.value as User | null | undefined) ?? null)}
        />
      )}
    </ModalFrame>
  )
}

function CycleModal({ target }: { target: IssueTarget }) {
  useModalEscape()
  const { setModal, addToast } = useStore()
  const detail = useTargetDetail(target)
  const teamId = target.teamId ?? detail.data?.team?.id ?? null
  const { data: cycles, error } = useCachedQuery<Cycle[]>(
    teamId ? teamCyclesKey(teamId) : "team-cycles:none",
    () => teamId ? getTeamCycles(teamId) : Promise.resolve([]),
  )
  const currentCycleId = detail.data?.cycle?.id ?? null
  const selectedIndex = cycles
    ? Math.max(0, cycles.findIndex((cycle) => cycle.id === currentCycleId) + 1)
    : 0

  const choose = (cycle: Cycle | null) => {
    setModal(null)
    const rollback = patchIssueCaches(target.issueId, { cycle })
    addToast(`${target.identifier} -> ${cycleLabel(cycle)}`, "info")
    updateIssueCycle(target.issueId, cycle)
      .then(() => addToast(`${target.identifier} updated`, "success"))
      .catch((e) => {
        rollback()
        addToast(String(e instanceof Error ? e.message : e), "error")
      })
  }

  return (
    <ModalFrame title="Set Cycle" subtitle={`${target.identifier}  ${target.title}`}>
      {error ? (
        <text fg={theme.danger}>error: {error}</text>
      ) : !teamId ? (
        <text fg={theme.fgDim}>no team available for this issue</text>
      ) : !cycles ? (
        <text fg={theme.fgDim}>no cached cycles yet</text>
      ) : (
        <select
          focused
          keyBindings={VIM_SELECT_KEY_BINDINGS}
          width={48}
          height={Math.min(12, Math.max(3, cycles.length + 1))}
          showDescription={false}
          selectedIndex={selectedIndex}
          selectedBackgroundColor={theme.bgSelected}
          selectedTextColor={theme.fg}
          textColor={theme.fgDim}
          options={[
            { name: "No cycle", description: "", value: null },
            ...cycles.map((cycle) => ({
              name: cycleLabel(cycle),
              description: cycle.isActive ? "active" : cycle.isNext ? "next" : cycle.isPrevious ? "previous" : "",
              value: cycle,
            })),
          ]}
          onSelect={(_, option) => choose((option?.value as Cycle | null | undefined) ?? null)}
        />
      )}
    </ModalFrame>
  )
}

function PriorityModal({ target }: { target: IssueTarget }) {
  useModalEscape()
  const { setModal, addToast } = useStore()
  const detail = useTargetDetail(target)
  const currentPriority = detail.data?.issue.priority ?? 0
  const selectedIndex = Math.max(
    0,
    priorities.findIndex((priority) => priority.value === currentPriority),
  )

  const choose = (priority: number) => {
    if (!detail.data) return
    setModal(null)
    const nextIssue = {
      ...detail.data.issue,
      priority,
      priorityLabel: priorityLabel(priority),
    } as Issue
    const rollback = patchIssueCaches(target.issueId, { issue: nextIssue })
    addToast(`${target.identifier} -> ${priorityLabel(priority)}`, "info")
    updateIssuePriority(target.issueId, priority)
      .then(() => addToast(`${target.identifier} updated`, "success"))
      .catch((e) => {
        rollback()
        addToast(String(e instanceof Error ? e.message : e), "error")
      })
  }

  return (
    <ModalFrame title="Set Priority" subtitle={`${target.identifier}  ${target.title}`}>
      {detail.error ? (
        <text fg={theme.danger}>error: {detail.error}</text>
      ) : !detail.data ? (
        <text fg={theme.fgDim}>no cached issue data yet</text>
      ) : (
        <select
          focused
          keyBindings={VIM_SELECT_KEY_BINDINGS}
          width={48}
          height={priorities.length}
          showDescription={false}
          selectedIndex={selectedIndex}
          selectedBackgroundColor={theme.bgSelected}
          selectedTextColor={theme.fg}
          textColor={theme.fgDim}
          options={priorities.map((priority) => ({
            name: priority.name,
            description: "",
            value: priority.value,
          }))}
          onSelect={(_, option) => choose((option?.value as number | undefined) ?? currentPriority)}
        />
      )}
    </ModalFrame>
  )
}

function EditIssueModal({ target }: { target: IssueTarget }) {
  useModalEscape()
  const { setModal, addToast } = useStore()
  const detail = useTargetDetail(target)
  const [field, setField] = useState<"title" | "description">("title")
  const titleRef = useRef<InputRenderable | null>(null)
  const descriptionRef = useRef<TextareaRenderable | null>(null)

  const submit = () => {
    if (!detail.data) return
    const title = (titleRef.current?.value ?? detail.data.issue.title).trim()
    const description = descriptionRef.current?.plainText.trim() ?? detail.data.issue.description ?? ""
    if (!title) {
      addToast("title is required", "error")
      return
    }

    const nextIssue = {
      ...detail.data.issue,
      title,
      description: description || undefined,
    } as Issue
    const rollback = patchIssueCaches(target.issueId, { issue: nextIssue })
    setModal(null)
    addToast(`saving ${target.identifier}`, "info")
    updateIssueText(target.issueId, title, description)
      .then(() => addToast(`${target.identifier} updated`, "success"))
      .catch((e) => {
        rollback()
        addToast(String(e instanceof Error ? e.message : e), "error")
      })
  }

  return (
    <ModalFrame
      title="Edit Issue"
      subtitle={field === "title" ? "title · enter next" : "description · ctrl+enter save"}
      wide
    >
      {detail.error ? (
        <text fg={theme.danger}>error: {detail.error}</text>
      ) : !detail.data ? (
        <text fg={theme.fgDim}>no cached issue data yet</text>
      ) : (
        <>
          <box
            style={{
              flexDirection: "row",
              width: "100%",
              borderStyle: "single",
              borderColor: field === "title" ? theme.borderActive : theme.border,
              paddingLeft: 1,
              paddingRight: 1,
            }}
          >
            <text fg={theme.fgMuted}>title </text>
            <input
              ref={titleRef}
              focused={field === "title"}
              value={detail.data.issue.title}
              onSubmit={() => setField("description")}
              placeholder="Issue title"
              style={{ flexGrow: 1 }}
            />
          </box>
          <text fg={theme.fgMuted}> </text>
          <textarea
            ref={descriptionRef}
            focused={field === "description"}
            width={66}
            height={10}
            initialValue={detail.data.issue.description ?? ""}
            placeholder="Issue description..."
            textColor={theme.fg}
            focusedTextColor={theme.fg}
            backgroundColor={theme.bg}
            focusedBackgroundColor={theme.bg}
            cursorColor={theme.accent}
            keyBindings={[{ name: "return", ctrl: true, action: "submit" }]}
            onSubmit={submit}
          />
        </>
      )}
    </ModalFrame>
  )
}

function CommentModal({ target }: { target: IssueTarget }) {
  useModalEscape()
  const { setModal, addToast } = useStore()
  const ref = useRef<TextareaRenderable | null>(null)

  const submit = () => {
    const body = ref.current?.plainText.trim() ?? ""
    if (!body) return
    setModal(null)
    const rollback = appendCommentCache(target.issueId, {
      comment: { body, createdAt: new Date() },
      user: undefined,
    })
    addToast(`posting comment on ${target.identifier}`, "info")
    createIssueComment(target.issueId, body)
      .then(() => addToast(`comment posted on ${target.identifier}`, "success"))
      .catch((e) => {
        rollback()
        addToast(String(e instanceof Error ? e.message : e), "error")
      })
  }

  return (
    <ModalFrame
      title="Comment"
      subtitle={`${target.identifier}  ctrl+enter submit`}
      wide
    >
      <textarea
        ref={ref}
        focused
        width={66}
        height={10}
        placeholder="Write a comment..."
        textColor={theme.fg}
        focusedTextColor={theme.fg}
        backgroundColor={theme.bg}
        focusedBackgroundColor={theme.bg}
        cursorColor={theme.accent}
        keyBindings={[{ name: "return", ctrl: true, action: "submit" }]}
        onSubmit={submit}
      />
    </ModalFrame>
  )
}

function optimisticIssue(
  id: string,
  team: Team,
  title: string,
  description: string,
  priority: number,
  parentId?: string,
  cycleId?: string,
): Issue {
  return {
    id,
    identifier: `${team.key}-new`,
    title,
    description,
    priority,
    priorityLabel: priorityLabel(priority),
    url: "",
    teamId: team.id,
    parentId,
    cycleId,
  } as Issue
}

function NewIssueModal({ parent }: { parent?: IssueTarget }) {
  useModalEscape()
  const { setModal, setSelectedIssueId, addToast } = useStore()
  const { data: teams, error } = useCachedQuery<Team[]>(
    VIEWER_TEAMS_KEY,
    getViewerTeams,
  )
  const [step, setStep] = useState<"team" | "title" | "description" | "priority">(parent ? "title" : "team")
  const [team, setTeam] = useState<Team | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState(0)
  const descriptionRef = useRef<TextareaRenderable | null>(null)
  const cycle = parent?.cycle ?? null

  useEffect(() => {
    if (!parent || team || !teams) return
    const parentTeam = teams.find((t) => t.id === parent.teamId)
    if (parentTeam) setTeam(parentTeam)
    else setStep("team")
  }, [parent, team, teams])

  const submit = (selectedPriority: number) => {
    if (!team || !title.trim()) return
    const id = crypto.randomUUID()
    const issue = optimisticIssue(
      id,
      team,
      title.trim(),
      description,
      selectedPriority,
      parent?.issueId,
      cycle?.id,
    )
    rememberIssueDetail({
      issue,
      state: undefined,
      assignee: undefined,
      team,
      cycle: cycle ?? undefined,
      comments: [],
      children: [],
      relations: [],
      attachments: [],
      history: [],
    })
    setSelectedIssueId(id)
    setModal(null)
    addToast("creating issue", "info")
    createIssue({
      id,
      teamId: team.id,
      title: title.trim(),
      description: description || undefined,
      priority: selectedPriority,
      parentId: parent?.issueId,
      cycleId: cycle?.id,
    })
      .then((row) => {
        if (row.issue.id !== id) invalidate(issueDetailKey(id))
        setSelectedIssueId(row.issue.id)
        addToast(`created ${row.issue.identifier}`, "success")
      })
      .catch((e) => {
        invalidate(issueDetailKey(id))
        setSelectedIssueId(null)
        addToast(String(e instanceof Error ? e.message : e), "error")
      })
  }

  return (
    <box
      style={{
        position: "absolute",
        top: 1,
        left: 24,
        right: 2,
        bottom: 1,
        padding: 1,
        borderStyle: "double",
        borderColor: theme.borderActive,
        backgroundColor: theme.bgPanel,
        flexDirection: "column",
        zIndex: 50,
      }}
    >
      <text fg={theme.accent} attributes={1}>{parent ? "New Sub-issue" : "New Issue"}</text>
      <text fg={theme.fgMuted}>
        {parent
          ? `${parent.identifier}${cycle ? ` -> ${cycleLabel(cycle)}` : ""}  ${step === "title" ? "enter title" : step === "description" ? "description · ctrl+enter next" : step === "priority" ? "choose priority" : "choose team"}`
          : step === "team"
          ? "choose team"
          : step === "title"
          ? "enter title"
          : step === "description"
          ? "description · ctrl+enter next"
          : "choose priority"}
      </text>
      <text fg={theme.fgMuted}> </text>
      {error ? (
        <text fg={theme.danger}>error: {error}</text>
      ) : !teams ? (
        <text fg={theme.fgDim}>no cached teams yet</text>
      ) : step === "team" ? (
        <select
          focused
          keyBindings={VIM_SELECT_KEY_BINDINGS}
          width={56}
          height={Math.min(12, Math.max(3, teams.length))}
          showDescription={false}
          selectedBackgroundColor={theme.bgSelected}
          selectedTextColor={theme.fg}
          textColor={theme.fgDim}
          options={teams.map((t) => ({
            name: `${t.key}  ${t.name}`,
            description: t.description ?? "",
            value: t,
          }))}
          onSelect={(_, option) => {
            setTeam((option?.value as Team | undefined) ?? null)
            setStep("title")
          }}
        />
      ) : step === "title" ? (
        <box
          style={{
            flexDirection: "row",
            width: "100%",
            borderStyle: "single",
            borderColor: theme.borderActive,
            paddingLeft: 1,
            paddingRight: 1,
          }}
        >
          <text fg={theme.fgMuted}>title </text>
          <input
            focused
            onSubmit={(value) => {
              const nextTitle = submittedInputValue(value).trim()
              if (!nextTitle) return
              setTitle(nextTitle)
              setStep("description")
            }}
            placeholder="Issue title"
            style={{ flexGrow: 1 }}
          />
        </box>
      ) : step === "description" ? (
        <textarea
          ref={descriptionRef}
          focused
          width="100%"
          height={12}
          placeholder="Issue description..."
          textColor={theme.fg}
          focusedTextColor={theme.fg}
          backgroundColor={theme.bg}
          focusedBackgroundColor={theme.bg}
          cursorColor={theme.accent}
          keyBindings={[{ name: "return", ctrl: true, action: "submit" }]}
          onSubmit={() => {
            setDescription(descriptionRef.current?.plainText.trim() ?? "")
            setStep("priority")
          }}
        />
      ) : (
        <select
          focused
          keyBindings={VIM_SELECT_KEY_BINDINGS}
          width={56}
          height={5}
          showDescription={false}
          selectedIndex={priorities.findIndex((p) => p.value === priority)}
          selectedBackgroundColor={theme.bgSelected}
          selectedTextColor={theme.fg}
          textColor={theme.fgDim}
          options={priorities.map((p) => ({
            name: p.name,
            description: "",
            value: p.value,
          }))}
          onChange={(_, option) => setPriority((option?.value as number | undefined) ?? 0)}
          onSelect={(_, option) => submit((option?.value as number | undefined) ?? priority)}
        />
      )}
      <text fg={theme.fgMuted}> </text>
      <text fg={theme.fgMuted}>esc cancel</text>
    </box>
  )
}

function FilterModal() {
  useModalEscape()
  const { setModal, viewingPreferences, setViewingPreferences, addToast } = useStore()

  const submit = (value: unknown) => {
    const filter = submittedInputValue(value).trim()
    setViewingPreferences((current) => ({ ...current, filter }))
    setModal(null)
    addToast(filter ? `saved filter: ${filter}` : "filter cleared", "success")
  }

  return (
    <ModalFrame
      title="Filter Issues"
      subtitle="matches id, title, status, assignee, priority, or team"
      wide
    >
      <box
        style={{
          flexDirection: "row",
          width: "100%",
          borderStyle: "single",
          borderColor: theme.borderActive,
          paddingLeft: 1,
          paddingRight: 1,
        }}
      >
        <text fg={theme.fgMuted}>filter </text>
        <input
          focused
          value={viewingPreferences.filter}
          onSubmit={submit}
          placeholder="submit empty to clear"
          style={{ flexGrow: 1 }}
        />
      </box>
    </ModalFrame>
  )
}

function StatusFilterModal({ statuses }: { statuses: StatusFilterOption[] }) {
  useModalEscape()
  const { setModal, viewingPreferences, setViewingPreferences, addToast } = useStore()
  const options = [
    { label: "All statuses", value: "", description: "" },
    ...statuses,
  ]
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === viewingPreferences.statusFilter),
  )

  const choose = (statusFilter: string) => {
    setViewingPreferences((current) => ({ ...current, statusFilter }))
    setModal(null)
    addToast(
      statusFilter ? `saved status filter: ${statusFilterLabel(statusFilter)}` : "status filter cleared",
      "success",
    )
  }

  return (
    <ModalFrame title="Filter Status" subtitle="saved for every issue list">
      <select
        focused
        keyBindings={VIM_SELECT_KEY_BINDINGS}
        width={48}
        height={Math.min(12, Math.max(3, options.length))}
        showDescription={false}
        selectedIndex={selectedIndex}
        selectedBackgroundColor={theme.bgSelected}
        selectedTextColor={theme.fg}
        textColor={theme.fgDim}
        options={options.map((option) => ({
          name: option.label,
          description: option.description,
          value: option.value,
        }))}
        onSelect={(_, option) => choose((option?.value as string | undefined) ?? "")}
      />
    </ModalFrame>
  )
}

function GroupModal() {
  useModalEscape()
  const { setModal, viewingPreferences, setViewingPreferences, addToast } = useStore()
  const selectedIndex = Math.max(
    0,
    GROUP_OPTIONS.findIndex((option) => option.key === viewingPreferences.groupBy),
  )

  const choose = (groupBy: IssueGroupBy) => {
    setViewingPreferences((current) => ({ ...current, groupBy }))
    setModal(null)
    addToast(`saved grouping: ${groupByLabel(groupBy)}`, "success")
  }

  return (
    <ModalFrame title="Group Issues" subtitle="saved for every issue list">
      <select
        focused
        keyBindings={VIM_SELECT_KEY_BINDINGS}
        width={48}
        height={GROUP_OPTIONS.length}
        showDescription={false}
        selectedIndex={selectedIndex}
        selectedBackgroundColor={theme.bgSelected}
        selectedTextColor={theme.fg}
        textColor={theme.fgDim}
        options={GROUP_OPTIONS.map((option) => ({
          name: option.label,
          description: "",
          value: option.key,
        }))}
        onSelect={(_, option) => choose((option?.value as IssueGroupBy | undefined) ?? "none")}
      />
    </ModalFrame>
  )
}

function OrderModal() {
  useModalEscape()
  const { setModal, viewingPreferences, setViewingPreferences, addToast } = useStore()
  const selectedIndex = Math.max(
    0,
    ORDER_OPTIONS.findIndex((option) => option.key === viewingPreferences.orderBy),
  )

  const choose = (orderBy: IssueOrderBy) => {
    setViewingPreferences((current) => ({ ...current, orderBy }))
    setModal(null)
    addToast(`saved ordering: ${orderByLabel(orderBy)}`, "success")
  }

  return (
    <ModalFrame title="Order Issues" subtitle="applies inside each group">
      <select
        focused
        keyBindings={VIM_SELECT_KEY_BINDINGS}
        width={48}
        height={ORDER_OPTIONS.length}
        showDescription={false}
        selectedIndex={selectedIndex}
        selectedBackgroundColor={theme.bgSelected}
        selectedTextColor={theme.fg}
        textColor={theme.fgDim}
        options={ORDER_OPTIONS.map((option) => ({
          name: option.label,
          description: "",
          value: option.key,
        }))}
        onSelect={(_, option) => choose((option?.value as IssueOrderBy | undefined) ?? "none")}
      />
    </ModalFrame>
  )
}

type CommandAction = {
  name: string
  description: string
  run: () => void
}

const commandViews: { view: View; name: string; description: string }[] = [
  { view: "my-issues", name: "Go to My Issues", description: "assigned issues" },
  { view: "work", name: "Go to Current Work", description: "git, PR, and linked issue" },
  { view: "issues", name: "Go to Issues", description: "workspace issues" },
  { view: "triage", name: "Go to Triage", description: "triage queue" },
  { view: "inbox", name: "Go to Inbox", description: "notifications" },
  { view: "projects", name: "Go to Projects", description: "project list" },
  { view: "cycles", name: "Go to Cycles", description: "cycle planning" },
  { view: "git", name: "Go to Git", description: "branches and PRs" },
  { view: "search", name: "Go to Search", description: "search issues" },
]

function CommandPaletteModal() {
  useModalEscape()
  const {
    setModal,
    setView,
    setSelectedIssueId,
    setSelectedProjectId,
    setHelpVisible,
    requestReload,
    addToast,
  } = useStore()

  const chooseView = (view: View) => {
    setSelectedIssueId(null)
    setSelectedProjectId(null)
    setView(view)
    setModal(null)
  }

  const [query, setQuery] = useState("")
  const [index, setIndex] = useState(0)
  const actions: CommandAction[] = [
    ...commandViews.map((item) => ({
      name: item.name,
      description: item.description,
      run: () => chooseView(item.view),
    })),
    {
      name: "New Issue",
      description: "create a top-level Linear issue",
      run: () => setModal({ type: "new-issue" }),
    },
    {
      name: "Reload Page",
      description: "refresh cached Linear, git, and GitHub data",
      run: () => {
        invalidate()
        requestReload()
        setModal(null)
        addToast("reloading page")
      },
    },
    {
      name: "Settings",
      description: "edit keybindings",
      run: () => setModal({ type: "settings" }),
    },
    {
      name: "Help",
      description: "show keyboard help",
      run: () => {
        setModal(null)
        setHelpVisible(true)
      },
    },
  ]
  const needle = query.trim().toLowerCase()
  const filteredActions = needle
    ? actions.filter((action) =>
        `${action.name} ${action.description}`.toLowerCase().includes(needle),
      )
    : actions

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(0, filteredActions.length - 1)))
  }, [filteredActions.length])

  const selectedAction = filteredActions[index]

  useKeyboard((key) => {
    if (key.name === "escape") return
    if (filteredActions.length === 0) {
      if (key.name === "backspace") setQuery((current) => current.slice(0, -1))
      else if (key.name === "u" && key.ctrl) setQuery("")
      else {
        const input = key.sequence ?? key.raw ?? ""
        if (!key.ctrl && !key.meta && input.length === 1 && input >= " " && input <= "~") {
          setQuery((current) => current + input)
        }
      }
      return
    }
    if (key.name === "down" || isVimNextKey(key)) {
      setIndex((current) => Math.min(filteredActions.length - 1, current + 1))
      return
    }
    if (key.name === "up" || isVimPreviousKey(key)) {
      setIndex((current) => Math.max(0, current - 1))
      return
    }
    if (key.name === "backspace") {
      setQuery((current) => current.slice(0, -1))
      return
    }
    if (key.name === "u" && key.ctrl) {
      setQuery("")
      return
    }
    if (key.name === "return" || isVimAcceptKey(key)) {
      selectedAction?.run()
      return
    }
    const input = key.sequence ?? key.raw ?? ""
    if (!key.ctrl && !key.meta && input.length === 1 && input >= " " && input <= "~") {
      setQuery((current) => current + input)
    }
  })
  const visibleStart = Math.max(0, Math.min(index - 11, Math.max(0, filteredActions.length - 12)))
  const visibleActions = filteredActions.slice(visibleStart, visibleStart + 12)

  return (
    <ModalFrame title="Command Palette" subtitle="type to search · ctrl+n/p choose · ctrl+y run · ctrl+u clear" wide>
      <box
        style={{
          flexDirection: "row",
          width: "100%",
          borderStyle: "single",
          borderColor: theme.borderActive,
          paddingLeft: 1,
          paddingRight: 1,
        }}
      >
        <text fg={theme.accent}>: </text>
        <text fg={query ? theme.fg : theme.fgDim}>{query || "search commands"}</text>
      </box>
      <text fg={theme.fgMuted}> </text>
      {filteredActions.length === 0 ? (
        <text fg={theme.fgDim}>no commands match</text>
      ) : (
        visibleActions.map((action, visibleIndex) => {
          const actionIndex = visibleStart + visibleIndex
          const selected = actionIndex === index
          return (
            <box
              key={action.name}
              style={{
                flexDirection: "row",
                backgroundColor: selected ? theme.bgSelected : theme.bgPanel,
                paddingLeft: 1,
                paddingRight: 1,
              }}
            >
              <text fg={selected ? theme.accent : theme.fgMuted}>{selected ? "▌" : " "}</text>
              <text fg={selected ? theme.fg : theme.fgDim}>{action.name.padEnd(24)}</text>
              <text fg={theme.fgMuted}>{action.description}</text>
            </box>
          )
        })
      )}
    </ModalFrame>
  )
}

function SettingsModal() {
  useModalEscape()
  const { keybindings, setKeybinding, setModal, addToast } = useStore()
  const [command, setCommand] = useState<KeyCommand>("issueCopyBranch")
  const [step, setStep] = useState<"command" | "binding">("command")

  const chooseCommand = (nextCommand: KeyCommand) => {
    setCommand(nextCommand)
    setStep("binding")
  }

  const submit = (binding: unknown) => {
    const nextBinding = submittedInputValue(binding).trim()
    if (!nextBinding) return
    setKeybinding(command, nextBinding)
    setModal(null)
    addToast(`${commandLabel(command)} -> ${nextBinding}`, "success")
  }

  return (
    <ModalFrame
      title="Settings"
      subtitle={step === "command" ? "choose keybinding" : `${commandLabel(command)} binding`}
      wide
    >
      {step === "command" ? (
        <select
          focused
          keyBindings={VIM_SELECT_KEY_BINDINGS}
          width={66}
          height={Math.min(13, KEY_COMMANDS.length)}
          showDescription={false}
          selectedBackgroundColor={theme.bgSelected}
          selectedTextColor={theme.fg}
          textColor={theme.fgDim}
          options={KEY_COMMANDS.map((item) => ({
            name: `${commandLabel(item.key).padEnd(22)} ${keybindings[item.key]}`,
            description: "",
            value: item.key,
          }))}
          onSelect={(_, option) => chooseCommand((option?.value as KeyCommand | undefined) ?? "issueCopyBranch")}
        />
      ) : (
        <box
          style={{
            flexDirection: "row",
            width: "100%",
            borderStyle: "single",
            borderColor: theme.borderActive,
            paddingLeft: 1,
            paddingRight: 1,
          }}
        >
          <text fg={theme.fgMuted}>key </text>
          <input
            key={command}
            focused
            value={keybindings[command]}
            onSubmit={submit}
            placeholder="examples: y, B, ctrl+g"
            style={{ flexGrow: 1 }}
          />
        </box>
      )}
    </ModalFrame>
  )
}

export function MutationLayer() {
  const { modal } = useStore()
  if (!modal) return null
  if (modal.type === "status") return <StatusModal target={modal.target} />
  if (modal.type === "assignee") return <AssigneeModal target={modal.target} />
  if (modal.type === "edit-issue") return <EditIssueModal target={modal.target} />
  if (modal.type === "cycle") return <CycleModal target={modal.target} />
  if (modal.type === "priority") return <PriorityModal target={modal.target} />
  if (modal.type === "comment") return <CommentModal target={modal.target} />
  if (modal.type === "filter") return <FilterModal />
  if (modal.type === "status-filter") return <StatusFilterModal statuses={modal.statuses} />
  if (modal.type === "group") return <GroupModal />
  if (modal.type === "order") return <OrderModal />
  if (modal.type === "command-palette") return <CommandPaletteModal />
  if (modal.type === "settings") return <SettingsModal />
  return <NewIssueModal parent={modal.parent} />
}

export function ToastView({ toast }: { toast: Toast }) {
  const color =
    toast.tone === "success"
      ? theme.success
      : toast.tone === "error"
      ? theme.danger
      : theme.accent
  return (
    <box
      style={{
        position: "absolute",
        right: 2,
        bottom: 1,
        width: 46,
        paddingLeft: 1,
        paddingRight: 1,
        borderStyle: "single",
        borderColor: color,
        backgroundColor: theme.bgPanel,
        zIndex: 60,
      }}
    >
      <text fg={color}>{toast.message}</text>
    </box>
  )
}
