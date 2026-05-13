export type KanbanTaskStatus = 'triage' | 'todo' | 'ready' | 'running' | 'blocked' | 'done' | 'archived'

export interface KanbanAge {
  created_age_seconds?: number | null
  started_age_seconds?: number | null
  time_to_complete_seconds?: number | null
}

export interface KanbanWarningSummary {
  count: number
  highest_severity?: string | null
  latest_at?: number | null
  kinds?: Record<string, number>
}

export interface KanbanTask {
  id: string
  title: string
  body?: string | null
  assignee?: string | null
  status: KanbanTaskStatus
  priority: number
  created_by?: string | null
  created_at: number
  started_at?: number | null
  completed_at?: number | null
  workspace_kind?: string | null
  workspace_path?: string | null
  tenant?: string | null
  result?: string | null
  skills?: string[] | null
  latest_summary?: string | null
  age?: KanbanAge
  warnings?: KanbanWarningSummary | null
  diagnostics?: KanbanDiagnostic[]
}

export interface KanbanColumn {
  name: KanbanTaskStatus
  tasks: KanbanTask[]
}

export interface KanbanBoardResponse {
  columns: KanbanColumn[]
  tenants: string[]
  assignees: string[]
  latest_event_id: number
  now: number
}

export interface KanbanBoard {
  slug: string
  name?: string
  description?: string
  icon?: string
  color?: string
  archived?: boolean
  is_current?: boolean
  counts?: Record<string, number>
  total?: number
}

export interface KanbanBoardsResponse {
  boards: KanbanBoard[]
  current: string
}

export interface KanbanStats {
  by_status?: Record<string, number>
  by_assignee?: Record<string, number>
  oldest_ready_age_seconds?: number | null
  total?: number
  [key: string]: unknown
}

export interface KanbanAssignee {
  name: string
  on_disk?: boolean
  counts?: Record<string, number> | null
}

export interface KanbanComment {
  id: number
  task_id: string
  author: string
  body: string
  created_at: number
}

export interface KanbanEvent {
  id: number
  task_id: string
  kind: string
  payload?: Record<string, unknown> | null
  created_at: number
  run_id?: number | null
}

export interface KanbanRun {
  id: number
  task_id: string
  profile?: string | null
  status?: string | null
  outcome?: string | null
  summary?: string | null
  error?: string | null
  metadata?: Record<string, unknown> | null
  worker_pid?: number | null
  started_at?: number | null
  ended_at?: number | null
}

export interface KanbanTaskLog {
  task_id: string
  path: string
  exists: boolean
  size_bytes: number
  content: string
  truncated: boolean
}

export interface KanbanTaskDetail {
  task: KanbanTask
  comments: KanbanComment[]
  events: KanbanEvent[]
  links?: { parents: string[]; children: string[] }
  runs: KanbanRun[]
}

export interface KanbanDiagnostic {
  kind?: string
  severity?: 'warning' | 'error' | 'critical' | string
  message?: string
  count?: number
  latest_at?: number | null
  [key: string]: unknown
}

export interface KanbanDiagnosticRow {
  task_id: string
  task_title?: string | null
  task_status?: KanbanTaskStatus | string | null
  task_assignee?: string | null
  diagnostics: KanbanDiagnostic[]
}

export interface KanbanDiagnosticsResponse {
  diagnostics: KanbanDiagnosticRow[]
  count: number
}

export interface KanbanConfig {
  default_tenant?: string
  lane_by_profile?: boolean
  include_archived_by_default?: boolean
  render_markdown?: boolean
  [key: string]: unknown
}

export interface BulkTaskInput {
  ids: string[]
  status?: KanbanTaskStatus
  assignee?: string
  priority?: number
  archive?: boolean
  result?: string
  summary?: string
  metadata?: Record<string, unknown>
  reclaim_first?: boolean
}

export interface BulkTaskResult {
  id: string
  ok: boolean
  error?: string
}

export interface CreateTaskInput {
  title: string
  body?: string
  assignee?: string
  tenant?: string
  priority?: number
  triage?: boolean
}

export interface CreateBoardInput {
  slug: string
  name?: string
  description?: string
  icon?: string
  color?: string
  switch?: boolean
}

export interface UpdateBoardInput {
  name?: string
  description?: string
  icon?: string
  color?: string
}

export interface BoardQuery {
  board?: string
}

export interface DashboardSessionInfo {
  id: string
  source: string | null
  model: string | null
  title: string | null
  started_at: number
  ended_at: number | null
  last_active: number
  is_active: boolean
  message_count: number
  tool_call_count: number
  input_tokens: number
  output_tokens: number
  preview: string | null
  parent_session_id?: string | null
}

export interface DashboardPaginatedSessions {
  sessions: DashboardSessionInfo[]
  total: number
  limit: number
  offset: number
}

export interface DashboardSessionMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | null
  reasoning?: string | null
  reasoning_content?: string | null
  tool_calls?: Array<{
    id: string
    function: { name: string; arguments: string }
  }>
  tool_name?: string
  tool_call_id?: string
  timestamp?: number
}

export interface DashboardSessionMessagesResponse {
  session_id: string
  messages: DashboardSessionMessage[]
}

export interface DashboardPlatformStatus {
  error_code?: string | null
  error_message?: string | null
  state: string
  updated_at: string
}

export interface DashboardStatusResponse {
  active_sessions: number
  config_path: string
  config_version: number
  env_path: string
  gateway_exit_reason: string | null
  gateway_health_url: string | null
  gateway_pid: number | null
  gateway_platforms: Record<string, DashboardPlatformStatus>
  gateway_running: boolean
  gateway_state: string | null
  gateway_updated_at: string | null
  hermes_home: string
  latest_config_version: number
  release_date: string
  version: string
}

export interface DashboardModelInfo {
  model: string
  provider: string
  auto_context_length: number
  config_context_length: number
  effective_context_length: number
  capabilities: Record<string, unknown>
}

export interface DashboardModelOptionProvider {
  name: string
  slug: string
  models?: string[]
  total_models?: number
  is_current?: boolean
  is_user_defined?: boolean
  source?: string
  warning?: string
}

export interface DashboardModelOptions {
  model?: string
  provider?: string
  providers?: DashboardModelOptionProvider[]
}

export interface DashboardModelAssignmentRequest {
  scope: 'main' | 'auxiliary'
  provider: string
  model: string
  task?: string
}

export interface DashboardModelAssignmentResponse {
  ok: boolean
  scope?: string
  provider?: string
  model?: string
  tasks?: string[]
  reset?: boolean
}

export interface DashboardProfileInfo {
  name: string
  path: string
  is_default: boolean
  model?: string | null
  provider?: string | null
  has_env: boolean
  skill_count: number
}

export interface DashboardProfilesResponse {
  profiles: DashboardProfileInfo[]
}

export interface DashboardProfileCreateRequest {
  name: string
  clone_from_default?: boolean
  no_skills?: boolean
}

export interface DashboardProfileCreateResponse {
  ok: boolean
  name: string
  path: string
}

export interface DashboardProfileSoulResponse {
  content: string
  exists: boolean
}

const BASE = '/api/plugins/kanban'

function readBasePath(): string {
  const raw = window.__HERMES_BASE_PATH__ ?? ''
  if (!raw) return ''
  const withLead = raw.startsWith('/') ? raw : `/${raw}`
  return withLead.replace(/\/+$/, '')
}

function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value))
  }
  const out = qs.toString()
  return out ? `?${out}` : ''
}

function withDashboardAuth(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers)
  const token = window.__HERMES_SESSION_TOKEN__
  if (token && !headers.has('X-Hermes-Session-Token')) headers.set('X-Hermes-Session-Token', token)
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return { ...init, headers }
}

async function refreshDashboardSessionToken(): Promise<boolean> {
  try {
    const res = await fetch('/__hermes/session', { headers: { accept: 'application/json' } })
    if (!res.ok) return false
    const meta = await res.json() as { basePath?: string; embeddedChat?: boolean; token?: string }
    if (!meta.token) return false
    window.__HERMES_SESSION_TOKEN__ = meta.token
    window.__HERMES_BASE_PATH__ = meta.basePath ?? ''
    if (typeof meta.embeddedChat === 'boolean') window.__HERMES_DASHBOARD_EMBEDDED_CHAT__ = meta.embeddedChat
    return true
  } catch {
    return false
  }
}

async function fetchWithDashboardAuth(url: string, init?: RequestInit): Promise<Response> {
  let res = await fetch(url, withDashboardAuth(init))
  if (res.status !== 401) return res
  const refreshed = await refreshDashboardSessionToken()
  if (!refreshed) return res
  res = await fetch(url, withDashboardAuth(init))
  return res
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchWithDashboardAuth(`${readBasePath()}${BASE}${path}`, init)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

async function fetchDashboardJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchWithDashboardAuth(`${readBasePath()}${path}`, init)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

function normalizeAssignees(value: unknown): KanbanAssignee[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    if (typeof item === 'string') return { name: item }
    const row = item as Partial<KanbanAssignee>
    return { name: row.name ?? '', on_disk: row.on_disk, counts: row.counts }
  }).filter((item) => item.name)
}

export const kanbanApi = {
  getBoard: (opts: BoardQuery & { tenant?: string; includeArchived?: boolean }) =>
    fetchJson<KanbanBoardResponse>(`/board${query({ board: opts.board, tenant: opts.tenant, include_archived: opts.includeArchived })}`),

  getBoards: (includeArchived = false) =>
    fetchJson<KanbanBoardsResponse>(`/boards${query({ include_archived: includeArchived })}`),

  createBoard: (body: CreateBoardInput) =>
    fetchJson<{ board: KanbanBoard; current: string }>('/boards', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateBoard: (slug: string, body: UpdateBoardInput) =>
    fetchJson<{ board: KanbanBoard }>(`/boards/${encodeURIComponent(slug)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteBoard: (slug: string, hardDelete = false) =>
    fetchJson<{ ok: boolean; current?: string }>(`/boards/${encodeURIComponent(slug)}${query({ delete: hardDelete })}`, {
      method: 'DELETE',
    }),

  switchBoard: (slug: string) =>
    fetchJson<{ current: string }>(`/boards/${encodeURIComponent(slug)}/switch`, { method: 'POST' }),

  getConfig: () =>
    fetchJson<KanbanConfig>('/config'),

  getStats: (opts: BoardQuery) =>
    fetchJson<KanbanStats>(`/stats${query({ board: opts.board })}`),

  getDiagnostics: (opts: BoardQuery & { severity?: string }) =>
    fetchJson<KanbanDiagnosticsResponse>(`/diagnostics${query({ board: opts.board, severity: opts.severity })}`),

  getAssignees: async (opts: BoardQuery) => {
    const res = await fetchJson<{ assignees: unknown[] }>(`/assignees${query({ board: opts.board })}`)
    return normalizeAssignees(res.assignees)
  },

  getTask: (taskId: string, opts: BoardQuery) =>
    fetchJson<KanbanTaskDetail>(`/tasks/${encodeURIComponent(taskId)}${query({ board: opts.board })}`),

  createTask: (body: CreateTaskInput, opts: BoardQuery) =>
    fetchJson<{ task: KanbanTask | null; warning?: string }>(`/tasks${query({ board: opts.board })}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateTask: (taskId: string, body: Partial<KanbanTask> & { block_reason?: string; summary?: string }, opts: BoardQuery) =>
    fetchJson<{ task: KanbanTask | null }>(`/tasks/${encodeURIComponent(taskId)}${query({ board: opts.board })}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  reclaimTask: (taskId: string, body: { reason?: string }, opts: BoardQuery) =>
    fetchJson<{ ok: boolean; task_id: string }>(`/tasks/${encodeURIComponent(taskId)}/reclaim${query({ board: opts.board })}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  specifyTask: (taskId: string, body: { author?: string }, opts: BoardQuery) =>
    fetchJson<{ ok: boolean; task_id: string; reason?: string; new_title?: string }>(`/tasks/${encodeURIComponent(taskId)}/specify${query({ board: opts.board })}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  reassignTask: (taskId: string, body: { profile?: string; reclaim_first?: boolean; reason?: string }, opts: BoardQuery) =>
    fetchJson<{ ok: boolean; task_id: string; assignee?: string }>(`/tasks/${encodeURIComponent(taskId)}/reassign${query({ board: opts.board })}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  addComment: (taskId: string, body: string, opts: BoardQuery) =>
    fetchJson<{ ok: boolean }>(`/tasks/${encodeURIComponent(taskId)}/comments${query({ board: opts.board })}`, {
      method: 'POST',
      body: JSON.stringify({ body, author: 'dashboard' }),
    }),

  getTaskLog: (taskId: string, opts: BoardQuery & { tail?: number }) =>
    fetchJson<KanbanTaskLog>(`/tasks/${encodeURIComponent(taskId)}/log${query({ board: opts.board, tail: opts.tail ?? 120000 })}`),

  addLink: (parentId: string, childId: string, opts: BoardQuery) =>
    fetchJson<{ ok: boolean }>(`/links${query({ board: opts.board })}`, {
      method: 'POST',
      body: JSON.stringify({ parent_id: parentId, child_id: childId }),
    }),

  deleteLink: (parentId: string, childId: string, opts: BoardQuery) =>
    fetchJson<{ ok: boolean }>(`/links${query({ board: opts.board, parent_id: parentId, child_id: childId })}`, {
      method: 'DELETE',
    }),

  bulkUpdate: (body: BulkTaskInput, opts: BoardQuery) =>
    fetchJson<{ results: BulkTaskResult[] }>(`/tasks/bulk${query({ board: opts.board })}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  dispatch: (opts: BoardQuery & { dryRun?: boolean; max?: number }) =>
    fetchJson<unknown>(`/dispatch${query({ board: opts.board, dry_run: opts.dryRun, max: opts.max ?? 8 })}`, { method: 'POST' }),
}

export const dashboardApi = {
  getStatus: () =>
    fetchDashboardJson<DashboardStatusResponse>('/api/status'),

  getSessions: (limit = 20, offset = 0) =>
    fetchDashboardJson<DashboardPaginatedSessions>(`/api/sessions${query({ limit, offset })}`),

  getSessionMessages: (id: string) =>
    fetchDashboardJson<DashboardSessionMessagesResponse>(`/api/sessions/${encodeURIComponent(id)}/messages`),

  getModelInfo: () =>
    fetchDashboardJson<DashboardModelInfo>('/api/model/info'),

  getModelOptions: () =>
    fetchDashboardJson<DashboardModelOptions>('/api/model/options'),

  setModelAssignment: (body: DashboardModelAssignmentRequest) =>
    fetchDashboardJson<DashboardModelAssignmentResponse>('/api/model/set', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getProfiles: () =>
    fetchDashboardJson<DashboardProfilesResponse>('/api/profiles'),

  createProfile: (body: DashboardProfileCreateRequest) =>
    fetchDashboardJson<DashboardProfileCreateResponse>('/api/profiles', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getProfileSoul: (name: string) =>
    fetchDashboardJson<DashboardProfileSoulResponse>(`/api/profiles/${encodeURIComponent(name)}/soul`),

  updateProfileSoul: (name: string, content: string) =>
    fetchDashboardJson<{ ok: boolean }>(`/api/profiles/${encodeURIComponent(name)}/soul`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  deleteProfile: (name: string) =>
    fetchDashboardJson<{ ok: boolean; path: string }>(`/api/profiles/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),
}

export function createEventsSocket(
  board: string | undefined,
  since: number,
  onEvents: (events: KanbanEvent[], cursor: number) => void,
  onStatus: (status: 'open' | 'closed' | 'error') => void,
): WebSocket | null {
  const token = window.__HERMES_SESSION_TOKEN__
  if (!token) return null
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const qs = query({ token, board, since })
  const socket = new WebSocket(`${proto}//${window.location.host}${readBasePath()}${BASE}/events${qs}`)
  socket.addEventListener('open', () => onStatus('open'))
  socket.addEventListener('close', () => onStatus('closed'))
  socket.addEventListener('error', () => onStatus('error'))
  socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data) as { events?: KanbanEvent[]; cursor?: number }
      if (Array.isArray(data.events) && data.events.length > 0) onEvents(data.events, data.cursor ?? since)
    } catch {
      onStatus('error')
    }
  })
  return socket
}
