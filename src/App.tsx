import { FitAddon } from '@xterm/addon-fit'
import { Terminal as XtermTerminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Archive,
  Blocks,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Copy,
  Download,
  Filter,
  GitPullRequest,
  Link2,
  Link2Off,
  Loader2,
  Languages,
  MessageSquare,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
  PauseCircle,
  Pencil,
  Pin,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  Signal,
  Square,
  SquareCheck,
  SquareKanban,
  TerminalSquare,
  TimerReset,
  Trash2,
  UserPlus,
  UserRound,
  Wand2,
  X,
} from 'lucide-react'
import {
  createEventsSocket,
  dashboardApi,
  kanbanApi,
  type BulkTaskInput,
  type DashboardModelInfo,
  type DashboardModelOptions,
  type DashboardProfileInfo,
  type DashboardStatusResponse,
  type DashboardSessionInfo,
  type DashboardSessionMessage,
  type KanbanAssignee,
  type KanbanBoard,
  type KanbanBoardResponse,
  type KanbanDiagnostic,
  type KanbanDiagnosticRow,
  type KanbanEvent,
  type KanbanStats,
  type KanbanTask,
  type KanbanTaskDetail,
  type KanbanTaskLog,
  type KanbanTaskStatus,
} from '@/lib/api'
import { compactId, formatAge, formatDateTime } from '@/lib/format'

const STATUS_ORDER: KanbanTaskStatus[] = ['triage', 'todo', 'ready', 'running', 'blocked', 'done', 'archived']
type WorkspaceView = 'chat' | 'profiles' | 'kanban' | 'settings'
type Language = 'en' | 'zh'

const STATUS_META: Record<KanbanTaskStatus, { label: string; line: string; icon: typeof CircleDot }> = {
  triage: { label: 'Triage', line: 'border-l-slate-400', icon: CircleDot },
  todo: { label: 'Todo', line: 'border-l-slate-500', icon: ClipboardList },
  ready: { label: 'Ready', line: 'border-l-cyan-300', icon: Play },
  running: { label: 'Running', line: 'border-l-emerald-300', icon: Loader2 },
  blocked: { label: 'Blocked', line: 'border-l-red-300', icon: PauseCircle },
  done: { label: 'Done', line: 'border-l-green-300', icon: CheckCircle2 },
  archived: { label: 'Archived', line: 'border-l-zinc-500', icon: Archive },
}

const STORAGE_BOARD_KEY = 'hermes-kanban.selectedBoard'
const CHAT_CHANNEL_PREFIX = 'hermes-kanban-chat'
const STORAGE_GATEWAY_URL_KEY = 'hermes-kanban.gatewayUrl'
const STORAGE_GATEWAY_KEY_KEY = 'hermes-kanban.gatewayKey'
const STORAGE_GATEWAY_SESSION_KEY = 'hermes-kanban.gatewaySession'
const STORAGE_GATEWAY_SESSIONS_KEY = 'hermes-kanban.gatewaySessions'
const STORAGE_GATEWAY_PINNED_KEY = 'hermes-kanban.gatewayPinnedSessions'
const STORAGE_LANGUAGE_KEY = 'hermes-kanban.language'
const STORAGE_SIDEBAR_COLLAPSED_KEY = 'hermes-kanban.sidebarCollapsed'
const STORAGE_CUSTOM_MODELS_KEY = 'hermes-kanban.customModels'
const STORAGE_STATIC_DEMO_ENABLED_KEY = 'hermes-kanban.staticDemoEnabled'
const STORAGE_STATIC_DEMO_KANBAN_KEY = 'hermes-kanban.staticDemoKanban'
const STORAGE_STATIC_DEMO_PROFILES_KEY = 'hermes-kanban.staticDemoProfiles'
const APP_BASE_PATH = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/+$/, '')
const IS_STATIC_PREVIEW = import.meta.env.PROD && APP_BASE_PATH.length > 0

type ModelChoice = {
  provider: string
  model: string
  source?: 'dashboard' | 'custom' | 'history'
}

type ModelUsageStats = {
  apiCalls: number
  inputTokens: number
  modelCount: number
  outputTokens: number
  sessionCount: number
  totalTokens: number
}

type StaticDemoTask = KanbanTask & {
  board: string
  comments: KanbanTaskDetail['comments']
  events: KanbanEvent[]
  links: { parents: string[]; children: string[] }
  log?: string
  runs: KanbanTaskDetail['runs']
}

type StaticDemoKanbanState = {
  boards: KanbanBoard[]
  current: string
  tasks: StaticDemoTask[]
}

type StaticDemoProfile = DashboardProfileInfo & {
  soul: string
}

const TEXT = {
  en: {
    active: 'active',
    addBulkSelection: 'Add to bulk selection',
    addComment: 'Add comment',
    addNote: 'Add a note',
    appSubtitle: 'chat and work queue',
    approvalRequired: 'approval required',
    archive: 'Archive',
    archived: 'Archived',
    assign: 'Assign',
    assignProfile: 'Assign profile',
    assignee: 'Assignee',
    actions: 'Actions',
    allAssignees: 'All assignees',
    allStatuses: 'All statuses',
    allTenants: 'All tenants',
    boards: 'Boards',
    board: 'Board',
    boardArchived: 'Board archived',
    boardCreated: 'Board created',
    boardDeleted: 'Board deleted',
    boardOperationsFallback: 'Kanban Operations Board',
    boardSettingsUpdated: 'Board settings updated',
    body: 'Body',
    block: 'Block',
    blockReason: 'Block reason',
    cancel: 'Cancel',
    child: 'Child',
    children: 'Children',
    childTaskId: 'Child task id',
    chat: 'Chat',
    clear: 'Clear',
    collapseSidebar: 'Collapse sidebar',
    color: 'Color',
    commandSurface: 'command surface',
    commentAdded: 'Comment added',
    comments: 'Comments',
    completionSummary: 'Completion summary',
    context: 'Context',
    containerPath: 'Container path',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    copyCommand: 'Copy command',
    copyMessage: 'Copy message',
    copyPath: 'Copy path',
    create: 'Create',
    custom: 'custom',
    customModel: 'Custom model',
    customProvider: 'Custom provider',
    createBoard: 'Create board',
    createProfile: 'Create profile',
    createTask: 'Create task',
    cloneDefaultProfile: 'Clone default profile config',
    profileSoul: '角色设定 SOUL.md',
    created: 'Created',
    currentModel: 'Current model',
    dashboardSessionSyncFailed: 'Dashboard session sync failed',
    defaultBoard: 'Default',
    defaultProfile: 'Default profile',
    delete: 'Delete',
    deleteProfile: 'Delete profile',
    deleteLocalSession: 'Delete local session',
    description: 'Description',
    diagnostics: 'diagnostics',
    dispatch: 'Dispatch',
    dispatchCycleRequested: 'Dispatch cycle requested',
    dispatchReadyWork: 'Ask Hermes to dispatch ready work',
    directMode: 'direct mode: browser bearer key',
    expandSidebar: 'Expand sidebar',
    events: 'events',
    envFile: 'Env file',
    eventStream: 'event stream',
    filterSearchPlaceholder: 'Search title, id, assignee, tenant',
    export: 'Export',
    fresh: 'fresh',
    gateway: 'Gateway',
    gatewayChat: 'gateway chat',
    hermesModel: 'Hermes model',
    hermesChat: 'Hermes Chat',
    hideArchived: 'Hide archived',
    idle: 'idle',
    icon: 'Icon',
    kanban: 'Kanban',
    language: 'Language',
    languageHelp: 'Only English and Chinese are enabled for this frontend.',
    latestResult: 'Latest result',
    generatedArtifacts: 'Generated artifacts',
    changedFiles: 'Changed files',
    dockerCopyCommand: 'Docker copy command',
    dockerCopyHint: 'Docker workspaces live inside the Hermes container unless /opt/data is mounted to the host. Use docker cp with the Hermes container id/name to copy files out.',
    loadWorkerLog: 'Load worker log',
    loadingTask: 'Loading task',
    localKeyStored: 'local key stored',
    manageBoard: 'Manage board',
    manageCurrentBoard: 'Manage current board',
    messagePlaceholder: 'Message Hermes through the Gateway API',
    messageCopied: 'Message copied',
    model: 'Model',
    modelOptionsEmpty: 'No provider catalog was returned. Use the custom provider and model fields below.',
    modelSaved: 'Model configuration saved',
    navConversation: 'Conversation',
    navSystem: 'System',
    navWork: 'Work',
    newChat: 'New chat',
    newProfile: 'New profile',
    newTask: 'New task',
    name: 'Name',
    noCommentsYet: 'No comments yet',
    noEventsYet: 'No events yet',
    noMatchingLocalSessions: 'no matching local sessions',
    noBrowserKey: 'no browser key stored',
    noProfilesYet: 'No profiles returned by Dashboard',
    none: 'None',
    noChangedFiles: 'No changed files recorded',
    noRunsRecorded: 'No runs recorded',
    noTasksInStatus: 'No tasks in {status}',
    noWorkerLog: 'No worker log exists for this task.',
    notSet: 'not set',
    openChat: 'Open Hermes chat',
    openKanban: 'Open Kanban board',
    openProfiles: 'Open profile management',
    openSettings: 'Open settings',
    optionalCompletionSummary: 'Optional completion summary',
    parent: 'Parent',
    parents: 'Parents',
    parentTaskId: 'Parent task id',
    pinLocalSession: 'Pin local session',
    placeInTriage: 'Place in triage',
    profileCreated: 'Profile created',
    profileDeleted: 'Profile deleted',
    profileInstructions: 'Profile instructions',
    profileInstructionsPlaceholder: 'Describe how this profile should work, what it is good at, and any execution rules it should follow.',
    profileManagement: 'Profile management',
    profileNameHelp: 'Use lowercase letters, numbers, hyphens, or underscores. Clone default config to make the profile dispatch-ready.',
    profilePath: 'Profile path',
    profileSetupHelp: 'Clone default to inherit the working config and skills. SOUL.md is an optional role override saved after creation.',
    profiles: 'Profiles',
    profilesSubtitle: 'Manage Hermes worker profiles, role instructions, and assignee identities.',
    profileDeleteConfirm: 'Delete profile {name}? This cannot be undone.',
    profileSoulSaved: 'Profile SOUL.md saved',
    priority: 'Priority',
    provider: 'Provider',
    proxyMode: 'proxy mode: server-side gateway key',
    ready: 'ready',
    readyAge: 'ready age',
    readyForGatewayRun: 'ready for gateway run',
    reasoning: 'reasoning',
    reclaim: 'Reclaim',
    reclaimBeforeReassignment: 'Reclaim before reassignment',
    reclaimReason: 'Reclaim reason',
    recovery: 'Recovery',
    refresh: 'Refresh',
    refreshBoard: 'Refresh board',
    reassign: 'Reassign',
    reassignProfile: 'Reassign profile',
    relationships: 'Relationships',
    removeBulkSelection: 'Remove from bulk selection',
    removeLink: 'Remove link',
    editSoul: 'Edit SOUL.md',
    rename: 'Rename',
    renameChat: 'Rename chat',
    renameLocalSession: 'Rename local session',
    runEvents: 'run events',
    runsAndLog: 'Runs and log',
    running: 'running',
    saveModel: 'Save model',
    save: 'Save',
    searchLocalSessions: 'Search local sessions',
    selectTaskToInspect: 'Select a task to inspect it.',
    selected: 'selected',
    send: 'Send',
    sendMessage: 'Send message',
    sessions: 'sessions',
    settings: 'Settings',
    settingsSubtitle: 'Language and live Hermes runtime configuration',
    staticPreviewMessage: 'This GitHub Pages build is a static preview. Live Chat, Kanban, Profiles, and Settings require the local Vite dev server so /api and /gateway can proxy to Hermes Dashboard and Gateway.',
    staticPreviewTitle: 'Static preview mode',
    staticPreviewDialogTitle: 'Static preview is offline',
    staticPreviewDialogBody: 'Hermes Dashboard and Gateway are not reachable from this GitHub Pages build. You can start the local dev server for live data, or switch to demo data to try the Kanban and Profiles workflows in your browser.',
    staticPreviewDemoButton: 'Use demo data',
    staticPreviewSetupButton: 'Show setup command',
    staticPreviewDemoNotice: 'Demo data is running locally in this browser. Changes are saved to localStorage and never call Hermes.',
    staticPreviewResetDemo: 'Reset demo data',
    skillCount: 'Skill count',
    slug: 'Slug',
    scratch: 'scratch',
    specify: 'Specify',
    status: 'Status',
    statusArchived: 'Archived',
    statusBlocked: 'Blocked',
    statusDone: 'Done',
    statusReady: 'Ready',
    statusRunning: 'Running',
    statusTodo: 'Todo',
    statusTriage: 'Triage',
    statusSetTo: 'Status set to {status}',
    streamClosed: 'closed',
    streamError: 'error',
    streamIdle: 'idle',
    streamOpen: 'open',
    stop: 'Stop',
    stopActiveRun: 'Stop active run',
    syncDashboardHistory: 'Sync dashboard session history',
    syncedDashboardSessions: 'Synced dashboard sessions',
    taskCreated: 'Task created',
    taskDetail: 'task detail',
    taskLinkCreated: 'Task link created',
    taskLinkRemoved: 'Task link removed',
    taskReassigned: 'Task reassigned',
    taskReclaimed: 'Task reclaimed',
    taskSpecificationRefreshed: 'Task specification refreshed',
    tasks: 'tasks',
    tasksArchived: 'Tasks archived',
    tasksCompleted: 'Tasks completed',
    tasksMovedTo: 'Tasks moved to {status}',
    tasksReassigned: 'Tasks reassigned',
    tasksTracked: 'tasks tracked',
    tenant: 'Tenant',
    title: 'Title',
    typeSlugToEnable: 'Type {slug} to enable archive/delete',
    sync: 'Sync',
    unknown: 'unknown',
    unassigned: 'Unassigned',
    unpinLocalSession: 'Unpin local session',
    addModel: 'Add model',
    addModelHelp: 'Register a provider/model pair locally, then choose it as the main model for new sessions.',
    apiCalls: 'API calls',
    appliesToNewSessions: 'applies to new sessions',
    inputTokens: 'Input',
    lastUsed: 'Last used',
    main: 'Main',
    modelCatalog: 'Model catalog',
    modelCount: 'Models used',
    modelPlaceholder: 'model name',
    modelStats: 'Model statistics',
    modelStatsSelected: 'selected model statistics',
    modelStatsTotal: 'total statistics',
    outputTokens: 'Output',
    providerPlaceholder: 'provider slug',
    selectModelForStats: 'Select a model card to inspect its usage.',
    showModelList: 'Show model list',
    showArchived: 'Show archived',
    switchModel: 'Switch model',
    tokenCount: 'Token count',
    totalSessions: 'Total sessions',
    totalStats: 'Total stats',
    useAsMain: 'Use as main',
    version: 'Version',
    visible: 'visible',
    workspacePath: 'Workspace path',
  },
  zh: {
    active: '活动',
    addBulkSelection: '加入批量选择',
    addComment: '添加评论',
    addNote: '添加备注',
    appSubtitle: '聊天与任务队列',
    approvalRequired: '需要审批',
    archive: '归档',
    archived: '已归档',
    assign: '分配',
    assignProfile: '分配执行配置',
    assignee: '执行者',
    actions: '操作',
    allAssignees: '全部执行者',
    allStatuses: '全部状态',
    allTenants: '全部租户',
    boards: '看板',
    board: '看板',
    boardArchived: '看板已归档',
    boardCreated: '看板已创建',
    boardDeleted: '看板已删除',
    boardOperationsFallback: '看板工作台',
    boardSettingsUpdated: '看板设置已更新',
    body: '内容',
    block: '阻塞',
    blockReason: '阻塞原因',
    cancel: '取消',
    child: '子任务',
    children: '子任务',
    childTaskId: '子任务 ID',
    chat: '聊天',
    clear: '清空',
    collapseSidebar: '收起侧边栏',
    color: '颜色',
    commandSurface: '指挥台',
    commentAdded: '评论已添加',
    comments: '评论',
    completionSummary: '完成摘要',
    context: '上下文',
    containerPath: '容器路径',
    copied: '已复制',
    copyFailed: '复制失败',
    copyCommand: '复制命令',
    copyMessage: '复制消息',
    copyPath: '复制路径',
    create: '创建',
    custom: '自定义',
    customModel: '自定义模型',
    customProvider: '自定义供应商',
    createBoard: '创建看板',
    createProfile: '创建 Profile',
    createTask: '创建任务',
    cloneDefaultProfile: '克隆 default 配置',
    profileSoul: 'Profile SOUL.md',
    created: '创建时间',
    currentModel: '当前模型',
    dashboardSessionSyncFailed: 'Dashboard 会话同步失败',
    defaultBoard: '默认',
    defaultProfile: '默认角色',
    delete: '删除',
    deleteProfile: '删除角色',
    deleteLocalSession: '删除本地会话',
    description: '描述',
    diagnostics: '诊断',
    dispatch: '调度',
    dispatchCycleRequested: '已请求调度',
    dispatchReadyWork: '让 Hermes 调度就绪任务',
    directMode: '直连模式：浏览器发送 Bearer Key',
    expandSidebar: '展开侧边栏',
    events: '事件',
    envFile: '环境文件',
    eventStream: '事件流',
    filterSearchPlaceholder: '搜索标题、ID、执行者、租户',
    export: '导出',
    fresh: '刚刚',
    gateway: 'Gateway',
    gatewayChat: 'Gateway 聊天',
    hermesModel: 'Hermes 大模型',
    hermesChat: 'Hermes 聊天',
    hideArchived: '隐藏归档',
    idle: '空闲',
    icon: '图标',
    kanban: '看板',
    language: '语言',
    languageHelp: '当前前端只启用英文和中文。',
    latestResult: '最新结果',
    generatedArtifacts: '生成产物',
    changedFiles: '变更文件',
    dockerCopyCommand: 'Docker 复制命令',
    dockerCopyHint: 'Docker 模式下产物默认在 Hermes 容器内，除非 /opt/data 已挂载到宿主机。可使用 docker cp 按容器名或容器 ID 复制出来。',
    loadWorkerLog: '加载工作日志',
    loadingTask: '正在加载任务',
    localKeyStored: '已保存本地 Key',
    manageBoard: '管理看板',
    manageCurrentBoard: '管理当前看板',
    messagePlaceholder: '通过 Gateway API 向 Hermes 发送消息',
    messageCopied: '消息已复制',
    model: '模型',
    modelOptionsEmpty: 'Dashboard 没有返回模型供应商列表。请使用下面的自定义供应商和模型字段。',
    modelSaved: '模型配置已保存',
    navConversation: '会话',
    navSystem: '系统',
    navWork: '工作台',
    newChat: '新建会话',
    newProfile: '新建 Profile',
    newTask: '新建任务',
    name: '名称',
    noCommentsYet: '暂无评论',
    noEventsYet: '暂无事件',
    noMatchingLocalSessions: '没有匹配的本地会话',
    noBrowserKey: '未保存浏览器 Key',
    noProfilesYet: 'Dashboard 没有返回 Profile',
    none: '无',
    noChangedFiles: '暂无变更文件记录',
    noRunsRecorded: '暂无运行记录',
    noTasksInStatus: '{status} 列暂无任务',
    noWorkerLog: '此任务暂无工作日志。',
    notSet: '未设置',
    openChat: '打开 Hermes 聊天',
    openKanban: '打开看板',
    openProfiles: '打开角色管理',
    openSettings: '打开系统设置',
    optionalCompletionSummary: '可选完成摘要',
    parent: '父任务',
    parents: '父任务',
    parentTaskId: '父任务 ID',
    pinLocalSession: '固定本地会话',
    placeInTriage: '放入分诊列',
    profileCreated: 'Profile 已创建',
    profileDeleted: 'Profile 已删除',
    profileInstructions: 'Profile 指令',
    profileInstructionsPlaceholder: '描述这个 Profile 的职责、擅长方向，以及执行任务时需要遵守的规则。',
    profileManagement: '角色管理',
    profileNameHelp: '使用小写字母、数字、连字符或下划线。克隆 default 配置后更适合直接调度执行。',
    profilePath: '角色路径',
    profileSetupHelp: '克隆 default 可以继承可用配置和技能。SOUL.md 是可选角色覆写，会在创建后保存。',
    profiles: '角色',
    profilesSubtitle: '管理 Hermes 执行者角色、角色指令和任务分配身份。',
    profileDeleteConfirm: '删除角色 {name}？此操作不可撤销。',
    profileSoulSaved: '角色 SOUL.md 已保存',
    priority: '优先级',
    provider: '供应商',
    proxyMode: '代理模式：服务端注入 Gateway Key',
    ready: '就绪',
    readyAge: '就绪时长',
    readyForGatewayRun: '可以发起 Gateway Run',
    reasoning: '推理过程',
    reclaim: '回收',
    reclaimBeforeReassignment: '重新分配前先回收',
    reclaimReason: '回收原因',
    recovery: '恢复',
    refresh: '刷新',
    refreshBoard: '刷新看板',
    reassign: '重新分配',
    reassignProfile: '重新分配执行配置',
    relationships: '任务关系',
    removeBulkSelection: '移出批量选择',
    removeLink: '移除关联',
    editSoul: '编辑角色设定',
    rename: '重命名',
    renameChat: '重命名会话',
    renameLocalSession: '重命名本地会话',
    runEvents: '运行事件',
    runsAndLog: '运行与日志',
    running: '运行中',
    saveModel: '保存模型',
    save: '保存',
    searchLocalSessions: '搜索本地会话',
    selectTaskToInspect: '选择一个任务查看详情。',
    selected: '已选择',
    send: '发送',
    sendMessage: '发送消息',
    sessions: '会话',
    settings: '系统设置',
    settingsSubtitle: '语言与 Hermes 运行时配置',
    staticPreviewMessage: '当前 GitHub Pages 页面是静态预览。Chat、Kanban、角色和系统设置需要使用本地 Vite dev server，让 /api 和 /gateway 代理到 Hermes Dashboard 与 Gateway。',
    staticPreviewTitle: '静态预览模式',
    staticPreviewDialogTitle: '静态预览无法连接后端',
    staticPreviewDialogBody: '这个 GitHub Pages 构建不能直接访问 Hermes Dashboard 和 Gateway。你可以启动本地 Vite dev server 使用真实数据，也可以切换到模拟数据，在浏览器里体验 Kanban 和 Profiles 的操作流程。',
    staticPreviewDemoButton: '切换到模拟数据',
    staticPreviewSetupButton: '查看启动命令',
    staticPreviewDemoNotice: '当前正在使用浏览器本地模拟数据。所有改动只保存到 localStorage，不会调用 Hermes。',
    staticPreviewResetDemo: '重置模拟数据',
    skillCount: '技能数量',
    slug: '标识',
    scratch: '临时',
    specify: '细化',
    status: '状态',
    statusArchived: '已归档',
    statusBlocked: '已阻塞',
    statusDone: '已完成',
    statusReady: '就绪',
    statusRunning: '运行中',
    statusTodo: '待办',
    statusTriage: '分诊',
    statusSetTo: '状态已设为 {status}',
    streamClosed: '已关闭',
    streamError: '错误',
    streamIdle: '空闲',
    streamOpen: '已连接',
    stop: '停止',
    stopActiveRun: '停止当前运行',
    syncDashboardHistory: '同步 Dashboard 会话历史',
    syncedDashboardSessions: '已同步 Dashboard 会话',
    taskCreated: '任务已创建',
    taskDetail: '任务详情',
    taskLinkCreated: '任务关联已创建',
    taskLinkRemoved: '任务关联已移除',
    taskReassigned: '任务已重新分配',
    taskReclaimed: '任务已回收',
    taskSpecificationRefreshed: '任务说明已刷新',
    tasks: '个任务',
    tasksArchived: '任务已归档',
    tasksCompleted: '任务已完成',
    tasksMovedTo: '任务已移动到 {status}',
    tasksReassigned: '任务已重新分配',
    tasksTracked: '个任务已跟踪',
    tenant: '租户',
    title: '标题',
    typeSlugToEnable: '输入 {slug} 以启用归档/删除',
    sync: '同步',
    unknown: '未知',
    unassigned: '未分配',
    unpinLocalSession: '取消固定本地会话',
    addModel: '新增模型',
    addModelHelp: '在本地登记一个供应商/模型组合，然后可设为新会话使用的主模型。',
    apiCalls: 'API 调用',
    appliesToNewSessions: '应用于新会话',
    inputTokens: '输入',
    lastUsed: '最后使用',
    main: '主模型',
    modelCatalog: '模型目录',
    modelCount: '使用模型数',
    modelPlaceholder: '模型名称',
    modelStats: '模型统计',
    modelStatsSelected: '选中模型统计',
    modelStatsTotal: '总统计',
    outputTokens: '输出',
    providerPlaceholder: '供应商标识',
    selectModelForStats: '选择一个模型卡片查看它的使用统计。',
    showModelList: '显示模型列表',
    showArchived: '显示归档',
    switchModel: '切换模型',
    tokenCount: 'Token 数',
    totalSessions: '总会话数',
    totalStats: '总统计',
    useAsMain: '设为主模型',
    version: '版本',
    visible: '可见',
    workspacePath: '工作目录',
  },
} as const

type Labels = Record<keyof typeof TEXT.en, string>

function interpolate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template)
}

function statusLabel(labels: Labels, status: KanbanTaskStatus): string {
  const map: Record<KanbanTaskStatus, string> = {
    archived: labels.statusArchived,
    blocked: labels.statusBlocked,
    done: labels.statusDone,
    ready: labels.statusReady,
    running: labels.statusRunning,
    todo: labels.statusTodo,
    triage: labels.statusTriage,
  }
  return map[status]
}

function boardDisplayName(board: KanbanBoard | undefined, labels: Labels): string {
  if (!board) return labels.boardOperationsFallback
  if (board.slug === 'default' && (!board.name || board.name.toLowerCase() === 'default')) return labels.defaultBoard
  return board.name || board.slug
}

function formatAgeLabel(labels: Labels, seconds?: number | null): string {
  const value = formatAge(seconds)
  return value === 'fresh' ? labels.fresh : value
}

function workspaceKindLabel(labels: Labels, value?: string | null): string {
  if (!value) return labels.notSet
  return value === 'scratch' ? labels.scratch : value
}

function collectChangedFiles(detail: KanbanTaskDetail | null): string[] {
  const files = new Set<string>()
  for (const run of detail?.runs ?? []) {
    const metadata = run.metadata ?? {}
    const rawFiles = metadata.changed_files ?? metadata.changedFiles
    if (!Array.isArray(rawFiles)) continue
    for (const file of rawFiles) {
      if (typeof file === 'string' && file.trim()) files.add(file.trim())
    }
  }
  return Array.from(files)
}

function joinWorkspacePath(basePath: string, childPath: string): string {
  if (!basePath) return childPath
  const base = basePath.replace(/\/+$/, '')
  const child = childPath.replace(/^\/+/, '')
  return child ? `${base}/${child}` : base
}

function dockerCopyCommand(path: string): string {
  return `docker cp <hermes-container>:${path} .`
}

function streamStateLabel(labels: Labels, state: string): string {
  if (state === 'open') return labels.streamOpen
  if (state === 'closed') return labels.streamClosed
  if (state === 'error') return labels.streamError
  return labels.streamIdle
}

function modelChoiceKey(choice: ModelChoice): string {
  return `${choice.provider.trim().toLowerCase()}::${choice.model.trim().toLowerCase()}`
}

function normalizeModelChoice(choice: Partial<ModelChoice> | null | undefined): ModelChoice | null {
  const provider = choice?.provider?.trim()
  const model = choice?.model?.trim()
  const source = choice?.source ?? 'custom'
  if (!provider || !model) return null
  return { provider, model, source }
}

function sameModelChoice(a: ModelChoice | null | undefined, b: ModelChoice | null | undefined): boolean {
  if (!a || !b) return false
  return modelChoiceKey(a) === modelChoiceKey(b)
}

function uniqueModelChoices(choices: Array<Partial<ModelChoice> | null | undefined>): ModelChoice[] {
  const seen = new Set<string>()
  const result: ModelChoice[] = []
  for (const choice of choices) {
    const normalized = normalizeModelChoice(choice)
    if (!normalized) continue
    const key = modelChoiceKey(normalized)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
  }
  return result
}

function readCustomModelChoices(): ModelChoice[] {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_MODELS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<ModelChoice>[]
    if (!Array.isArray(parsed)) return []
    return uniqueModelChoices(parsed.map((item) => ({ ...item, source: 'custom' })))
  } catch {
    return []
  }
}

function writeCustomModelChoices(choices: ModelChoice[]) {
  localStorage.setItem(STORAGE_CUSTOM_MODELS_KEY, JSON.stringify(uniqueModelChoices(choices).map((choice) => ({
    model: choice.model,
    provider: choice.provider,
    source: 'custom',
  }))))
}

function buildModelChoices(
  info: DashboardModelInfo | null | undefined,
  options: DashboardModelOptions | null | undefined,
  customChoices: ModelChoice[],
  sessions: DashboardSessionInfo[] = [],
): ModelChoice[] {
  const optionChoices = (options?.providers ?? []).flatMap((provider) => {
    const providerSlug = provider.slug || provider.name || options?.provider || 'custom'
    return (provider.models ?? []).map((model) => ({ provider: providerSlug, model, source: 'dashboard' as const }))
  })
  const currentChoice = normalizeModelChoice({ provider: info?.provider || options?.provider, model: info?.model || options?.model, source: 'dashboard' })
  const historyChoices = sessions
    .map((session) => normalizeModelChoice({
      provider: currentChoice?.provider || options?.provider || info?.provider || 'custom',
      model: session.model || undefined,
      source: 'history',
    }))
    .filter(Boolean) as ModelChoice[]
  return uniqueModelChoices([currentChoice, ...customChoices, ...optionChoices, ...historyChoices])
}

function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(absolute >= 10_000_000 ? 0 : 1)}M`
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(absolute >= 10_000 ? 0 : 1)}K`
  return String(Math.round(value))
}

function summarizeSessions(sessions: DashboardSessionInfo[], choice?: ModelChoice | null): ModelUsageStats {
  const filtered = choice ? sessions.filter((session) => session.model === choice.model) : sessions
  const models = new Set(filtered.map((session) => session.model).filter(Boolean))
  return filtered.reduce<ModelUsageStats>((summary, session) => ({
    apiCalls: summary.apiCalls + Math.max(1, session.message_count || 0) + (session.tool_call_count || 0),
    inputTokens: summary.inputTokens + (session.input_tokens || 0),
    modelCount: models.size,
    outputTokens: summary.outputTokens + (session.output_tokens || 0),
    sessionCount: summary.sessionCount + 1,
    totalTokens: summary.totalTokens + (session.input_tokens || 0) + (session.output_tokens || 0),
  }), {
    apiCalls: 0,
    inputTokens: 0,
    modelCount: models.size,
    outputTokens: 0,
    sessionCount: 0,
    totalTokens: 0,
  })
}

function nowEpoch(): number {
  return Math.floor(Date.now() / 1000)
}

function makeStaticTask(input: Omit<StaticDemoTask, 'comments' | 'events' | 'links' | 'runs'> & {
  comments?: StaticDemoTask['comments']
  events?: KanbanEvent[]
  links?: StaticDemoTask['links']
  runs?: StaticDemoTask['runs']
}): StaticDemoTask {
  return {
    comments: input.comments ?? [],
    events: input.events ?? [{ id: input.created_at, task_id: input.id, kind: 'created', created_at: input.created_at }],
    links: input.links ?? { parents: [], children: [] },
    runs: input.runs ?? [],
    ...input,
  }
}

function createDefaultStaticKanbanState(): StaticDemoKanbanState {
  const created = nowEpoch()
  const boards: KanbanBoard[] = [
    {
      slug: 'flight-ops',
      name: '飞行任务调度',
      description: '参考 AgentEarth 的低空感知、航线规划与态势研判任务队列。',
      color: '#46d6b4',
      icon: 'kanban',
      is_current: true,
    },
    {
      slug: 'platform-rd',
      name: '平台研发队列',
      description: '用于体验 Hermes 多执行者协作、前端修复和交付跟踪。',
      color: '#63a7ff',
      icon: 'blocks',
    },
  ]
  const tasks: StaticDemoTask[] = [
    makeStaticTask({
      id: 'task-7f3a21',
      board: 'flight-ops',
      title: '整理滨州低空感知演示任务拆解',
      body: '把演示流程拆成数据准备、态势生成、航线规划、报告输出四个可交付任务。',
      status: 'triage',
      priority: 2,
      assignee: 'planner',
      tenant: 'binzhou',
      workspace_kind: 'planning',
      workspace_path: 'workspaces/binzhou-demo',
      created_at: created - 46 * 60,
      diagnostics: [],
      comments: [{ id: 1, task_id: 'task-7f3a21', author: 'dashboard', body: '需要保留人工复核节点。', created_at: created - 21 * 60 }],
    }),
    makeStaticTask({
      id: 'task-91d0be',
      board: 'flight-ops',
      title: '生成重点目标周界巡检航线',
      body: '调用航线规划能力，输出三条备选路线，并标注禁飞区绕行原因。',
      status: 'ready',
      priority: 3,
      assignee: 'pathplan-operator',
      tenant: 'binzhou',
      workspace_kind: 'route',
      workspace_path: 'workspaces/binzhou-route',
      created_at: created - 132 * 60,
      diagnostics: [{ severity: 'warning', message: '等待最新气象约束确认。' }],
      events: [{ id: 2, task_id: 'task-91d0be', kind: 'specified', created_at: created - 80 * 60 }],
      links: { parents: ['task-7f3a21'], children: [] },
    }),
    makeStaticTask({
      id: 'task-b0a44c',
      board: 'flight-ops',
      title: '汇总实时态势异常点',
      body: '读取感知事件，合并异常高度、速度和进入敏感区的对象。',
      status: 'running',
      priority: 1,
      assignee: 'geo-analyst',
      tenant: 'binzhou',
      workspace_kind: 'analysis',
      workspace_path: 'workspaces/binzhou-situation',
      created_at: created - 220 * 60,
      started_at: created - 18 * 60,
      latest_summary: '已处理 37 条事件，正在合并高度异常样本。',
      diagnostics: [],
      runs: [{
        id: 3,
        task_id: 'task-b0a44c',
        profile: 'geo-analyst',
        status: 'running',
        summary: 'Loaded telemetry stream and built first anomaly cluster.',
        metadata: { changed_files: ['reports/anomaly-clusters.md', 'data/binzhou-events.json'] },
        started_at: created - 18 * 60,
      }],
      log: 'demo run\nloaded telemetry stream\nclustered 37 events\nwaiting for route handoff\n',
    }),
    makeStaticTask({
      id: 'task-3c620f',
      board: 'flight-ops',
      title: '修复航线报告图片缺失',
      body: '报告生成后地图截图路径为空，需要回查导出链路。',
      status: 'blocked',
      priority: 2,
      assignee: 'frontend-builder',
      tenant: 'binzhou',
      workspace_kind: 'debug',
      workspace_path: 'workspaces/report-export',
      created_at: created - 310 * 60,
      diagnostics: [{ severity: 'error', message: '缺少截图产物路径。' }],
      comments: [{ id: 2, task_id: 'task-3c620f', author: 'frontend-builder', body: '疑似导出完成事件没有携带 artifact。', created_at: created - 50 * 60 }],
      events: [{ id: 4, task_id: 'task-3c620f', kind: 'blocked', created_at: created - 48 * 60 }],
      runs: [{
        id: 4,
        task_id: 'task-3c620f',
        profile: 'frontend-builder',
        status: 'error',
        error: 'artifact path missing',
        started_at: created - 52 * 60,
        ended_at: created - 48 * 60,
      }],
    }),
    makeStaticTask({
      id: 'task-a73ff8',
      board: 'platform-rd',
      title: '对齐智能体工作台页签命名',
      body: '角色管理、多智能体看板、可视化编排、MCP 配置器按新顺序展示。',
      status: 'done',
      priority: 1,
      assignee: 'frontend-builder',
      tenant: 'platform',
      workspace_kind: 'frontend',
      workspace_path: 'packages/platform/frontend',
      created_at: created - 600 * 60,
      completed_at: created - 70 * 60,
      result: '导航顺序和文案已更新。',
      diagnostics: [],
      runs: [{
        id: 5,
        task_id: 'task-a73ff8',
        profile: 'frontend-builder',
        status: 'done',
        outcome: 'success',
        summary: 'Updated navigation copy and screenshots.',
        metadata: { changed_files: ['src/router/index.ts', 'src/components/AgentDevSubNav.vue'] },
        started_at: created - 90 * 60,
        ended_at: created - 70 * 60,
      }],
    }),
  ]
  return { boards, current: 'flight-ops', tasks }
}

function createDefaultStaticProfiles(): StaticDemoProfile[] {
  return [
    {
      name: 'default',
      path: 'profiles/default/SOUL.md',
      is_default: true,
      provider: 'OpenAI',
      model: 'gpt-5.4',
      has_env: true,
      skill_count: 18,
      soul: ['# default', '', '你是 Hermes 的默认执行角色。', '优先保持任务闭环，必要时拆解计划、调用工具、回写结果。'].join('\n'),
    },
    {
      name: 'planner',
      path: 'profiles/planner/SOUL.md',
      is_default: false,
      provider: 'OpenAI',
      model: 'gpt-5.4',
      has_env: false,
      skill_count: 11,
      soul: ['# planner', '', '你负责把模糊需求整理成可执行任务。', '输出必须包含目标、边界、风险、依赖与验收方式。'].join('\n'),
    },
    {
      name: 'frontend-builder',
      path: 'profiles/frontend-builder/SOUL.md',
      is_default: false,
      provider: 'OpenAI',
      model: 'gpt-5.4',
      has_env: true,
      skill_count: 14,
      soul: ['# frontend-builder', '', '你负责构建当前产品风格一致的前端界面。', '实现时优先复用本项目组件、布局密度和视觉语言。'].join('\n'),
    },
  ]
}

function readStaticDemoKanbanState(): StaticDemoKanbanState {
  try {
    const raw = localStorage.getItem(STORAGE_STATIC_DEMO_KANBAN_KEY)
    if (!raw) return createDefaultStaticKanbanState()
    const parsed = JSON.parse(raw) as StaticDemoKanbanState
    if (!Array.isArray(parsed.boards) || !Array.isArray(parsed.tasks)) return createDefaultStaticKanbanState()
    return parsed
  } catch {
    return createDefaultStaticKanbanState()
  }
}

function writeStaticDemoKanbanState(state: StaticDemoKanbanState) {
  localStorage.setItem(STORAGE_STATIC_DEMO_KANBAN_KEY, JSON.stringify(state))
}

function readStaticDemoProfiles(): StaticDemoProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_STATIC_DEMO_PROFILES_KEY)
    if (!raw) return createDefaultStaticProfiles()
    const parsed = JSON.parse(raw) as StaticDemoProfile[]
    if (!Array.isArray(parsed)) return createDefaultStaticProfiles()
    return parsed
  } catch {
    return createDefaultStaticProfiles()
  }
}

function writeStaticDemoProfiles(profiles: StaticDemoProfile[]) {
  localStorage.setItem(STORAGE_STATIC_DEMO_PROFILES_KEY, JSON.stringify(profiles))
}

function buildStaticDemoSnapshot(
  state: StaticDemoKanbanState,
  boardSlug: string,
  tenant: string,
  includeArchived: boolean,
) {
  const now = nowEpoch()
  const boardTasks = state.tasks
    .filter((task) => task.board === boardSlug)
    .filter((task) => includeArchived || task.status !== 'archived')
    .filter((task) => !tenant || task.tenant === tenant)
    .map((task) => ({
      ...task,
      age: {
        created_age_seconds: Math.max(0, now - task.created_at),
        started_age_seconds: task.started_at ? Math.max(0, now - task.started_at) : null,
        time_to_complete_seconds: task.completed_at && task.started_at ? Math.max(0, task.completed_at - task.started_at) : null,
      },
      warnings: task.diagnostics?.length ? { count: task.diagnostics.length, highest_severity: task.diagnostics[0]?.severity ?? 'warning' } : null,
    }))
  const columns = STATUS_ORDER.map((status) => ({
    name: status,
    tasks: boardTasks.filter((task) => task.status === status),
  }))
  const counts = state.tasks.reduce<Record<string, Record<string, number>>>((acc, task) => {
    acc[task.board] ??= {}
    acc[task.board][task.status] = (acc[task.board][task.status] ?? 0) + 1
    return acc
  }, {})
  const boards = state.boards.map((board) => {
    const boardCounts = counts[board.slug] ?? {}
    return {
      ...board,
      is_current: board.slug === boardSlug,
      counts: boardCounts,
      total: Object.values(boardCounts).reduce((sum, count) => sum + count, 0),
    }
  })
  const diagnostics = boardTasks
    .filter((task) => task.diagnostics?.length)
    .map<KanbanDiagnosticRow>((task) => ({
      task_id: task.id,
      task_title: task.title,
      task_status: task.status,
      task_assignee: task.assignee,
      diagnostics: task.diagnostics ?? [],
    }))
  const stats: KanbanStats = {
    by_status: Object.fromEntries(STATUS_ORDER.map((status) => [status, columns.find((column) => column.name === status)?.tasks.length ?? 0])),
    by_assignee: boardTasks.reduce<Record<string, number>>((acc, task) => {
      const key = task.assignee || 'unassigned'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {}),
    oldest_ready_age_seconds: Math.max(0, ...boardTasks.filter((task) => task.status === 'ready').map((task) => now - task.created_at)),
    total: boardTasks.length,
  }
  const boardData: KanbanBoardResponse = {
    columns,
    tenants: Array.from(new Set(state.tasks.filter((task) => task.board === boardSlug).map((task) => task.tenant).filter(Boolean))) as string[],
    assignees: Array.from(new Set(state.tasks.map((task) => task.assignee).filter(Boolean))) as string[],
    latest_event_id: Math.max(0, ...state.tasks.flatMap((task) => task.events.map((event) => event.id))),
    now,
  }
  const assignees = boardData.assignees.map<KanbanAssignee>((name) => ({
    name,
    on_disk: true,
    counts: state.tasks.filter((task) => task.assignee === name).reduce<Record<string, number>>((acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1
      return acc
    }, {}),
  }))
  return { assignees, boardData, boards, diagnostics, stats }
}

function staticDemoTaskDetail(state: StaticDemoKanbanState, taskId: string): KanbanTaskDetail | null {
  const task = state.tasks.find((item) => item.id === taskId)
  if (!task) return null
  return {
    task,
    comments: task.comments,
    events: task.events,
    links: task.links,
    runs: task.runs,
  }
}

function readInitialView(): WorkspaceView {
  if (window.location.pathname.includes('/chat')) return 'chat'
  if (window.location.pathname.includes('/profiles')) return 'profiles'
  if (window.location.pathname.includes('/settings')) return 'settings'
  return 'kanban'
}

function routePath(view: WorkspaceView): string {
  const route = view === 'chat' ? '/chat' : view === 'profiles' ? '/profiles' : view === 'settings' ? '/settings' : '/kanban'
  return `${APP_BASE_PATH}${route}`
}

function readInitialLanguage(): Language {
  return localStorage.getItem(STORAGE_LANGUAGE_KEY) === 'zh' ? 'zh' : 'en'
}

function App() {
  const [activeView, setActiveView] = useState<WorkspaceView>(readInitialView)
  const [language, setLanguageState] = useState<Language>(readInitialLanguage)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem(STORAGE_SIDEBAR_COLLAPSED_KEY) === '1')
  const [selectedBoard, setSelectedBoard] = useState(() => localStorage.getItem(STORAGE_BOARD_KEY) || '')
  const [boards, setBoards] = useState<KanbanBoard[]>([])
  const [boardData, setBoardData] = useState<KanbanBoardResponse | null>(null)
  const [stats, setStats] = useState<KanbanStats | null>(null)
  const [assignees, setAssignees] = useState<KanbanAssignee[]>([])
  const [diagnostics, setDiagnostics] = useState<KanbanDiagnosticRow[]>([])
  const [diagnosticCount, setDiagnosticCount] = useState(0)
  const [tenantFilter, setTenantFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<KanbanTaskStatus | 'all'>('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [taskDetail, setTaskDetail] = useState<KanbanTaskDetail | null>(null)
  const [taskLog, setTaskLog] = useState<KanbanTaskLog | null>(null)
  const [loading, setLoading] = useState(!IS_STATIC_PREVIEW)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [socketState, setSocketState] = useState<'idle' | 'open' | 'closed' | 'error'>('idle')
  const [latestCursor, setLatestCursor] = useState(0)
  const [eventCount, setEventCount] = useState(0)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showCreateBoard, setShowCreateBoard] = useState(false)
  const [showBoardManager, setShowBoardManager] = useState(false)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [runtimeModel, setRuntimeModel] = useState<ModelChoice | null>(null)
  const [runtimeModelChoices, setRuntimeModelChoices] = useState<ModelChoice[]>(readCustomModelChoices)
  const [modelSwitching, setModelSwitching] = useState(false)
  const [staticDemoEnabled, setStaticDemoEnabled] = useState(() => localStorage.getItem(STORAGE_STATIC_DEMO_ENABLED_KEY) === '1')
  const [showStaticPrompt, setShowStaticPrompt] = useState(() => IS_STATIC_PREVIEW && localStorage.getItem(STORAGE_STATIC_DEMO_ENABLED_KEY) !== '1')
  const [staticDemoState, setStaticDemoState] = useState<StaticDemoKanbanState>(readStaticDemoKanbanState)
  const refreshRef = useRef<() => Promise<void>>(async () => undefined)
  const labels = TEXT[language]
  const staticDemo = IS_STATIC_PREVIEW && staticDemoEnabled

  useEffect(() => {
    const handlePopState = () => {
      setActiveView(readInitialView())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function setLanguage(next: Language) {
    setLanguageState(next)
    localStorage.setItem(STORAGE_LANGUAGE_KEY, next)
  }

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((current) => {
      const next = !current
      localStorage.setItem(STORAGE_SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  function navigateView(view: WorkspaceView) {
    setActiveView(view)
    const nextPath = routePath(view)
    if (window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath)
  }

  const addCustomModelChoice = useCallback((choice: ModelChoice) => {
    const normalized = normalizeModelChoice({ ...choice, source: 'custom' })
    if (!normalized) return
    const nextCustomChoices = uniqueModelChoices([...readCustomModelChoices(), normalized])
    writeCustomModelChoices(nextCustomChoices)
    setRuntimeModelChoices((current) => uniqueModelChoices([...current, ...nextCustomChoices]))
  }, [])

  const refreshRuntimeModels = useCallback(async () => {
    if (IS_STATIC_PREVIEW) return
    try {
      const [nextInfo, nextOptions, nextSessions] = await Promise.all([
        dashboardApi.getModelInfo(),
        dashboardApi.getModelOptions().catch(() => null),
        dashboardApi.getSessions(100, 0).catch(() => ({ sessions: [] as DashboardSessionInfo[] })),
      ])
      const currentChoice = normalizeModelChoice({
        provider: nextInfo.provider || nextOptions?.provider || 'custom',
        model: nextInfo.model || nextOptions?.model,
        source: 'dashboard',
      })
      if (currentChoice) setRuntimeModel(currentChoice)
      setRuntimeModelChoices(buildModelChoices(nextInfo, nextOptions, readCustomModelChoices(), nextSessions.sessions))
    } catch {
      setRuntimeModelChoices((current) => uniqueModelChoices([...current, ...readCustomModelChoices()]))
    }
  }, [])

  const switchRuntimeModel = useCallback(async (choice: ModelChoice) => {
    const normalized = normalizeModelChoice(choice)
    if (!normalized) return
    setModelSwitching(true)
    try {
      await dashboardApi.setModelAssignment({
        scope: 'main',
        provider: normalized.provider,
        model: normalized.model,
      })
      addCustomModelChoice(normalized)
      setRuntimeModel(normalized)
      await refreshRuntimeModels()
    } finally {
      setModelSwitching(false)
    }
  }, [addCustomModelChoice, refreshRuntimeModels])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshRuntimeModels()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshRuntimeModels])

  const staticSelectedBoard = staticDemoState.boards.some((board) => board.slug === selectedBoard)
    ? selectedBoard
    : staticDemoState.current || staticDemoState.boards[0]?.slug || 'flight-ops'
  const effectiveBoard = staticDemo
    ? staticSelectedBoard
    : selectedBoard || boards.find((board) => board.is_current)?.slug || 'default'
  const currentBoard = boards.find((board) => board.slug === effectiveBoard)

  const applyStaticDemoState = useCallback((nextState: StaticDemoKanbanState, boardOverride?: string) => {
    const requestedBoard = boardOverride || selectedBoard || nextState.current || 'flight-ops'
    const board = nextState.boards.some((item) => item.slug === requestedBoard)
      ? requestedBoard
      : nextState.current || nextState.boards[0]?.slug || 'flight-ops'
    const snapshot = buildStaticDemoSnapshot(nextState, board, tenantFilter, showArchived)
    setBoards(snapshot.boards)
    setBoardData(snapshot.boardData)
    setStats(snapshot.stats)
    setAssignees(snapshot.assignees)
    setDiagnostics(snapshot.diagnostics)
    setDiagnosticCount(snapshot.diagnostics.length)
    setLatestCursor(snapshot.boardData.latest_event_id)
    setSocketState('closed')
    setEventCount(nextState.tasks.reduce((sum, task) => sum + task.events.length, 0))
    setLoading(false)
    setError(null)
    if (!selectedBoard || !nextState.boards.some((item) => item.slug === selectedBoard)) {
      setSelectedBoard(board)
      localStorage.setItem(STORAGE_BOARD_KEY, board)
    }
  }, [selectedBoard, showArchived, tenantFilter])

  function commitStaticDemoState(updater: (state: StaticDemoKanbanState) => StaticDemoKanbanState, boardOverride?: string) {
    setStaticDemoState((current) => {
      const next = updater(current)
      writeStaticDemoKanbanState(next)
      window.setTimeout(() => applyStaticDemoState(next, boardOverride), 0)
      return next
    })
  }

  function enableStaticDemo() {
    localStorage.setItem(STORAGE_STATIC_DEMO_ENABLED_KEY, '1')
    setStaticDemoEnabled(true)
    setShowStaticPrompt(false)
    const next = readStaticDemoKanbanState()
    setStaticDemoState(next)
    applyStaticDemoState(next, next.current)
    setNotice(labels.staticPreviewDemoNotice)
  }

  function resetStaticDemo() {
    const next = createDefaultStaticKanbanState()
    writeStaticDemoKanbanState(next)
    localStorage.setItem(STORAGE_STATIC_DEMO_PROFILES_KEY, JSON.stringify(createDefaultStaticProfiles()))
    setStaticDemoState(next)
    setSelectedBoard(next.current)
    localStorage.setItem(STORAGE_BOARD_KEY, next.current)
    applyStaticDemoState(next, next.current)
    setSelectedTaskId(null)
    setSelectedIds(new Set())
    setTaskDetail(null)
    setTaskLog(null)
    setNotice(labels.staticPreviewDemoNotice)
  }

  const refreshAll = useCallback(async (silent = false, boardOverride?: string) => {
    if (IS_STATIC_PREVIEW) {
      if (staticDemoEnabled) applyStaticDemoState(staticDemoState, boardOverride)
      setLoading(false)
      setError(null)
      return
    }
    if (!silent) setLoading(true)
    setError(null)
    const board = boardOverride || effectiveBoard
    try {
      const [boardsRes, data, nextStats, nextAssignees, nextDiagnostics] = await Promise.all([
        kanbanApi.getBoards(false),
        kanbanApi.getBoard({ board, tenant: tenantFilter, includeArchived: showArchived }),
        kanbanApi.getStats({ board }),
        kanbanApi.getAssignees({ board }),
        kanbanApi.getDiagnostics({ board }).catch(() => ({ diagnostics: [], count: 0 })),
      ])
      setBoards(boardsRes.boards)
      setBoardData(data)
      setStats(nextStats)
      setAssignees(nextAssignees)
      setDiagnostics(nextDiagnostics.diagnostics)
      setDiagnosticCount(nextDiagnostics.count)
      setLatestCursor(data.latest_event_id || 0)
      if (!selectedBoard) {
        const next = boardsRes.current || board || 'default'
        setSelectedBoard(next)
        localStorage.setItem(STORAGE_BOARD_KEY, next)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [applyStaticDemoState, effectiveBoard, selectedBoard, showArchived, staticDemoEnabled, staticDemoState, tenantFilter])

  useEffect(() => {
    refreshRef.current = () => refreshAll(true)
  }, [refreshAll])

  useEffect(() => {
    if (!staticDemo) return
    const timer = window.setTimeout(() => applyStaticDemoState(staticDemoState), 0)
    return () => window.clearTimeout(timer)
  }, [applyStaticDemoState, staticDemo, staticDemoState])

  useEffect(() => {
    if (activeView !== 'kanban') {
      return undefined
    }
    const timer = window.setTimeout(() => {
      void refreshAll(false)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeView, refreshAll])

  useEffect(() => {
    if (activeView !== 'kanban') return undefined
    if (!boardData) return undefined
    const socket = createEventsSocket(effectiveBoard, latestCursor, (events: KanbanEvent[], cursor: number) => {
      setEventCount((count) => count + events.length)
      setLatestCursor(cursor)
      void refreshRef.current()
    }, (state) => setSocketState(state))
    if (!socket) {
      setSocketState('closed')
      return undefined
    }
    return () => socket.close()
  }, [activeView, boardData, effectiveBoard, latestCursor])

  useEffect(() => {
    if (activeView !== 'kanban') return
    if (!selectedTaskId) {
      return
    }
    if (staticDemo) {
      const timer = window.setTimeout(() => {
        setTaskLog(null)
        setTaskDetail(staticDemoTaskDetail(staticDemoState, selectedTaskId))
        setDetailLoading(false)
      }, 0)
      return () => window.clearTimeout(timer)
    }
    let ignore = false
    const timer = window.setTimeout(() => {
      setDetailLoading(true)
      setTaskLog(null)
      kanbanApi.getTask(selectedTaskId, { board: effectiveBoard })
        .then((detail) => {
          if (!ignore) setTaskDetail(detail)
        })
        .catch((err) => {
          if (!ignore) setNotice((err as Error).message)
        })
        .finally(() => {
          if (!ignore) setDetailLoading(false)
        })
    }, 0)
    return () => {
      ignore = true
      window.clearTimeout(timer)
    }
  }, [activeView, effectiveBoard, selectedTaskId, staticDemo, staticDemoState])

  const diagnosticsByTask = useMemo(() => {
    const map = new Map<string, KanbanDiagnosticRow>()
    for (const row of diagnostics) map.set(row.task_id, row)
    return map
  }, [diagnostics])

  const columns = useMemo(() => {
    const byStatus = new Map<KanbanTaskStatus, KanbanTask[]>()
    for (const status of STATUS_ORDER) byStatus.set(status, [])
    for (const column of boardData?.columns ?? []) byStatus.set(column.name, column.tasks)
    const visibleStatuses = showArchived ? STATUS_ORDER : STATUS_ORDER.filter((status) => status !== 'archived')
    return visibleStatuses.map((status) => ({
      status,
      tasks: (byStatus.get(status) ?? []).filter((task) => {
        if (statusFilter !== 'all' && task.status !== statusFilter) return false
        if (assigneeFilter !== 'all' && (task.assignee || 'unassigned') !== assigneeFilter) return false
        const needle = search.trim().toLowerCase()
        if (!needle) return true
        return [task.title, task.body, task.assignee, task.tenant, task.id].some((value) => String(value ?? '').toLowerCase().includes(needle))
      }),
    }))
  }, [assigneeFilter, boardData, search, showArchived, statusFilter])

  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds])
  const totalTasks = columns.reduce((sum, column) => sum + column.tasks.length, 0)
  const activeTasks = totalTasks - (columns.find((column) => column.status === 'done')?.tasks.length ?? 0) - (columns.find((column) => column.status === 'archived')?.tasks.length ?? 0)

  function chooseBoard(slug: string) {
    setSelectedBoard(slug)
    localStorage.setItem(STORAGE_BOARD_KEY, slug)
    setSelectedTaskId(null)
    setSelectedIds(new Set())
    if (staticDemo) {
      commitStaticDemoState((state) => ({ ...state, current: slug }), slug)
      return
    }
    void refreshAll(false, slug)
  }

  function toggleTaskSelection(taskId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) next.add(taskId)
      else next.delete(taskId)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function runAction(
    action: () => Promise<void>,
    message: string,
    opts: { clearSelection?: boolean; refresh?: boolean; refreshDetail?: boolean } = {},
  ) {
    setBusy(true)
    setNotice(null)
    try {
      await action()
      setNotice(message)
      if (opts.clearSelection) clearSelection()
      if (opts.refresh !== false) await refreshAll(true)
      if (opts.refreshDetail !== false && selectedTaskId) {
        if (staticDemo) setTaskDetail(staticDemoTaskDetail(staticDemoState, selectedTaskId))
        else setTaskDetail(await kanbanApi.getTask(selectedTaskId, { board: effectiveBoard }))
      }
    } catch (err) {
      setNotice((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function moveTask(taskId: string, status: KanbanTaskStatus) {
    if (staticDemo) {
      await runAction(async () => {
        commitStaticDemoState((state) => ({
          ...state,
          tasks: state.tasks.map((task) => task.id === taskId ? {
            ...task,
            status,
            completed_at: status === 'done' ? nowEpoch() : task.completed_at,
            events: [...task.events, { id: Date.now(), task_id: task.id, kind: `status:${status}`, created_at: nowEpoch() }],
          } : task),
        }))
      }, `${compactId(taskId)} ${interpolate(labels.statusSetTo, { status: statusLabel(labels, status) })}`, { refresh: false })
      return
    }
    await runAction(async () => {
      await kanbanApi.updateTask(taskId, { status }, { board: effectiveBoard })
    }, `${compactId(taskId)} ${interpolate(labels.statusSetTo, { status: statusLabel(labels, status) })}`)
  }

  async function loadLog(taskId: string) {
    setBusy(true)
    try {
      if (staticDemo) {
        const task = staticDemoState.tasks.find((item) => item.id === taskId)
        setTaskLog({
          task_id: taskId,
          path: task?.workspace_path ? `${task.workspace_path}/worker.log` : '',
          exists: Boolean(task?.log),
          size_bytes: task?.log?.length ?? 0,
          content: task?.log ?? '',
          truncated: false,
        })
      } else {
        setTaskLog(await kanbanApi.getTaskLog(taskId, { board: effectiveBoard, tail: 120000 }))
      }
    } catch (err) {
      setNotice((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function bulkUpdate(input: Omit<BulkTaskInput, 'ids'>, message: string) {
    if (staticDemo) {
      void runAction(async () => {
        commitStaticDemoState((state) => ({
          ...state,
          tasks: state.tasks.map((task) => {
            if (!selectedIds.has(task.id)) return task
            const status = input.archive ? 'archived' : input.status ?? task.status
            return {
              ...task,
              status,
              assignee: input.assignee ?? task.assignee,
              result: input.result ?? task.result,
              latest_summary: input.summary ?? task.latest_summary,
              completed_at: status === 'done' ? nowEpoch() : task.completed_at,
              events: [...task.events, { id: Date.now() + Math.floor(Math.random() * 1000), task_id: task.id, kind: input.archive ? 'archived' : 'updated', created_at: nowEpoch() }],
            }
          }),
        }))
      }, message, { clearSelection: true, refresh: false })
      return
    }
    void runAction(async () => {
      const res = await kanbanApi.bulkUpdate({ ids: selectedIdList, ...input }, { board: effectiveBoard })
      const failures = res.results.filter((item) => !item.ok)
      if (failures.length) throw new Error(`${failures.length} task updates failed: ${failures.map((item) => compactId(item.id)).join(', ')}`)
    }, message, { clearSelection: true })
  }

  function patchStaticTask(taskId: string, patch: Partial<KanbanTask> & { block_reason?: string; summary?: string }, kind = 'updated') {
    commitStaticDemoState((state) => ({
      ...state,
      tasks: state.tasks.map((task) => {
        if (task.id !== taskId) return task
        const status = patch.status ?? task.status
        return {
          ...task,
          ...patch,
          status,
          result: patch.summary ?? patch.result ?? task.result,
          latest_summary: patch.summary ?? task.latest_summary,
          completed_at: status === 'done' ? nowEpoch() : task.completed_at,
          diagnostics: patch.block_reason ? [{ severity: 'warning', message: patch.block_reason }] : (patch.diagnostics ?? task.diagnostics),
          events: [...task.events, { id: Date.now(), task_id: task.id, kind, created_at: nowEpoch() }],
        }
      }),
    }))
  }

  function createStaticTask(input: { title: string; body?: string; assignee?: string; tenant?: string; priority?: number; triage?: boolean }) {
    const id = `task-${Math.random().toString(16).slice(2, 8)}`
    const created = nowEpoch()
    const task = makeStaticTask({
      id,
      board: effectiveBoard,
      title: input.title,
      body: input.body,
      status: input.triage ? 'triage' : 'todo',
      priority: input.priority ?? 1,
      assignee: input.assignee || null,
      tenant: input.tenant || 'platform',
      workspace_kind: 'manual',
      workspace_path: `workspaces/${effectiveBoard}`,
      created_at: created,
      created_by: 'demo-user',
      diagnostics: [],
    })
    commitStaticDemoState((state) => ({ ...state, tasks: [task, ...state.tasks] }))
    setSelectedTaskId(id)
  }

  function addStaticComment(taskId: string, body: string) {
    commitStaticDemoState((state) => ({
      ...state,
      tasks: state.tasks.map((task) => task.id === taskId ? {
        ...task,
        comments: [...task.comments, { id: Date.now(), task_id: taskId, author: 'dashboard', body, created_at: nowEpoch() }],
        events: [...task.events, { id: Date.now() + 1, task_id: taskId, kind: 'comment_added', created_at: nowEpoch() }],
      } : task),
    }))
  }

  function addStaticLink(parentId: string, childId: string) {
    commitStaticDemoState((state) => ({
      ...state,
      tasks: state.tasks.map((task) => {
        if (task.id === parentId && !task.links.children.includes(childId)) return { ...task, links: { ...task.links, children: [...task.links.children, childId] } }
        if (task.id === childId && !task.links.parents.includes(parentId)) return { ...task, links: { ...task.links, parents: [...task.links.parents, parentId] } }
        return task
      }),
    }))
  }

  function deleteStaticLink(parentId: string, childId: string) {
    commitStaticDemoState((state) => ({
      ...state,
      tasks: state.tasks.map((task) => {
        if (task.id === parentId) return { ...task, links: { ...task.links, children: task.links.children.filter((id) => id !== childId) } }
        if (task.id === childId) return { ...task, links: { ...task.links, parents: task.links.parents.filter((id) => id !== parentId) } }
        return task
      }),
    }))
  }

  function createStaticBoard(input: { slug: string; name?: string; description?: string; icon?: string; color?: string; switch?: boolean }) {
    const board: KanbanBoard = {
      slug: input.slug,
      name: input.name || input.slug,
      description: input.description,
      icon: input.icon || 'kanban',
      color: input.color || '#46d6b4',
    }
    const nextBoard = input.switch === false ? effectiveBoard : board.slug
    commitStaticDemoState((state) => ({
      ...state,
      boards: state.boards.some((item) => item.slug === board.slug)
        ? state.boards.map((item) => item.slug === board.slug ? { ...item, ...board } : item)
        : [...state.boards, board],
      current: nextBoard,
    }), nextBoard)
    setSelectedBoard(nextBoard)
    localStorage.setItem(STORAGE_BOARD_KEY, nextBoard)
  }

  function updateStaticBoard(slug: string, input: { name?: string; description?: string; icon?: string; color?: string }) {
    commitStaticDemoState((state) => ({
      ...state,
      boards: state.boards.map((board) => board.slug === slug ? { ...board, ...input } : board),
    }))
  }

  function deleteStaticBoard(slug: string, hardDelete: boolean) {
    commitStaticDemoState((state) => {
      if (!hardDelete) {
        return { ...state, boards: state.boards.map((board) => board.slug === slug ? { ...board, archived: true } : board) }
      }
      const boards = state.boards.filter((board) => board.slug !== slug)
      const current = boards[0]?.slug || 'flight-ops'
      setSelectedBoard(current)
      localStorage.setItem(STORAGE_BOARD_KEY, current)
      return {
        boards,
        current,
        tasks: state.tasks.filter((task) => task.board !== slug),
      }
    })
  }

  return (
    <div className="relative h-dvh min-h-dvh overflow-hidden text-[var(--console-text)]">
      <div className="app-noise" />
      <div className={`relative grid h-dvh min-h-0 grid-cols-1 overflow-hidden ${sidebarCollapsed ? 'lg:grid-cols-[4.75rem_minmax(0,1fr)]' : 'lg:grid-cols-[17rem_minmax(0,1fr)]'}`}>
        <Sidebar
          activeView={activeView}
          activeTasks={activeTasks}
          boards={boards}
          collapsed={sidebarCollapsed}
          diagnosticCount={diagnosticCount}
          eventCount={eventCount}
          labels={labels}
          modelChoices={runtimeModelChoices}
          modelSwitching={modelSwitching}
          runtimeModel={runtimeModel}
          selectedBoard={effectiveBoard}
          socketState={socketState}
          stats={stats}
          totalTasks={totalTasks}
          onBoardChange={chooseBoard}
          onCreateBoard={() => setShowCreateBoard(true)}
          onModelSwitch={(choice) => void switchRuntimeModel(choice)}
          onToggleCollapsed={toggleSidebarCollapsed}
          onViewChange={navigateView}
        />

        <main className="flex min-h-0 flex-col border-l border-[var(--console-line)] bg-[rgba(9,13,17,0.62)]">
          {activeView === 'chat' ? (
            <ChatWorkspace labels={labels} staticPreview={IS_STATIC_PREVIEW} />
          ) : activeView === 'profiles' ? (
            IS_STATIC_PREVIEW && !staticDemoEnabled ? (
              <StaticPreviewPanel labels={labels} onUseDemo={enableStaticDemo} />
            ) : (
              <ProfilesWorkspace labels={labels} staticDemo={staticDemo} staticPreview={IS_STATIC_PREVIEW} />
            )
          ) : activeView === 'settings' ? (
            <SettingsWorkspace
              modelChoices={runtimeModelChoices}
              modelSwitching={modelSwitching}
              runtimeModel={runtimeModel}
              staticPreview={IS_STATIC_PREVIEW}
              labels={labels}
              language={language}
              onAddModel={addCustomModelChoice}
              onLanguageChange={setLanguage}
              onRefreshRuntimeModels={refreshRuntimeModels}
              onSwitchModel={switchRuntimeModel}
            />
          ) : (
            IS_STATIC_PREVIEW && !staticDemoEnabled ? (
              <StaticPreviewPanel labels={labels} onUseDemo={enableStaticDemo} />
            ) : (
            <>
              <Toolbar
                assignees={assignees}
                assigneeFilter={assigneeFilter}
                boardData={boardData}
                busy={busy}
                currentBoard={currentBoard}
                labels={labels}
                search={search}
                showArchived={showArchived}
                statusFilter={statusFilter}
                tenantFilter={tenantFilter}
                onAssigneeFilter={setAssigneeFilter}
                onCreateTask={() => setShowCreateTask(true)}
                onDispatch={() => {
                  if (staticDemo) {
                    const readyTask = staticDemoState.tasks.find((task) => task.board === effectiveBoard && task.status === 'ready')
                    if (!readyTask) {
                      setNotice(labels.noTasksInStatus.replace('{status}', labels.statusReady))
                      return
                    }
                    void moveTask(readyTask.id, 'running')
                    return
                  }
                  void runAction(async () => { await kanbanApi.dispatch({ board: effectiveBoard, max: 8 }) }, labels.dispatchCycleRequested)
                }}
                onManageBoard={() => setShowBoardManager(true)}
                onRefresh={() => void refreshAll(false)}
                onSearch={setSearch}
                onStatusFilter={setStatusFilter}
                onTenantFilter={setTenantFilter}
                onToggleArchived={() => {
                  setShowArchived((current) => !current)
                  if (showArchived && statusFilter === 'archived') setStatusFilter('all')
                }}
              />

              {staticDemo && (
                <div className="mx-4 mt-4 flex flex-col justify-between gap-2 rounded-lg border border-[rgba(70,214,180,0.28)] bg-[rgba(70,214,180,0.08)] p-3 text-sm text-[#d8fff5] sm:flex-row sm:items-center">
                  <span>{labels.staticPreviewDemoNotice}</span>
                  <button className="button-base min-h-0 px-3 py-1.5 text-xs" onClick={resetStaticDemo} type="button">{labels.staticPreviewResetDemo}</button>
                </div>
              )}
              {error && <ErrorBanner message={error} />}
              {notice && <Notice message={notice} onClose={() => setNotice(null)} />}
              <DiagnosticsStrip diagnostics={diagnostics} labels={labels} onSelectTask={setSelectedTaskId} />

              <section className="min-h-0 flex-1 overflow-hidden px-4 pb-4">
                {loading ? (
                  <BoardSkeleton />
                ) : (
                  <div className="scrollbar-thin grid h-full auto-cols-[minmax(18rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2 lg:auto-cols-[minmax(17rem,1fr)]">
                    {columns.map((column) => (
                      <KanbanColumn
                        diagnosticsByTask={diagnosticsByTask}
                        dragTaskId={dragTaskId}
                        key={column.status}
                        labels={labels}
                        selectedIds={selectedIds}
                        status={column.status}
                        tasks={column.tasks}
                        onDragEnd={() => setDragTaskId(null)}
                        onDragStart={setDragTaskId}
                        onDropTask={(taskId, status) => void moveTask(taskId, status)}
                        onSelectTask={setSelectedTaskId}
                        onToggleSelected={toggleTaskSelection}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
            )
          )}
        </main>
      </div>

      {IS_STATIC_PREVIEW && showStaticPrompt && !staticDemoEnabled && (
        <StaticPreviewPrompt
          labels={labels}
          onClose={() => setShowStaticPrompt(false)}
          onUseDemo={enableStaticDemo}
        />
      )}

      {activeView === 'kanban' && selectedIds.size > 0 && (
        <BulkActionBar
          assignees={assignees}
          busy={busy}
          labels={labels}
          selectedCount={selectedIds.size}
          onClear={clearSelection}
          onUpdate={bulkUpdate}
        />
      )}

      {activeView === 'kanban' && <TaskDrawer
        key={selectedTaskId || 'closed'}
        assignees={assignees}
        busy={busy}
        detail={taskDetail}
        diagnosticRow={selectedTaskId ? diagnosticsByTask.get(selectedTaskId) : undefined}
        labels={labels}
        loading={detailLoading}
        log={taskLog}
        onAddComment={(taskId, body) => runAction(async () => {
          if (staticDemo) addStaticComment(taskId, body)
          else await kanbanApi.addComment(taskId, body, { board: effectiveBoard })
        }, labels.commentAdded, { refresh: !staticDemo })}
        onAddLink={(parentId, childId) => runAction(async () => {
          if (staticDemo) addStaticLink(parentId, childId)
          else await kanbanApi.addLink(parentId, childId, { board: effectiveBoard })
        }, labels.taskLinkCreated, { refresh: !staticDemo })}
        onAssign={(taskId, assignee) => runAction(async () => {
          if (staticDemo) patchStaticTask(taskId, { assignee }, 'assigned')
          else await kanbanApi.updateTask(taskId, { assignee }, { board: effectiveBoard })
        }, labels.taskReassigned, { refresh: !staticDemo })}
        onClose={() => {
          setSelectedTaskId(null)
          setTaskDetail(null)
          setTaskLog(null)
        }}
        onDeleteLink={(parentId, childId) => runAction(async () => {
          if (staticDemo) deleteStaticLink(parentId, childId)
          else await kanbanApi.deleteLink(parentId, childId, { board: effectiveBoard })
        }, labels.taskLinkRemoved, { refresh: !staticDemo })}
        onLoadLog={loadLog}
        onOpenTask={setSelectedTaskId}
        onReassign={(taskId, profile, reclaimFirst, reason) => runAction(async () => {
          if (staticDemo) patchStaticTask(taskId, { assignee: profile }, reclaimFirst ? 'reassigned_with_reclaim' : 'reassigned')
          else await kanbanApi.reassignTask(taskId, { profile, reclaim_first: reclaimFirst, reason }, { board: effectiveBoard })
        }, labels.taskReassigned, { refresh: !staticDemo })}
        onReclaim={(taskId, reason) => runAction(async () => {
          if (staticDemo) patchStaticTask(taskId, { status: 'ready', latest_summary: reason }, 'reclaimed')
          else await kanbanApi.reclaimTask(taskId, { reason }, { board: effectiveBoard })
        }, labels.taskReclaimed, { refresh: !staticDemo })}
        onSetStatus={(taskId, status, extra) => runAction(async () => {
          if (staticDemo) patchStaticTask(taskId, { status, ...extra }, `status:${status}`)
          else await kanbanApi.updateTask(taskId, { status, ...extra }, { board: effectiveBoard })
        }, interpolate(labels.statusSetTo, { status: statusLabel(labels, status) }), { refresh: !staticDemo })}
        onSpecify={(taskId) => runAction(async () => {
          if (staticDemo) patchStaticTask(taskId, { status: 'ready', latest_summary: 'Demo specification refreshed and ready for dispatch.' }, 'specified')
          else await kanbanApi.specifyTask(taskId, { author: 'dashboard' }, { board: effectiveBoard })
        }, labels.taskSpecificationRefreshed, { refresh: !staticDemo })}
        open={Boolean(selectedTaskId)}
      />}

      {activeView === 'kanban' && showCreateTask && (
        <CreateTaskModal
          assignees={assignees}
          labels={labels}
          tenants={boardData?.tenants ?? []}
          onClose={() => setShowCreateTask(false)}
          onCreate={(input) => runAction(async () => {
            if (staticDemo) createStaticTask(input)
            else {
              const res = await kanbanApi.createTask(input, { board: effectiveBoard })
              if (res.warning) setNotice(res.warning)
            }
            setShowCreateTask(false)
          }, labels.taskCreated, { refresh: !staticDemo })}
        />
      )}

      {activeView === 'kanban' && showCreateBoard && (
        <CreateBoardModal
          labels={labels}
          onClose={() => setShowCreateBoard(false)}
          onCreate={(input) => runAction(async () => {
            if (staticDemo) {
              createStaticBoard(input)
              setShowCreateBoard(false)
              return
            }
            const res = await kanbanApi.createBoard(input)
            setShowCreateBoard(false)
            setSelectedBoard(res.board.slug)
            localStorage.setItem(STORAGE_BOARD_KEY, res.board.slug)
            await refreshAll(true, res.board.slug)
          }, labels.boardCreated, { refresh: false })}
        />
      )}

      {activeView === 'kanban' && showBoardManager && currentBoard && (
        <BoardManagerModal
          board={currentBoard}
          labels={labels}
          onArchive={(slug) => runAction(async () => {
            if (staticDemo) {
              deleteStaticBoard(slug, false)
              setShowBoardManager(false)
              return
            }
            await kanbanApi.deleteBoard(slug, false)
            setShowBoardManager(false)
            const res = await kanbanApi.getBoards(false)
            const next = res.current || res.boards[0]?.slug || 'default'
            setSelectedBoard(next)
            localStorage.setItem(STORAGE_BOARD_KEY, next)
            await refreshAll(true, next)
          }, labels.boardArchived, { refresh: false })}
          onClose={() => setShowBoardManager(false)}
          onDelete={(slug) => runAction(async () => {
            if (staticDemo) {
              deleteStaticBoard(slug, true)
              setShowBoardManager(false)
              return
            }
            await kanbanApi.deleteBoard(slug, true)
            setShowBoardManager(false)
            const res = await kanbanApi.getBoards(false)
            const next = res.current || res.boards[0]?.slug || 'default'
            setSelectedBoard(next)
            localStorage.setItem(STORAGE_BOARD_KEY, next)
            await refreshAll(true, next)
          }, labels.boardDeleted, { refresh: false })}
          onSave={(slug, input) => runAction(async () => {
            if (staticDemo) updateStaticBoard(slug, input)
            else await kanbanApi.updateBoard(slug, input)
            setShowBoardManager(false)
          }, labels.boardSettingsUpdated, { refresh: !staticDemo })}
        />
      )}
    </div>
  )
}

function Sidebar(props: {
  activeView: WorkspaceView
  activeTasks: number
  boards: KanbanBoard[]
  collapsed: boolean
  diagnosticCount: number
  eventCount: number
  labels: Labels
  modelChoices: ModelChoice[]
  modelSwitching: boolean
  runtimeModel: ModelChoice | null
  selectedBoard: string
  socketState: string
  stats: KanbanStats | null
  totalTasks: number
  onBoardChange: (slug: string) => void
  onCreateBoard: () => void
  onModelSwitch: (choice: ModelChoice) => void
  onToggleCollapsed: () => void
  onViewChange: (view: WorkspaceView) => void
}) {
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const navGroups: Array<{
    label: string
    items: Array<{ icon: typeof CircleDot; label: string; title: string; view: WorkspaceView }>
  }> = [
    {
      label: props.labels.navConversation,
      items: [{ icon: MessageSquare, label: props.labels.chat, title: props.labels.openChat, view: 'chat' }],
    },
    {
      label: props.labels.navWork,
      items: [
        { icon: UserRound, label: props.labels.profiles, title: props.labels.openProfiles, view: 'profiles' },
        { icon: SquareKanban, label: props.labels.kanban, title: props.labels.openKanban, view: 'kanban' },
      ],
    },
    {
      label: props.labels.navSystem,
      items: [{ icon: Settings2, label: props.labels.settings, title: props.labels.openSettings, view: 'settings' }],
    },
  ]
  const quickModels = props.modelChoices.slice(0, 12)
  const currentModelLabel = props.runtimeModel?.model || props.labels.notSet
  const currentProviderLabel = props.runtimeModel?.provider || props.labels.provider

  return (
    <aside className={`flex min-h-0 flex-col border-b border-[var(--console-line)] bg-[rgba(10,15,20,0.88)] p-3 transition-[width] lg:border-b-0 ${props.collapsed ? 'items-center' : ''}`}>
      <button
        className={`group flex w-full items-center gap-3 border-b border-[var(--console-line)] pb-3 text-left ${props.collapsed ? 'justify-center' : ''}`}
        onClick={props.onToggleCollapsed}
        title={props.collapsed ? props.labels.expandSidebar : props.labels.collapseSidebar}
        type="button"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[rgba(70,214,180,0.42)] bg-[var(--console-accent-soft)] transition group-hover:border-[rgba(70,214,180,0.72)]">
          <TerminalSquare className="h-5 w-5 text-[var(--console-accent)]" />
        </span>
        {!props.collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold uppercase tracking-[0.16em]">Hermes Console</span>
              <span className="block truncate text-xs text-[var(--console-muted)]">{props.labels.appSubtitle}</span>
            </span>
            <PanelLeftClose className="h-4 w-4 text-[var(--console-muted)]" />
          </>
        )}
        {props.collapsed && <PanelLeftOpen className="hidden h-4 w-4 text-[var(--console-muted)] lg:block" />}
      </button>

      <nav className={`flex min-h-0 flex-1 flex-col overflow-y-auto py-3 scrollbar-thin ${props.collapsed ? 'w-full items-center gap-2' : 'gap-4'}`}>
        {navGroups.map((group) => (
          <div className={`w-full ${props.collapsed ? 'space-y-2' : 'space-y-1'}`} key={group.label}>
            {!props.collapsed && (
              <div className="px-2 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[var(--console-faint)]">{group.label}</div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon
              const active = props.activeView === item.view
              return (
                <button
                  className={`button-base w-full justify-start px-3 ${props.collapsed ? 'h-11 w-11 px-0' : ''} ${active ? 'button-primary' : ''}`}
                  key={item.view}
                  onClick={() => props.onViewChange(item.view)}
                  title={item.title}
                  type="button"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!props.collapsed && <span>{item.label}</span>}
                </button>
              )
            })}
          </div>
        ))}

        {!props.collapsed && (
          <>
            <div className="grid grid-cols-2 gap-2 border-t border-[var(--console-line)] pt-4">
              <Metric label={props.labels.active} value={props.activeTasks} />
              <Metric label={props.labels.visible} value={props.totalTasks} />
              <Metric label={props.labels.diagnostics} value={props.diagnosticCount} />
              <Metric label={props.labels.events} value={props.eventCount} />
              <Metric label={props.labels.readyAge} value={formatAgeLabel(props.labels, props.stats?.oldest_ready_age_seconds)} wide />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[var(--console-muted)]">
                <span>{props.labels.boards}</span>
                <button className="button-base min-h-0 px-2 py-1 text-xs" onClick={props.onCreateBoard} title={props.labels.createBoard} type="button">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
                {props.boards.map((board) => (
                  <button
                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${props.selectedBoard === board.slug ? 'border-[rgba(70,214,180,0.55)] bg-[rgba(70,214,180,0.12)]' : 'border-[var(--console-line)] bg-[rgba(16,22,28,0.45)] hover:border-[rgba(70,214,180,0.36)]'}`}
                    key={board.slug}
                    onClick={() => props.onBoardChange(board.slug)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{boardDisplayName(board, props.labels)}</span>
                      <span className="font-mono text-xs text-[var(--console-muted)]">{board.total ?? 0}</span>
                    </div>
                    <div className="mt-1 truncate font-mono text-[0.68rem] text-[var(--console-faint)]">{board.slug}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </nav>

      <div className={`relative mt-auto border-t border-[var(--console-line)] pt-3 ${props.collapsed ? 'w-full' : ''}`}>
        <div className={`${props.collapsed ? 'mb-3 flex justify-center' : 'mb-3 space-y-2'}`}>
          {!props.collapsed && (
            <div className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[var(--console-faint)]">
              {props.labels.currentModel}
            </div>
          )}
          <button
            className={`button-base w-full min-w-0 justify-between px-3 ${props.collapsed ? 'h-11 w-11 justify-center px-0' : ''}`}
            disabled={quickModels.length === 0 || props.modelSwitching}
            onClick={() => setModelMenuOpen((open) => !open)}
            title={props.labels.switchModel}
            type="button"
          >
            {props.collapsed ? (
              props.modelSwitching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />
            ) : (
              <>
                <span className="min-w-0 text-left">
                  <span className="block truncate text-sm font-medium text-[var(--console-text)]">{currentModelLabel}</span>
                  <span className="block truncate font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[var(--console-muted)]">{currentProviderLabel}</span>
                </span>
                {props.modelSwitching ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <ChevronRight className={`h-4 w-4 shrink-0 transition ${modelMenuOpen ? 'rotate-90' : ''}`} />}
              </>
            )}
          </button>
          {modelMenuOpen && (
            <div className={`absolute bottom-16 z-30 w-72 rounded-xl border border-[rgba(70,214,180,0.28)] bg-[rgba(10,15,20,0.98)] p-2 shadow-2xl shadow-black/40 ${props.collapsed ? 'left-full ml-2' : 'left-0'}`}>
              <div className="mb-2 flex items-center justify-between border-b border-[var(--console-line)] px-2 pb-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[var(--console-muted)]">
                <span>{props.labels.modelCatalog}</span>
                <button className="rounded-md p-1 text-[var(--console-muted)] transition hover:bg-white/5 hover:text-[var(--console-text)]" onClick={() => setModelMenuOpen(false)} title={props.labels.cancel} type="button">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
                {quickModels.map((choice) => {
                  const active = sameModelChoice(props.runtimeModel, choice)
                  return (
                    <button
                      className={`w-full rounded-lg border px-3 py-2 text-left transition active:translate-y-px ${active ? 'border-[rgba(70,214,180,0.62)] bg-[rgba(70,214,180,0.12)]' : 'border-[var(--console-line)] bg-[rgba(16,22,28,0.5)] hover:border-[rgba(70,214,180,0.38)]'}`}
                      key={modelChoiceKey(choice)}
                      onClick={() => {
                        props.onModelSwitch(choice)
                        setModelMenuOpen(false)
                      }}
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{choice.model}</span>
                        {active && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--console-accent)]" />}
                      </div>
                      <div className="mt-1 truncate font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[var(--console-faint)]">{choice.provider}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div className={`flex items-center text-xs text-[var(--console-muted)] ${props.collapsed ? 'justify-center' : 'justify-between'}`}>
          <span className="inline-flex items-center gap-2">
            <Signal className={`h-3.5 w-3.5 ${props.socketState === 'open' ? 'text-[var(--console-accent)]' : 'text-[var(--console-warning)]'}`} />
            {!props.collapsed && props.labels.eventStream}
          </span>
          {!props.collapsed && <span className="font-mono">{streamStateLabel(props.labels, props.socketState)}</span>}
        </div>
      </div>
    </aside>
  )
}

type ChatConnectionState = 'connecting' | 'open' | 'closed' | 'error'

function StaticPreviewPanel({ labels, onUseDemo }: { labels: Labels; onUseDemo?: () => void }) {
  return (
    <section className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-4 scrollbar-thin lg:p-8">
      <div className="w-full max-w-3xl rounded-2xl border border-[rgba(70,214,180,0.32)] bg-[rgba(16,22,28,0.68)] p-6 shadow-2xl shadow-black/20">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--console-accent)]">
          <Signal className="h-4 w-4" />
          {labels.staticPreviewTitle}
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">{labels.appSubtitle}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--console-muted)]">{labels.staticPreviewMessage}</p>
        <pre className="mt-5 overflow-x-auto rounded-lg border border-[var(--console-line)] bg-[#070b0f] p-3 font-mono text-xs text-[var(--console-muted)]">cd D:\git-workspace\AI\hermes\hermes-kanban{'\n'}npm run dev -- --host 0.0.0.0</pre>
        {onUseDemo && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="button-base button-primary" onClick={onUseDemo} type="button">
              <Blocks className="h-4 w-4" />
              {labels.staticPreviewDemoButton}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function StaticPreviewPrompt(props: { labels: Labels; onClose: () => void; onUseDemo: () => void }) {
  return (
    <Modal title={props.labels.staticPreviewDialogTitle} onClose={props.onClose}>
      <div className="space-y-4">
        <div className="rounded-lg border border-[rgba(70,214,180,0.28)] bg-[rgba(70,214,180,0.08)] p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--console-accent)]">
            <Signal className="h-4 w-4" />
            {props.labels.staticPreviewTitle}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--console-muted)]">{props.labels.staticPreviewDialogBody}</p>
        </div>
        <pre className="overflow-x-auto rounded-lg border border-[var(--console-line)] bg-[#070b0f] p-3 font-mono text-xs text-[var(--console-muted)]">cd D:\git-workspace\AI\hermes\hermes-kanban{'\n'}npm run dev -- --host 0.0.0.0</pre>
        <div className="flex flex-wrap justify-end gap-2">
          <button className="button-base" onClick={props.onClose} type="button">{props.labels.staticPreviewSetupButton}</button>
          <button className="button-base button-primary" onClick={props.onUseDemo} type="button">
            <Blocks className="h-4 w-4" />
            {props.labels.staticPreviewDemoButton}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ProfilesWorkspace({ labels, staticDemo, staticPreview }: { labels: Labels; staticDemo: boolean; staticPreview: boolean }) {
  const [profiles, setProfiles] = useState<StaticDemoProfile[] | DashboardProfileInfo[]>(() => staticDemo ? readStaticDemoProfiles() : [])
  const [loading, setLoading] = useState(!staticPreview)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showCreateProfile, setShowCreateProfile] = useState(false)
  const [soulTarget, setSoulTarget] = useState<DashboardProfileInfo | null>(null)
  const [soulText, setSoulText] = useState('')
  const [soulLoading, setSoulLoading] = useState(false)

  const refreshProfiles = useCallback(async () => {
    if (staticPreview) {
      if (staticDemo) {
        setProfiles(readStaticDemoProfiles())
        setNotice(labels.staticPreviewDemoNotice)
      }
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await dashboardApi.getProfiles()
      setProfiles([...res.profiles].sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name)))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [labels.staticPreviewDemoNotice, staticDemo, staticPreview])

  useEffect(() => {
    if (staticPreview) {
      if (staticDemo) {
        const timer = window.setTimeout(() => setProfiles(readStaticDemoProfiles()), 0)
        return () => window.clearTimeout(timer)
      }
      return undefined
    }
    const timer = window.setTimeout(() => {
      void refreshProfiles()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshProfiles, staticDemo, staticPreview])

  async function createProfile(input: { name: string; clone_from_default?: boolean; no_skills?: boolean; soul?: string }) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const { soul, ...profileInput } = input
      if (staticDemo) {
        const current = readStaticDemoProfiles()
        if (current.some((profile) => profile.name === profileInput.name)) throw new Error(`Profile ${profileInput.name} already exists`)
        const base = profileInput.clone_from_default ? current.find((profile) => profile.is_default) : null
        const next: StaticDemoProfile[] = [...current, {
          name: profileInput.name,
          path: `profiles/${profileInput.name}/SOUL.md`,
          is_default: false,
          provider: base?.provider ?? 'OpenAI',
          model: base?.model ?? 'gpt-5.4',
          has_env: Boolean(base?.has_env),
          skill_count: profileInput.no_skills ? 0 : (base?.skill_count ?? 0),
          soul: soul?.trim() || [`# ${profileInput.name}`, '', '请在这里定义这个角色的职责、边界和协作方式。'].join('\n'),
        }]
        writeStaticDemoProfiles(next)
        setProfiles(next)
        setShowCreateProfile(false)
        setNotice(labels.profileCreated)
        return
      }
      const created = await dashboardApi.createProfile(profileInput)
      if (soul?.trim()) await dashboardApi.updateProfileSoul(created.name, soul.trim())
      setShowCreateProfile(false)
      setNotice(labels.profileCreated)
      await refreshProfiles()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function openSoul(profile: DashboardProfileInfo) {
    setSoulTarget(profile)
    setSoulText('')
    setSoulLoading(true)
    setError(null)
    try {
      if (staticDemo) {
        const demoProfile = readStaticDemoProfiles().find((item) => item.name === profile.name)
        setSoulText(demoProfile?.soul ?? '')
        return
      }
      const res = await dashboardApi.getProfileSoul(profile.name)
      setSoulText(res.content)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSoulLoading(false)
    }
  }

  async function saveSoul() {
    if (!soulTarget) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (staticDemo) {
        const next = readStaticDemoProfiles().map((profile) => profile.name === soulTarget.name ? { ...profile, soul: soulText } : profile)
        writeStaticDemoProfiles(next)
        setProfiles(next)
        setSoulTarget(null)
        setNotice(labels.profileSoulSaved)
        return
      }
      await dashboardApi.updateProfileSoul(soulTarget.name, soulText)
      setSoulTarget(null)
      setNotice(labels.profileSoulSaved)
      await refreshProfiles()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function deleteProfile(profile: DashboardProfileInfo) {
    if (profile.is_default) return
    if (!window.confirm(interpolate(labels.profileDeleteConfirm, { name: profile.name }))) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (staticDemo) {
        const next = readStaticDemoProfiles().filter((item) => item.name !== profile.name)
        writeStaticDemoProfiles(next)
        setProfiles(next)
        setNotice(labels.profileDeleted)
        return
      }
      await dashboardApi.deleteProfile(profile.name)
      setNotice(labels.profileDeleted)
      await refreshProfiles()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (staticPreview && !staticDemo) {
    return <StaticPreviewPanel labels={labels} />
  }

  return (
    <section className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin lg:p-6">
      <div className="flex w-full max-w-[1500px] flex-col gap-4">
        <header className="flex flex-col justify-between gap-3 border-b border-[var(--console-line)] pb-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--console-accent)]">
              <UserRound className="h-4 w-4" />
              {labels.profileManagement}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal">{labels.profiles}</h1>
            <p className="mt-1 text-sm text-[var(--console-muted)]">{labels.profilesSubtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="button-base" disabled={loading || busy} onClick={() => void refreshProfiles()} type="button">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {labels.refresh}
            </button>
            <button className="button-base button-primary" disabled={busy} onClick={() => setShowCreateProfile(true)} type="button">
              <UserPlus className="h-4 w-4" />
              {labels.newProfile}
            </button>
          </div>
        </header>

        {error && <ErrorBanner message={error} />}
        {staticDemo && <Notice message={labels.staticPreviewDemoNotice} onClose={() => undefined} />}
        {notice && <Notice message={notice} onClose={() => setNotice(null)} />}

        {loading ? (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="skeleton h-44 rounded-lg" />
            <div className="skeleton h-44 rounded-lg" />
            <div className="skeleton h-44 rounded-lg" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="border border-dashed border-[var(--console-line)] p-10 text-center text-sm text-[var(--console-muted)]">
            {labels.noProfilesYet}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {profiles.map((profile) => (
              <article className="border border-[var(--console-line)] bg-[rgba(16,22,28,0.5)] p-4" key={profile.name}>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-mono text-lg font-semibold text-[var(--console-text)]">{profile.name}</h2>
                      {profile.is_default && <span className="border border-[rgba(70,214,180,0.36)] px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.16em] text-[var(--console-accent)]">{labels.defaultProfile}</span>}
                    </div>
                    <div className="mt-1 truncate text-xs text-[var(--console-muted)]">{profile.path}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button className="button-base min-h-0 px-3 py-1.5 text-xs" disabled={busy} onClick={() => void openSoul(profile)} type="button">
                      <Pencil className="h-3.5 w-3.5" />
                      {labels.editSoul}
                    </button>
                    <button className="button-base min-h-0 px-3 py-1.5 text-xs" disabled={busy || profile.is_default} onClick={() => void deleteProfile(profile)} type="button">
                      <Trash2 className="h-3.5 w-3.5" />
                      {labels.delete}
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <Info label={labels.provider} value={profile.provider || labels.notSet} />
                  <Info label={labels.model} value={profile.model || labels.notSet} />
                  <Info label={labels.skillCount} value={String(profile.skill_count ?? 0)} />
                  <Info label={labels.envFile} value={profile.has_env ? labels.visible : labels.notSet} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showCreateProfile && (
        <CreateProfileModal
          labels={labels}
          onClose={() => setShowCreateProfile(false)}
          onCreate={createProfile}
        />
      )}

      {soulTarget && (
        <Modal title={`${labels.profileSoul} / ${soulTarget.name}`} onClose={() => setSoulTarget(null)}>
          <div className="space-y-4">
            {soulLoading ? (
              <div className="skeleton h-96 rounded-lg" />
            ) : (
              <Field label={labels.profileInstructions}>
                <textarea className="control min-h-[28rem] w-full resize-y" onChange={(event) => setSoulText(event.target.value)} value={soulText} />
              </Field>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button className="button-base" onClick={() => setSoulTarget(null)} type="button">{labels.cancel}</button>
              <button className="button-base button-primary" disabled={busy || soulLoading} onClick={() => void saveSoul()} type="button">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {labels.save}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}

function createChatChannel() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${CHAT_CHANNEL_PREFIX}-${crypto.randomUUID()}`
  }
  return `${CHAT_CHANNEL_PREFIX}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

function buildPtySocketUrl(token: string, channel: string) {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const qs = new URLSearchParams({ token, channel })
  return `${proto}//${window.location.host}/api/pty?${qs.toString()}`
}

function terminalFontSize(width: number) {
  if (width < 420) return 10
  if (width < 720) return 11
  if (width < 1120) return 12
  return 14
}

function SettingsWorkspace(props: {
  labels: Labels
  language: Language
  modelChoices: ModelChoice[]
  modelSwitching: boolean
  runtimeModel: ModelChoice | null
  staticPreview: boolean
  onAddModel: (choice: ModelChoice) => void
  onLanguageChange: (language: Language) => void
  onRefreshRuntimeModels: () => Promise<void>
  onSwitchModel: (choice: ModelChoice) => Promise<void>
}) {
  const [modelInfo, setModelInfo] = useState<DashboardModelInfo | null>(null)
  const [modelOptions, setModelOptions] = useState<DashboardModelOptions | null>(null)
  const [status, setStatus] = useState<DashboardStatusResponse | null>(null)
  const [sessions, setSessions] = useState<DashboardSessionInfo[]>([])
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [selectedStatsKey, setSelectedStatsKey] = useState('total')
  const [showAddModel, setShowAddModel] = useState(false)
  const [newProvider, setNewProvider] = useState('custom')
  const [newModel, setNewModel] = useState('')
  const [loading, setLoading] = useState(!props.staticPreview)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const providers = modelOptions?.providers ?? []
  const selectedProvider = providers.find((item) => item.slug === provider || item.name === provider)
  const providerModelChoices = selectedProvider?.models ?? []
  const allModelChoices = useMemo(() => buildModelChoices(modelInfo, modelOptions, props.modelChoices, sessions), [modelInfo, modelOptions, props.modelChoices, sessions])
  const selectedStatsChoice = selectedStatsKey === 'total' ? null : allModelChoices.find((choice) => modelChoiceKey(choice) === selectedStatsKey) ?? null
  const selectedStats = useMemo(() => summarizeSessions(sessions, selectedStatsChoice), [selectedStatsChoice, sessions])
  const totalStats = useMemo(() => summarizeSessions(sessions), [sessions])
  const displayedStats = selectedStatsChoice ? selectedStats : totalStats

  const refreshSettings = useCallback(async () => {
    if (props.staticPreview) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [nextInfo, nextOptions, nextStatus, nextSessions] = await Promise.all([
        dashboardApi.getModelInfo(),
        dashboardApi.getModelOptions(),
        dashboardApi.getStatus(),
        dashboardApi.getSessions(100, 0).catch(() => ({ sessions: [] as DashboardSessionInfo[] })),
      ])
      setModelInfo(nextInfo)
      setModelOptions(nextOptions)
      setStatus(nextStatus)
      setSessions(nextSessions.sessions)
      setProvider(nextInfo.provider || nextOptions.provider || 'custom')
      setModel(nextInfo.model || nextOptions.model || '')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [props.staticPreview])

  useEffect(() => {
    if (props.staticPreview) return undefined
    const timer = window.setTimeout(() => {
      void refreshSettings()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [props.staticPreview, refreshSettings])

  function chooseProvider(nextProvider: string) {
    setProvider(nextProvider)
    const nextOption = providers.find((item) => item.slug === nextProvider || item.name === nextProvider)
    if (!nextOption?.models?.length) return
    setModel((current) => nextOption.models?.includes(current) ? current : nextOption.models?.[0] ?? current)
  }

  async function saveModel() {
    if (!provider.trim() || !model.trim()) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await props.onSwitchModel({ provider: provider.trim(), model: model.trim(), source: 'custom' })
      setNotice(props.labels.modelSaved)
      await props.onRefreshRuntimeModels()
      await refreshSettings()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function addModel() {
    const nextChoice = normalizeModelChoice({ provider: newProvider, model: newModel, source: 'custom' })
    if (!nextChoice) return
    props.onAddModel(nextChoice)
    setProvider(nextChoice.provider)
    setModel(nextChoice.model)
    setSelectedStatsKey(modelChoiceKey(nextChoice))
    setShowAddModel(false)
    setNewProvider('custom')
    setNewModel('')
  }

  async function applyModelChoice(choice: ModelChoice) {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await props.onSwitchModel(choice)
      setProvider(choice.provider)
      setModel(choice.model)
      setSelectedStatsKey(modelChoiceKey(choice))
      setNotice(props.labels.modelSaved)
      await refreshSettings()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin lg:p-6">
      <div className="flex w-full max-w-[1500px] flex-col gap-4">
        <header className="border-b border-[var(--console-line)] pb-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--console-accent)]">
            <Settings2 className="h-4 w-4" />
            {props.labels.settings}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">{props.labels.settings}</h1>
          <p className="mt-1 text-sm text-[var(--console-muted)]">{props.labels.settingsSubtitle}</p>
        </header>

        {error && <ErrorBanner message={error} />}
        {props.staticPreview && <Notice message={props.labels.staticPreviewMessage} onClose={() => undefined} />}
        {notice && <Notice message={notice} onClose={() => setNotice(null)} />}

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <Panel title={props.labels.language}>
              <div className="flex flex-wrap gap-2">
                {(['en', 'zh'] as Language[]).map((item) => (
                  <button
                    className={`button-base ${props.language === item ? 'button-primary' : ''}`}
                    key={item}
                    onClick={() => props.onLanguageChange(item)}
                    type="button"
                  >
                    <Languages className="h-4 w-4" />
                    {item === 'en' ? 'English' : '中文'}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm text-[var(--console-muted)]">{props.labels.languageHelp}</p>
            </Panel>

            <Panel
              action={(
                <button className="button-base min-h-0 px-3 py-1.5 text-xs" onClick={() => setShowAddModel((open) => !open)} type="button">
                  <Plus className="h-3.5 w-3.5" />
                  {props.labels.addModel}
                </button>
              )}
              title={props.labels.hermesModel}
            >
              {loading ? (
                <div className="space-y-3">
                  <div className="skeleton h-10 rounded-lg" />
                  <div className="skeleton h-32 rounded-lg" />
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="skeleton h-44 rounded-lg" />
                    <div className="skeleton h-44 rounded-lg" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border border-[var(--console-line)] bg-[rgba(7,12,16,0.54)]">
                    <div className="flex flex-col gap-3 border-b border-[var(--console-line)] p-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--console-muted)]">
                          <Wand2 className="h-3.5 w-3.5 text-[var(--console-accent)]" />
                          {props.labels.main} <span className="text-[var(--console-faint)]">{props.labels.appliesToNewSessions}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-baseline gap-2">
                          <span className="truncate text-lg font-semibold">{props.runtimeModel?.model || model || props.labels.notSet}</span>
                          <span className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--console-muted)]">{props.runtimeModel?.provider || provider || props.labels.provider}</span>
                        </div>
                      </div>
                      <button className="button-base button-primary self-start md:self-auto" disabled={saving || props.modelSwitching || !provider.trim() || !model.trim()} onClick={() => void saveModel()} type="button">
                        {saving || props.modelSwitching ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {props.labels.saveModel}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
                      <Field label={props.labels.provider}>
                        <select className="control w-full" onChange={(event) => chooseProvider(event.target.value)} value={provider}>
                          {providers.map((item) => (
                            <option key={item.slug || item.name} value={item.slug || item.name}>{item.name || item.slug}</option>
                          ))}
                          <option value="custom">{props.labels.custom}</option>
                        </select>
                      </Field>
                      <Field label={props.labels.model}>
                        {providerModelChoices.length ? (
                          <select className="control w-full" onChange={(event) => setModel(event.target.value)} value={model}>
                            {providerModelChoices.map((item) => <option key={item} value={item}>{item}</option>)}
                            {!providerModelChoices.includes(model) && model && <option value={model}>{model}</option>}
                          </select>
                        ) : (
                          <input className="control w-full font-mono" onChange={(event) => setModel(event.target.value)} placeholder={props.labels.modelPlaceholder} value={model} />
                        )}
                      </Field>
                      <Field label={props.labels.customProvider}>
                        <input className="control w-full font-mono" onChange={(event) => setProvider(event.target.value)} placeholder={props.labels.providerPlaceholder} value={provider} />
                      </Field>
                      <Field label={props.labels.customModel}>
                        <input className="control w-full font-mono" onChange={(event) => setModel(event.target.value)} placeholder={props.labels.modelPlaceholder} value={model} />
                      </Field>
                    </div>
                  </div>

                  {providers.length === 0 && (
                    <div className="border border-[rgba(216,180,92,0.28)] bg-[rgba(216,180,92,0.08)] p-3 text-sm text-[var(--console-warning)]">
                      {props.labels.modelOptionsEmpty}
                    </div>
                  )}

                  <ModelStatsPanel
                    caption={selectedStatsChoice ? `${selectedStatsChoice.provider} / ${selectedStatsChoice.model}` : props.labels.modelStatsTotal}
                    labels={props.labels}
                    stats={displayedStats}
                    title={selectedStatsChoice ? props.labels.modelStatsSelected : props.labels.totalStats}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold">{props.labels.modelCatalog}</h3>
                      <p className="mt-1 text-xs text-[var(--console-muted)]">{props.labels.selectModelForStats}</p>
                    </div>
                    <button className="button-base min-h-0 px-3 py-1.5 text-xs" disabled={loading} onClick={() => void refreshSettings()} type="button">
                      <RefreshCw className="h-3.5 w-3.5" />
                      {props.labels.refresh}
                    </button>
                  </div>

                  {showAddModel && (
                    <div className="border border-[rgba(70,214,180,0.24)] bg-[rgba(70,214,180,0.06)] p-4">
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold">{props.labels.addModel}</h3>
                        <p className="mt-1 text-xs text-[var(--console-muted)]">{props.labels.addModelHelp}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                        <Field label={props.labels.provider}>
                          <input className="control w-full font-mono" onChange={(event) => setNewProvider(event.target.value)} placeholder={props.labels.providerPlaceholder} value={newProvider} />
                        </Field>
                        <Field label={props.labels.model}>
                          <input className="control w-full font-mono" onChange={(event) => setNewModel(event.target.value)} placeholder={props.labels.modelPlaceholder} value={newModel} />
                        </Field>
                        <button className="button-base button-primary" disabled={!newProvider.trim() || !newModel.trim()} onClick={addModel} type="button">
                          <Plus className="h-4 w-4" />
                          {props.labels.addModel}
                        </button>
                      </div>
                    </div>
                  )}

                  {allModelChoices.length === 0 ? (
                    <div className="border border-dashed border-[var(--console-line)] p-8 text-center text-sm text-[var(--console-muted)]">
                      {props.labels.modelOptionsEmpty}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                      {allModelChoices.map((choice, index) => (
                        <ModelChoiceCard
                          active={sameModelChoice(props.runtimeModel, choice)}
                          choice={choice}
                          index={index}
                          key={modelChoiceKey(choice)}
                          labels={props.labels}
                          selected={selectedStatsKey === modelChoiceKey(choice)}
                          stats={summarizeSessions(sessions, choice)}
                          switching={saving || props.modelSwitching}
                          onSelect={() => setSelectedStatsKey(modelChoiceKey(choice))}
                          onUse={() => void applyModelChoice(choice)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Panel>
          </div>

          <aside className="space-y-3">
            <Info label={props.labels.currentModel} value={modelInfo?.model || model || props.labels.notSet} />
            <Info label={props.labels.provider} value={modelInfo?.provider || provider || props.labels.notSet} />
            <Info label={props.labels.context} value={modelInfo?.effective_context_length ? String(modelInfo.effective_context_length) : props.labels.unknown} />
            <Info label={props.labels.gateway} value={status?.gateway_state || props.labels.unknown} />
            <Info label={props.labels.version} value={status?.version || props.labels.unknown} />
          </aside>
        </div>
      </div>
    </section>
  )
}

function ModelStatsPanel(props: {
  caption: string
  labels: Labels
  stats: ModelUsageStats
  title: string
}) {
  const total = props.stats.totalTokens || 1
  const inputWidth = Math.max(0, Math.min(100, (props.stats.inputTokens / total) * 100))
  const outputWidth = Math.max(0, Math.min(100, (props.stats.outputTokens / total) * 100))
  return (
    <div className="border border-[var(--console-line)] bg-[rgba(8,18,18,0.58)] p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--console-muted)]">{props.labels.modelStats}</div>
          <h3 className="mt-1 text-base font-semibold">{props.title}</h3>
        </div>
        <div className="max-w-full truncate font-mono text-xs uppercase tracking-[0.12em] text-[var(--console-accent)]">{props.caption}</div>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-[rgba(148,163,184,0.16)]">
        <div className="flex h-full">
          <span className="block h-full bg-[rgba(74,144,226,0.82)]" style={{ width: `${inputWidth}%` }} />
          <span className="block h-full bg-[rgba(70,214,180,0.86)]" style={{ width: `${outputWidth}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
        <Metric label={props.labels.tokenCount} value={formatCompactNumber(props.stats.totalTokens)} />
        <Metric label={props.labels.inputTokens} value={formatCompactNumber(props.stats.inputTokens)} />
        <Metric label={props.labels.outputTokens} value={formatCompactNumber(props.stats.outputTokens)} />
        <Metric label={props.labels.totalSessions} value={props.stats.sessionCount} />
        <Metric label={props.labels.apiCalls} value={formatCompactNumber(props.stats.apiCalls)} />
        <Metric label={props.labels.modelCount} value={props.stats.modelCount} />
      </div>
    </div>
  )
}

function ModelChoiceCard(props: {
  active: boolean
  choice: ModelChoice
  index: number
  labels: Labels
  selected: boolean
  stats: ModelUsageStats
  switching: boolean
  onSelect: () => void
  onUse: () => void
}) {
  const total = props.stats.totalTokens || 1
  const inputWidth = Math.max(0, Math.min(100, (props.stats.inputTokens / total) * 100))
  const outputWidth = Math.max(0, Math.min(100, (props.stats.outputTokens / total) * 100))
  return (
    <article
      className={`group cursor-pointer border p-4 transition active:translate-y-px ${props.selected ? 'border-[rgba(70,214,180,0.72)] bg-[rgba(70,214,180,0.1)]' : 'border-[var(--console-line)] bg-[rgba(12,18,24,0.66)] hover:border-[rgba(70,214,180,0.36)]'} ${props.active ? 'shadow-[inset_3px_0_0_rgba(70,214,180,0.82)]' : ''}`}
      onClick={props.onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') props.onSelect()
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--console-muted)]">
            <span>#{props.index + 1}</span>
            <span className="rounded border border-[var(--console-line)] px-1.5 py-0.5 font-mono">{props.choice.provider}</span>
            {props.active && <span className="rounded border border-[rgba(70,214,180,0.5)] px-1.5 py-0.5 text-[var(--console-accent)]">{props.labels.main}</span>}
          </div>
          <h3 className="mt-2 truncate text-base font-semibold">{props.choice.model}</h3>
        </div>
        <button
          className="button-base min-h-0 shrink-0 px-2.5 py-1.5 text-xs"
          disabled={props.active || props.switching}
          onClick={(event) => {
            event.stopPropagation()
            props.onUse()
          }}
          type="button"
        >
          {props.switching && !props.active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {props.active ? props.labels.main : props.labels.useAsMain}
        </button>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[rgba(148,163,184,0.16)]">
        <div className="flex h-full">
          <span className="block h-full bg-[rgba(74,144,226,0.76)] transition-[width]" style={{ width: `${inputWidth}%` }} />
          <span className="block h-full bg-[rgba(70,214,180,0.86)] transition-[width]" style={{ width: `${outputWidth}%` }} />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-[var(--console-muted)]">
        <span>{props.labels.inputTokens} {formatCompactNumber(props.stats.inputTokens)}</span>
        <span>{props.labels.outputTokens} {formatCompactNumber(props.stats.outputTokens)}</span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="font-mono text-sm font-semibold">{props.stats.sessionCount}</div>
          <div className="mt-1 text-[0.65rem] uppercase tracking-[0.12em] text-[var(--console-faint)]">{props.labels.sessions}</div>
        </div>
        <div>
          <div className="font-mono text-sm font-semibold">{formatCompactNumber(props.stats.totalTokens)}</div>
          <div className="mt-1 text-[0.65rem] uppercase tracking-[0.12em] text-[var(--console-faint)]">{props.labels.tokenCount}</div>
        </div>
        <div>
          <div className="font-mono text-sm font-semibold">{formatCompactNumber(props.stats.apiCalls)}</div>
          <div className="mt-1 text-[0.65rem] uppercase tracking-[0.12em] text-[var(--console-faint)]">{props.labels.apiCalls}</div>
        </div>
      </div>
    </article>
  )
}

function ChatWorkspace({ labels, staticPreview }: { labels: Labels; staticPreview: boolean }) {
  if (staticPreview) return <StaticPreviewPanel labels={labels} />
  return window.__HERMES_DASHBOARD_EMBEDDED_CHAT__ ? <PtyChatWorkspace /> : <GatewayChatWorkspace labels={labels} />
}

type GatewayMessageRole = 'user' | 'assistant' | 'system' | 'tool'
type GatewayChatMessage = {
  id: string
  role: GatewayMessageRole
  content: string
  timestamp: number
  isStreaming?: boolean
  reasoning?: string
  toolArgs?: string
  toolCallId?: string
  toolDuration?: number
  toolName?: string
  toolPreview?: string
  toolResult?: string
  toolStatus?: 'running' | 'done' | 'error'
}
type GatewayChatSession = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: GatewayChatMessage[]
}
type GatewayRunEvent = {
  event?: string
  run_id?: string
  delta?: string
  text?: string
  tool?: string
  name?: string
  preview?: string
  arguments?: string
  tool_call_id?: string
  duration?: number
  output?: string
  error?: string
  choices?: string[]
  parsed_content?: string
  parsed_reasoning?: string
}
type ApprovalRequest = {
  runId: string
  choices: string[]
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}_${crypto.randomUUID()}`
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function createGatewaySessionId() {
  return createId('kanban_chat')
}

function createGatewaySessionRecord(id = createGatewaySessionId()): GatewayChatSession {
  const now = Date.now()
  return {
    id,
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
}

function deriveGatewaySessionTitle(messages: GatewayChatMessage[]) {
  const firstUser = messages.find((message) => message.role === 'user' && message.content.trim())
  if (!firstUser) return 'New chat'
  const oneLine = firstUser.content.replace(/\s+/g, ' ').trim()
  return oneLine.length > 42 ? `${oneLine.slice(0, 42)}...` : oneLine
}

function sanitizeGatewaySessionRecord(value: unknown): GatewayChatSession | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<GatewayChatSession>
  if (!record.id || typeof record.id !== 'string') return null
  const messages = Array.isArray(record.messages)
    ? record.messages.filter((message): message is GatewayChatMessage => (
      Boolean(message)
      && typeof message === 'object'
      && typeof (message as GatewayChatMessage).id === 'string'
      && typeof (message as GatewayChatMessage).content === 'string'
    ))
    : []
  return {
    id: record.id,
    title: typeof record.title === 'string' && record.title.trim() ? record.title : deriveGatewaySessionTitle(messages),
    createdAt: typeof record.createdAt === 'number' ? record.createdAt : Date.now(),
    updatedAt: typeof record.updatedAt === 'number' ? record.updatedAt : Date.now(),
    messages,
  }
}

function loadGatewaySessionRecords(): GatewayChatSession[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_GATEWAY_SESSIONS_KEY) || '[]') as unknown[]
    const sessions = parsed.map(sanitizeGatewaySessionRecord).filter((item): item is GatewayChatSession => Boolean(item))
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30)
  } catch {
    return []
  }
}

function createInitialGatewayState() {
  const loaded = loadGatewaySessionRecords()
  const savedId = localStorage.getItem(STORAGE_GATEWAY_SESSION_KEY) || ''
  const active = loaded.find((session) => session.id === savedId) || loaded[0] || createGatewaySessionRecord(savedId || undefined)
  const sessions = loaded.some((session) => session.id === active.id) ? loaded : [active, ...loaded]
  return { sessionId: active.id, sessions }
}

function loadGatewayPinnedSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_GATEWAY_PINNED_KEY) || '[]') as unknown[]
    return new Set(parsed.filter((item): item is string => typeof item === 'string'))
  } catch {
    return new Set<string>()
  }
}

function sortGatewaySessions(sessions: GatewayChatSession[]) {
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30)
}

function safeDownloadName(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  return cleaned || 'hermes-chat'
}

function gatewaySessionToMarkdown(session: GatewayChatSession) {
  const lines = [
    `# ${session.title}`,
    '',
    `Session: ${session.id}`,
    `Created: ${new Date(session.createdAt).toLocaleString()}`,
    `Updated: ${new Date(session.updatedAt).toLocaleString()}`,
    '',
  ]
  for (const message of session.messages) {
    lines.push(`## ${message.role}`)
    lines.push('')
    lines.push(message.content || '')
    lines.push('')
  }
  return lines.join('\n')
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function toolMessageContent(input: {
  args?: string
  name?: string
  output?: string
  preview?: string
  status?: string
}) {
  const lines = [`Tool ${input.status || 'event'}: ${input.name || 'tool'}`]
  if (input.preview) lines.push(`Preview: ${input.preview}`)
  if (input.args) lines.push('', 'Arguments:', input.args)
  if (input.output) lines.push('', 'Output:', input.output)
  return lines.join('\n')
}

function dashboardMessageToGateway(message: DashboardSessionMessage, index: number): GatewayChatMessage[] {
  const timestamp = Math.round((message.timestamp ?? Date.now() / 1000) * 1000)
  const rows: GatewayChatMessage[] = []
  if (message.role === 'assistant' && message.tool_calls?.length && !message.content?.trim()) {
    for (const call of message.tool_calls) {
      rows.push({
        id: `server_tool_${index}_${call.id}`,
        role: 'tool',
        content: toolMessageContent({
          args: call.function?.arguments,
          name: call.function?.name,
          status: 'called',
        }),
        timestamp,
        toolArgs: call.function?.arguments,
        toolCallId: call.id,
        toolName: call.function?.name,
        toolStatus: 'done',
      })
    }
    return rows
  }
  rows.push({
    id: `server_msg_${index}_${timestamp}`,
    role: message.role,
    content: message.content || '',
    timestamp,
    reasoning: message.reasoning || message.reasoning_content || undefined,
    toolCallId: message.tool_call_id,
    toolName: message.tool_name,
    toolResult: message.role === 'tool' ? message.content || '' : undefined,
    toolStatus: message.role === 'tool' ? 'done' : undefined,
  })
  return rows
}

function dashboardSessionToGateway(info: DashboardSessionInfo, messages: DashboardSessionMessage[]): GatewayChatSession {
  const mappedMessages = messages.flatMap(dashboardMessageToGateway).filter((message) => (
    message.role === 'tool' || message.content.trim()
  ))
  const title = info.title || info.preview || deriveGatewaySessionTitle(mappedMessages)
  return {
    id: info.id,
    title: title || 'Dashboard session',
    createdAt: Math.round(info.started_at * 1000),
    updatedAt: Math.round((info.last_active || info.ended_at || info.started_at) * 1000),
    messages: mappedMessages,
  }
}

function mergeGatewaySessions(current: GatewayChatSession[], incoming: GatewayChatSession[]) {
  const byId = new Map(current.map((session) => [session.id, session]))
  for (const session of incoming) {
    const existing = byId.get(session.id)
    if (!existing) {
      byId.set(session.id, session)
      continue
    }
    byId.set(session.id, {
      ...existing,
      title: session.title || existing.title,
      createdAt: Math.min(existing.createdAt, session.createdAt),
      updatedAt: Math.max(existing.updatedAt, session.updatedAt),
      messages: session.messages.length ? session.messages : existing.messages,
    })
  }
  return sortGatewaySessions(Array.from(byId.values()))
}

function normalizeGatewayUrl(url: string) {
  const value = url.trim() || '/gateway'
  if (value === '/') return ''
  return value.replace(/\/+$/, '')
}

function gatewayHeaders(apiKey: string, sessionId?: string, json = true) {
  const headers: Record<string, string> = {}
  if (json) headers['Content-Type'] = 'application/json'
  if (apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`
    if (sessionId) headers['X-Hermes-Session-Key'] = sessionId
  }
  return headers
}

function shouldUseBrowserApiKey(base: string) {
  return Boolean(base)
}

async function readGatewayEventStream(response: Response, onEvent: (event: GatewayRunEvent) => void) {
  if (!response.body) throw new Error('Gateway did not return a readable event stream.')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const flushBlock = (block: string) => {
    const payload = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim()
    if (!payload || payload === '[DONE]') return
    onEvent(JSON.parse(payload) as GatewayRunEvent)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() ?? ''
    for (const block of blocks) flushBlock(block)
  }
  buffer += decoder.decode()
  if (buffer.trim()) flushBlock(buffer)
}

function GatewayChatWorkspace({ labels }: { labels: Labels }) {
  const [initialGatewayState] = useState(createInitialGatewayState)
  const [gatewayUrl, setGatewayUrl] = useState(() => localStorage.getItem(STORAGE_GATEWAY_URL_KEY) || '/gateway')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_GATEWAY_KEY_KEY) || localStorage.getItem('hermes_api_key') || '')
  const [sessions, setSessions] = useState<GatewayChatSession[]>(initialGatewayState.sessions)
  const [sessionId, setSessionId] = useState(initialGatewayState.sessionId)
  const [pinnedSessionIds, setPinnedSessionIds] = useState<Set<string>>(loadGatewayPinnedSessions)
  const [events, setEvents] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [sessionSearch, setSessionSearch] = useState('')
  const [copyNotice, setCopyNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [syncingSessions, setSyncingSessions] = useState(false)
  const [renameTarget, setRenameTarget] = useState<GatewayChatSession | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [approval, setApproval] = useState<ApprovalRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const streamAbortRef = useRef<AbortController | null>(null)
  const messageScrollRef = useRef<HTMLDivElement | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const activeSession = useMemo(() => sessions.find((session) => session.id === sessionId) || sessions[0], [sessionId, sessions])
  const messages = useMemo(() => activeSession?.messages ?? [], [activeSession])
  const filteredSessions = useMemo(() => {
    const needle = sessionSearch.trim().toLowerCase()
    const base = needle ? sessions.filter((session) => (
      session.title.toLowerCase().includes(needle)
      || session.id.toLowerCase().includes(needle)
      || session.messages.some((message) => message.content.toLowerCase().includes(needle))
    )) : sessions
    return [...base].sort((a, b) => {
      const pinnedDelta = Number(pinnedSessionIds.has(b.id)) - Number(pinnedSessionIds.has(a.id))
      if (pinnedDelta !== 0) return pinnedDelta
      return b.updatedAt - a.updatedAt
    })
  }, [pinnedSessionIds, sessionSearch, sessions])
  const gatewayBase = normalizeGatewayUrl(gatewayUrl)
  const gatewayIsProxy = gatewayBase.startsWith('/gateway')

  useEffect(() => {
    localStorage.setItem(STORAGE_GATEWAY_SESSIONS_KEY, JSON.stringify(sessions))
    if (sessionId) localStorage.setItem(STORAGE_GATEWAY_SESSION_KEY, sessionId)
  }, [sessionId, sessions])

  useEffect(() => {
    localStorage.setItem(STORAGE_GATEWAY_PINNED_KEY, JSON.stringify(Array.from(pinnedSessionIds)))
  }, [pinnedSessionIds])

  useEffect(() => {
    const node = messageScrollRef.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const updateSessionMessages = useCallback((
    targetSessionId: string,
    updater: (messages: GatewayChatMessage[]) => GatewayChatMessage[],
  ) => {
    setSessions((current) => {
      const next = current.some((session) => session.id === targetSessionId)
        ? current
        : [createGatewaySessionRecord(targetSessionId), ...current]
      return sortGatewaySessions(next.map((session) => {
        if (session.id !== targetSessionId) return session
        const nextMessages = updater(session.messages)
        return {
          ...session,
          title: deriveGatewaySessionTitle(nextMessages),
          updatedAt: Date.now(),
          messages: nextMessages,
        }
      }))
    })
  }, [])

  const saveGatewayUrl = (value: string) => {
    setGatewayUrl(value)
    localStorage.setItem(STORAGE_GATEWAY_URL_KEY, value)
  }

  const saveApiKey = (value: string) => {
    setApiKey(value)
    localStorage.setItem(STORAGE_GATEWAY_KEY_KEY, value)
    localStorage.setItem('hermes_api_key', value)
  }

  const newSession = () => {
    const next = createGatewaySessionRecord()
    setSessions((current) => sortGatewaySessions([next, ...current]))
    setSessionId(next.id)
    setInput('')
    setSessionSearch('')
    setEvents([])
    setError(null)
    setApproval(null)
    window.setTimeout(() => composerRef.current?.focus(), 0)
  }

  const switchGatewaySession = (nextSessionId: string) => {
    if (busy) return
    setSessionId(nextSessionId)
    setEvents([])
    setError(null)
    setApproval(null)
  }

  const deleteGatewaySession = (targetSessionId: string) => {
    if (busy) return
    const remaining = sessions.filter((session) => session.id !== targetSessionId)
    const next = remaining.length ? remaining : [createGatewaySessionRecord()]
    if (targetSessionId === sessionId) setSessionId(next[0].id)
    setSessions(next)
    setPinnedSessionIds((current) => {
      const nextPinned = new Set(current)
      nextPinned.delete(targetSessionId)
      return nextPinned
    })
    setEvents([])
    setError(null)
    setApproval(null)
  }

  const togglePinnedSession = (targetSessionId: string) => {
    setPinnedSessionIds((current) => {
      const next = new Set(current)
      if (next.has(targetSessionId)) next.delete(targetSessionId)
      else next.add(targetSessionId)
      return next
    })
  }

  const renameGatewaySession = (targetSessionId: string, title: string) => {
    setSessions((current) => current.map((session) => (
      session.id === targetSessionId ? { ...session, title, updatedAt: Date.now() } : session
    )))
    setRenameTarget(null)
  }

  const clearCurrentSession = () => {
    if (busy || !activeSession) return
    updateSessionMessages(activeSession.id, () => [])
    setEvents([])
    setError(null)
    setApproval(null)
  }

  const exportCurrentSession = () => {
    if (!activeSession) return
    const stamp = new Date().toISOString().slice(0, 10)
    const name = `${safeDownloadName(activeSession.title)}-${stamp}.md`
    downloadTextFile(name, gatewaySessionToMarkdown(activeSession), 'text/markdown;charset=utf-8')
  }

  const syncDashboardSessions = async () => {
    setSyncingSessions(true)
    setError(null)
    try {
      const list = await dashboardApi.getSessions(20, 0)
      const imported = await Promise.all(list.sessions.map(async (session) => {
        const detail = await dashboardApi.getSessionMessages(session.id)
        return dashboardSessionToGateway(session, detail.messages || [])
      }))
      setSessions((current) => mergeGatewaySessions(current, imported))
      if (imported.length && (!activeSession || messages.length === 0)) {
        setSessionId(imported[0].id)
      }
      setCopyNotice(`${labels.syncedDashboardSessions}: ${imported.length}`)
      window.setTimeout(() => setCopyNotice(null), 1800)
    } catch (err) {
      setError(`${labels.dashboardSessionSyncFailed}: ${(err as Error).message}`)
    } finally {
      setSyncingSessions(false)
    }
  }

  const copyGatewayText = useCallback(async (text: string) => {
    if (!text.trim()) return
    try {
      await navigator.clipboard.writeText(text)
      setCopyNotice(labels.messageCopied)
    } catch (err) {
      setCopyNotice(`${labels.copyFailed}: ${(err as Error).message}`)
    }
    window.setTimeout(() => setCopyNotice(null), 1800)
  }, [labels.copyFailed, labels.messageCopied])

  const appendAssistant = useCallback((targetSessionId: string, id: string, delta: string) => {
    updateSessionMessages(targetSessionId, (current) => current.map((message) => (
      message.id === id ? { ...message, content: message.content + delta } : message
    )))
  }, [updateSessionMessages])

  const finishAssistant = useCallback((targetSessionId: string, id: string, output?: string) => {
    updateSessionMessages(targetSessionId, (current) => current.map((message) => {
      if (message.id !== id) return message
      const content = message.content.trim() || output || ''
      return { ...message, content, isStreaming: false }
    }))
  }, [updateSessionMessages])

  const appendAssistantReasoning = useCallback((targetSessionId: string, id: string, delta: string) => {
    updateSessionMessages(targetSessionId, (current) => current.map((message) => (
      message.id === id ? { ...message, reasoning: `${message.reasoning || ''}${delta}` } : message
    )))
  }, [updateSessionMessages])

  const upsertToolMessage = useCallback((targetSessionId: string, event: GatewayRunEvent, status: 'running' | 'done' | 'error') => {
    const toolCallId = event.tool_call_id
    const toolName = event.tool || event.name || 'tool'
    updateSessionMessages(targetSessionId, (current) => {
      const content = toolMessageContent({
        args: event.arguments,
        name: toolName,
        output: event.output,
        preview: event.preview,
        status,
      })
      const index = toolCallId ? current.findIndex((message) => message.role === 'tool' && message.toolCallId === toolCallId) : -1
      if (index === -1) {
        return [...current, {
          id: createId('tool'),
          role: 'tool',
          content,
          timestamp: Date.now(),
          toolArgs: event.arguments,
          toolCallId,
          toolDuration: event.duration,
          toolName,
          toolPreview: event.preview,
          toolResult: event.output,
          toolStatus: status,
        }]
      }
      return current.map((message, messageIndex) => {
        if (messageIndex !== index) return message
        return {
          ...message,
          content,
          toolArgs: event.arguments ?? message.toolArgs,
          toolDuration: event.duration ?? message.toolDuration,
          toolName,
          toolPreview: event.preview ?? message.toolPreview,
          toolResult: event.output ?? message.toolResult,
          toolStatus: status,
        }
      })
    })
  }, [updateSessionMessages])

  const sendGatewayMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || busy) return

    const base = normalizeGatewayUrl(gatewayUrl)
    const requestApiKey = shouldUseBrowserApiKey(base) ? apiKey : ''
    const currentSessionId = sessionId || createGatewaySessionId()
    if (!sessionId) {
      setSessionId(currentSessionId)
    }

    const userMessage: GatewayChatMessage = {
      id: createId('msg'),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    const assistantId = createId('msg')
    const assistantMessage: GatewayChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }
    const history = [...messages, userMessage]
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .filter((message) => message.content.trim())
      .slice(-12)
      .map((message) => ({ role: message.role, content: message.content }))

    setInput('')
    setBusy(true)
    setError(null)
    setApproval(null)
    updateSessionMessages(currentSessionId, (current) => [...current, userMessage, assistantMessage])
    setEvents((current) => [`queued: ${text.slice(0, 80)}`, ...current].slice(0, 12))

    const abortController = new AbortController()
    streamAbortRef.current = abortController

    try {
      const startResponse = await fetch(`${base}/v1/runs`, {
        method: 'POST',
        headers: gatewayHeaders(requestApiKey, currentSessionId),
        body: JSON.stringify({
          input: text,
          session_id: currentSessionId,
          conversation_history: history.slice(0, -1),
        }),
        signal: abortController.signal,
      })
      if (!startResponse.ok) {
        const body = await startResponse.text().catch(() => '')
        throw new Error(`Gateway ${startResponse.status}: ${body || startResponse.statusText}`)
      }
      const run = await startResponse.json() as { run_id?: string; status?: string }
      if (!run.run_id) throw new Error('Gateway did not return a run_id.')
      setActiveRunId(run.run_id)
      setEvents((current) => [`run.started: ${run.run_id}`, ...current].slice(0, 12))

      const eventResponse = await fetch(`${base}/v1/runs/${encodeURIComponent(run.run_id)}/events`, {
        headers: gatewayHeaders(requestApiKey, currentSessionId, false),
        signal: abortController.signal,
      })
      if (!eventResponse.ok) {
        const body = await eventResponse.text().catch(() => '')
        throw new Error(`Gateway events ${eventResponse.status}: ${body || eventResponse.statusText}`)
      }

      await readGatewayEventStream(eventResponse, (event) => {
        const name = event.event || 'event'
        if (name === 'message.delta' && event.delta) {
          appendAssistant(currentSessionId, assistantId, event.delta)
          return
        }
        if ((name === 'reasoning.delta' || name === 'thinking.delta' || name === 'reasoning.available') && (event.text || event.delta)) {
          const reasoning = event.text || event.delta || ''
          appendAssistantReasoning(currentSessionId, assistantId, reasoning)
          setEvents((current) => [`${labels.reasoning}: ${reasoning.slice(0, 120)}`, ...current].slice(0, 12))
          return
        }
        if (name === 'tool.started') {
          upsertToolMessage(currentSessionId, event, 'running')
          setEvents((current) => [`tool.started: ${event.tool || event.preview || 'tool'}`, ...current].slice(0, 12))
          return
        }
        if (name === 'tool.completed') {
          upsertToolMessage(currentSessionId, event, event.error ? 'error' : 'done')
          setEvents((current) => [`tool.completed: ${event.tool || 'tool'}`, ...current].slice(0, 12))
          return
        }
        if (name === 'approval.request' && event.run_id) {
          setApproval({ runId: event.run_id, choices: event.choices || ['once', 'session', 'always', 'deny'] })
          setEvents((current) => ['approval.request', ...current].slice(0, 12))
          return
        }
        if (name === 'run.completed') {
          if (event.parsed_reasoning) appendAssistantReasoning(currentSessionId, assistantId, event.parsed_reasoning)
          finishAssistant(currentSessionId, assistantId, event.parsed_content ?? event.output)
          setEvents((current) => ['run.completed', ...current].slice(0, 12))
          return
        }
        if (name === 'run.failed') {
          finishAssistant(currentSessionId, assistantId)
          throw new Error(event.error || 'Run failed')
        }
        setEvents((current) => [name, ...current].slice(0, 12))
      })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message)
        finishAssistant(currentSessionId, assistantId, `Error: ${(err as Error).message}`)
      }
    } finally {
      setBusy(false)
      setActiveRunId(null)
      streamAbortRef.current = null
    }
  }, [apiKey, appendAssistant, appendAssistantReasoning, busy, finishAssistant, gatewayUrl, input, labels.reasoning, messages, sessionId, updateSessionMessages, upsertToolMessage])

  const stopRun = async () => {
    if (!activeRunId) return
    const base = normalizeGatewayUrl(gatewayUrl)
    const requestApiKey = shouldUseBrowserApiKey(base) ? apiKey : ''
    try {
      await fetch(`${base}/v1/runs/${encodeURIComponent(activeRunId)}/stop`, {
        method: 'POST',
        headers: gatewayHeaders(requestApiKey, sessionId),
        body: JSON.stringify({ reason: 'user_requested' }),
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      streamAbortRef.current?.abort()
      setBusy(false)
      setActiveRunId(null)
    }
  }

  const resolveApproval = async (choice: string) => {
    if (!approval) return
    const base = normalizeGatewayUrl(gatewayUrl)
    const requestApiKey = shouldUseBrowserApiKey(base) ? apiKey : ''
    try {
      const response = await fetch(`${base}/v1/runs/${encodeURIComponent(approval.runId)}/approval`, {
        method: 'POST',
        headers: gatewayHeaders(requestApiKey, sessionId),
        body: JSON.stringify({ choice }),
      })
      if (!response.ok) throw new Error(`Approval ${response.status}: ${await response.text()}`)
      setEvents((current) => [`approval.${choice}`, ...current].slice(0, 12))
      setApproval(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 space-y-3 border-b border-[var(--console-line)] p-4">
        <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--console-accent)]">
              <MessageSquare className="h-4 w-4" />
              {labels.gatewayChat}
            </div>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-normal text-[var(--console-text)]">{labels.hermesChat}</h1>
            <div className="mt-1 truncate font-mono text-xs text-[var(--console-muted)]">{sessionId}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 font-mono text-xs uppercase tracking-[0.14em] ${busy ? 'border-[rgba(70,214,180,0.45)] bg-[rgba(70,214,180,0.1)] text-[var(--console-accent)]' : 'border-[var(--console-line)] bg-[rgba(16,22,28,0.72)] text-[var(--console-muted)]'}`}>
              <Signal className="h-3.5 w-3.5" />
              {busy ? labels.running : labels.ready}
            </span>
            <button className="button-base" disabled={!busy} onClick={() => void stopRun()} title={labels.stopActiveRun} type="button">
              <Square className="h-4 w-4" />
              {labels.stop}
            </button>
            <button className="button-base" disabled={busy || syncingSessions} onClick={() => void syncDashboardSessions()} title={labels.syncDashboardHistory} type="button">
              {syncingSessions ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {labels.sync}
            </button>
            <button className="button-base" disabled={!activeSession} onClick={() => activeSession && setRenameTarget(activeSession)} title={labels.renameChat} type="button">
              <Pencil className="h-4 w-4" />
              {labels.rename}
            </button>
            <button className="button-base" disabled={!activeSession || messages.length === 0} onClick={exportCurrentSession} title={labels.export} type="button">
              <Download className="h-4 w-4" />
              {labels.export}
            </button>
            <button className="button-base" disabled={busy || !activeSession || messages.length === 0} onClick={clearCurrentSession} title={labels.clear} type="button">
              <Trash2 className="h-4 w-4" />
              {labels.clear}
            </button>
            <button className="button-base button-primary" onClick={newSession} title={labels.newChat} type="button">
              <Plus className="h-4 w-4" />
              {labels.newChat}
            </button>
          </div>
        </div>
        <div className="grid gap-2 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,22rem)]">
          <input className="control w-full font-mono" onChange={(event) => saveGatewayUrl(event.target.value)} placeholder="/gateway or http://127.0.0.1:8642" value={gatewayUrl} />
          <input className="control w-full font-mono" onChange={(event) => saveApiKey(event.target.value)} placeholder="API_SERVER_KEY for direct gateway URL" type="password" value={apiKey} />
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-[var(--console-faint)]">
          <span>{gatewayIsProxy ? labels.proxyMode : labels.directMode}</span>
          <span>{apiKey ? labels.localKeyStored : labels.noBrowserKey}</span>
        </div>
      </header>

      {error && <ErrorBanner message={error} />}
      {copyNotice && <Notice message={copyNotice} onClose={() => setCopyNotice(null)} />}
      {approval && (
        <div className="mx-4 mt-4 flex flex-wrap items-center gap-2 border border-[rgba(216,180,92,0.42)] bg-[rgba(216,180,92,0.09)] p-3 text-sm text-[var(--console-text)]">
          <ShieldAlert className="h-4 w-4 text-[var(--console-warning)]" />
          <span className="mr-2 text-[var(--console-muted)]">{labels.approvalRequired}</span>
          {approval.choices.map((choice) => (
            <button className="button-base min-h-0 px-3 py-1 text-xs" key={choice} onClick={() => void resolveApproval(choice)} type="button">
              {choice}
            </button>
          ))}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-3 p-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="scrollbar-thin min-h-0 overflow-y-auto border border-[var(--console-line)] bg-[rgba(8,13,18,0.7)] p-3" ref={messageScrollRef}>
          {messages.length === 0 ? (
            <div className="grid h-full place-items-center text-center text-sm text-[var(--console-muted)]">
              <div>
                <MessageSquare className="mx-auto mb-3 h-7 w-7 text-[var(--console-accent)]" />
                <div className="font-mono text-xs uppercase tracking-[0.18em]">{labels.readyForGatewayRun}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => <GatewayMessageBubble key={message.id} labels={labels} message={message} onCopy={copyGatewayText} />)}
            </div>
          )}
        </div>

        <aside className="hidden min-h-0 overflow-y-auto border border-[var(--console-line)] bg-[rgba(16,22,28,0.55)] p-3 xl:block scrollbar-thin">
          <div className="mb-5">
            <div className="mb-3 flex items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-[var(--console-muted)]">
              <span>{labels.sessions}</span>
              <span className="font-mono text-[0.65rem]">{sessions.length}</span>
            </div>
            <label className="relative mb-3 block">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--console-faint)]" />
              <input
                className="control h-9 w-full pl-8 text-xs"
                onChange={(event) => setSessionSearch(event.target.value)}
                placeholder={labels.searchLocalSessions}
                value={sessionSearch}
              />
            </label>
            <div className="space-y-1">
              {filteredSessions.length ? filteredSessions.map((session) => (
                <div
                  className={`group grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 border px-2 py-2 ${session.id === sessionId ? 'border-[rgba(70,214,180,0.45)] bg-[rgba(70,214,180,0.1)]' : 'border-[var(--console-line)] bg-[rgba(9,13,17,0.34)]'}`}
                  key={session.id}
                >
                  <button className="min-w-0 text-left" disabled={busy} onClick={() => switchGatewaySession(session.id)} type="button">
                    <div className="truncate text-sm text-[var(--console-text)]">{session.title}</div>
                    <div className="mt-1 truncate font-mono text-[0.66rem] text-[var(--console-faint)]">{compactId(session.id)} / {session.messages.length} msgs</div>
                  </button>
                  <button
                    className={`grid h-7 w-7 place-items-center rounded border border-transparent hover:border-[var(--console-line-strong)] ${pinnedSessionIds.has(session.id) ? 'text-[var(--console-accent)]' : 'text-[var(--console-faint)] hover:text-[var(--console-text)]'}`}
                    onClick={() => togglePinnedSession(session.id)}
                    title={pinnedSessionIds.has(session.id) ? labels.unpinLocalSession : labels.pinLocalSession}
                    type="button"
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="grid h-7 w-7 place-items-center rounded border border-transparent text-[var(--console-faint)] hover:border-[var(--console-line-strong)] hover:text-[var(--console-text)]"
                    onClick={() => setRenameTarget(session)}
                    title={labels.renameLocalSession}
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="grid h-7 w-7 place-items-center rounded border border-transparent text-[var(--console-faint)] hover:border-[rgba(255,107,107,0.42)] hover:text-[var(--console-danger)]"
                    disabled={busy}
                    onClick={() => deleteGatewaySession(session.id)}
                    title={labels.deleteLocalSession}
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )) : (
                <div className="border border-[var(--console-line)] bg-[rgba(9,13,17,0.28)] p-3 font-mono text-xs text-[var(--console-faint)]">
                  {labels.noMatchingLocalSessions}
                </div>
              )}
            </div>
          </div>

          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--console-muted)]">{labels.runEvents}</div>
          <div className="space-y-2">
            {events.length === 0 ? (
              <div className="font-mono text-xs text-[var(--console-faint)]">{labels.idle}</div>
            ) : events.map((event, index) => (
              <div className="border-l border-[rgba(70,214,180,0.36)] pl-2 font-mono text-xs text-[var(--console-muted)]" key={`${event}-${index}`}>
                {event}
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="shrink-0 border-t border-[var(--console-line)] p-4">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <textarea
            className="control min-h-16 resize-none"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                void sendGatewayMessage()
              }
            }}
            placeholder={labels.messagePlaceholder}
            ref={composerRef}
            value={input}
          />
          <button className="button-base button-primary min-h-16 px-5" disabled={busy || input.trim().length === 0} onClick={() => void sendGatewayMessage()} title={labels.sendMessage} type="button">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {labels.send}
          </button>
        </div>
      </div>
      {renameTarget && (
        <RenameGatewaySessionModal
          labels={labels}
          session={renameTarget}
          onClose={() => setRenameTarget(null)}
          onRename={renameGatewaySession}
        />
      )}
    </section>
  )
}

function RenameGatewaySessionModal(props: {
  labels: Labels
  session: GatewayChatSession
  onClose: () => void
  onRename: (sessionId: string, title: string) => void
}) {
  const [title, setTitle] = useState(props.session.title)
  return (
    <Modal title={props.labels.renameChat} onClose={props.onClose}>
      <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault()
        const nextTitle = title.trim()
        if (!nextTitle) return
        props.onRename(props.session.id, nextTitle)
      }}>
        <Field label={props.labels.title}>
          <input className="control w-full" onChange={(event) => setTitle(event.target.value)} value={title} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button className="button-base" onClick={props.onClose} type="button">{props.labels.cancel}</button>
          <button className="button-base button-primary" disabled={!title.trim()} type="submit">
            <Pencil className="h-4 w-4" />
            {props.labels.rename}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function GatewayMessageBubble({ labels, message, onCopy }: { labels: Labels; message: GatewayChatMessage; onCopy: (text: string) => void }) {
  const isUser = message.role === 'user'
  const isTool = message.role === 'tool'
  const isSystem = message.role === 'system'
  const roleLabel = isTool && message.toolName ? `tool / ${message.toolName}` : message.role
  const tone = isUser
    ? 'ml-auto border-[rgba(70,214,180,0.42)] bg-[rgba(70,214,180,0.1)]'
    : isTool
      ? 'border-[rgba(92,173,216,0.32)] bg-[rgba(92,173,216,0.08)]'
      : isSystem
        ? 'border-[rgba(216,180,92,0.32)] bg-[rgba(216,180,92,0.08)]'
        : 'border-[var(--console-line)] bg-[rgba(16,22,28,0.72)]'
  return (
    <article className={`max-w-[min(56rem,100%)] border p-3 ${tone}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--console-muted)]">
          {isTool && <Settings2 className="h-3.5 w-3.5" />}
          {roleLabel}
          {message.toolStatus && <span className="text-[var(--console-faint)]">/ {message.toolStatus}</span>}
        </span>
        <div className="flex items-center gap-1">
          {message.isStreaming && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--console-accent)]" />}
          <button
            className="grid h-7 w-7 place-items-center rounded border border-transparent text-[var(--console-faint)] hover:border-[var(--console-line-strong)] hover:text-[var(--console-text)]"
            disabled={!message.content.trim()}
            onClick={() => onCopy(message.content)}
            title={labels.copyMessage}
            type="button"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {message.reasoning && (
        <details className="mb-3 border border-[var(--console-line)] bg-[rgba(4,8,12,0.36)] p-2">
          <summary className="cursor-pointer font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[var(--console-muted)]">{labels.reasoning}</summary>
          <div className="mt-2">
            <MarkdownContent content={message.reasoning} />
          </div>
        </details>
      )}
      <MarkdownContent content={message.content || (message.isStreaming ? '...' : '')} />
    </article>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const blocks: ReactNode[] = []
  const fence = /```([a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = fence.exec(content))) {
    if (match.index > lastIndex) {
      blocks.push(<MarkdownText key={`text-${lastIndex}`} text={content.slice(lastIndex, match.index)} />)
    }
    const language = match[1] || 'text'
    blocks.push(
      <div className="my-3 overflow-hidden border border-[var(--console-line)] bg-[rgba(4,8,12,0.82)]" key={`code-${match.index}`}>
        <div className="border-b border-[var(--console-line)] px-3 py-1 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--console-muted)]">
          {language}
        </div>
        <pre className="scrollbar-thin overflow-x-auto p-3 text-xs leading-5 text-[var(--console-text)]"><code>{match[2].trimEnd()}</code></pre>
      </div>,
    )
    lastIndex = fence.lastIndex
  }
  if (lastIndex < content.length) {
    blocks.push(<MarkdownText key={`text-${lastIndex}`} text={content.slice(lastIndex)} />)
  }
  return <div className="break-words text-sm leading-6 text-[var(--console-text)]">{blocks.length ? blocks : null}</div>
}

function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g).filter(Boolean)
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code className="rounded border border-[var(--console-line)] bg-[rgba(148,163,184,0.08)] px-1 py-0.5 font-mono text-[0.85em]" key={`${part}-${index}`}>{part.slice(1, -1)}</code>
        }
        return <span key={`${part}-${index}`}>{part}</span>
      })}
    </div>
  )
}

function PtyChatWorkspace() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<XtermTerminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [channel, setChannel] = useState(() => createChatChannel())
  const [connectionState, setConnectionState] = useState<ChatConnectionState>('connecting')
  const [banner, setBanner] = useState<string | null>(null)
  const [input, setInput] = useState('')

  const reconnect = useCallback(() => {
    setConnectionState('connecting')
    setBanner(null)
    setChannel(createChatChannel())
  }, [])

  const clearTerminal = useCallback(() => {
    termRef.current?.clear()
    termRef.current?.focus()
  }, [])

  const sendLine = useCallback(() => {
    const text = input.trim()
    if (!text) return
    const socket = wsRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setBanner('Chat socket is not connected.')
      return
    }
    socket.send(`${text}\r`)
    setInput('')
    termRef.current?.focus()
  }, [input])

  useEffect(() => {
    const host = hostRef.current
    const token = window.__HERMES_SESSION_TOKEN__
    if (!host) return undefined
    if (!token) {
      const timer = window.setTimeout(() => {
        setConnectionState('error')
        setBanner('Session token unavailable. Open the Vite app while the Hermes dashboard is running on port 9119, then refresh.')
      }, 0)
      return () => window.clearTimeout(timer)
    }

    const width = host.clientWidth || document.documentElement.clientWidth || 1280
    const term = new XtermTerminal({
      allowProposedApi: false,
      cursorBlink: true,
      convertEol: true,
      disableStdin: false,
      fontFamily: '"JetBrains Mono", "Cascadia Mono", Consolas, ui-monospace, monospace',
      fontSize: terminalFontSize(width),
      lineHeight: width < 720 ? 1.05 : 1.15,
      scrollback: 9000,
      theme: {
        background: '#071113',
        foreground: '#d8eee9',
        cursor: '#46d6b4',
        cursorAccent: '#071113',
        selectionBackground: '#46d6b455',
      },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    host.replaceChildren()
    term.open(host)
    termRef.current = term
    fitRef.current = fit

    const safeFit = () => {
      try {
        const nextWidth = host.clientWidth || width
        term.options.fontSize = terminalFontSize(nextWidth)
        term.options.lineHeight = nextWidth < 720 ? 1.05 : 1.15
        fit.fit()
      } catch {
        // xterm can throw if the host is temporarily hidden during a layout pass.
      }
    }
    safeFit()

    const socket = new WebSocket(buildPtySocketUrl(token, channel))
    socket.binaryType = 'arraybuffer'
    wsRef.current = socket

    let closingForUnmount = false
    let resizeRaf = 0
    const sendResize = () => {
      safeFit()
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(`\x1b[RESIZE:${term.cols};${term.rows}]`)
      }
    }
    const scheduleResize = () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0
        sendResize()
      })
    }
    const resizeObserver = new ResizeObserver(scheduleResize)
    resizeObserver.observe(host)

    socket.onopen = () => {
      setBanner(null)
      setConnectionState('open')
      sendResize()
      term.focus()
    }

    socket.onmessage = (event) => {
      if (typeof event.data === 'string') {
        term.write(event.data)
      } else {
        term.write(new Uint8Array(event.data as ArrayBuffer))
      }
    }

    socket.onerror = () => {
      if (!closingForUnmount) {
        setConnectionState('error')
        setBanner('Chat WebSocket failed. Check that Docker Hermes dashboard is reachable at http://localhost:9119/.')
      }
    }

    socket.onclose = (event) => {
      wsRef.current = null
      if (closingForUnmount) return
      if (event.code === 4401) {
        setConnectionState('error')
        setBanner('WebSocket auth failed. Refresh the app so the dashboard session token can be read again.')
        return
      }
      if (event.code === 4403) {
        setConnectionState('error')
        setBanner('Embedded chat is disabled or blocked by the dashboard. Start Hermes dashboard with TUI chat enabled.')
        return
      }
      setConnectionState(event.code === 1011 ? 'error' : 'closed')
      if (event.code !== 1011) term.write('\r\n\x1b[90m[session ended]\x1b[0m\r\n')
    }

    // eslint-disable-next-line no-control-regex
    const sgrMouseReport = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/
    const dataDisposable = term.onData((data) => {
      if (socket.readyState !== WebSocket.OPEN) return
      if (sgrMouseReport.test(data)) return
      socket.send(data)
    })
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(`\x1b[RESIZE:${cols};${rows}]`)
    })

    return () => {
      closingForUnmount = true
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      resizeObserver.disconnect()
      dataDisposable.dispose()
      resizeDisposable.dispose()
      socket.close()
      term.dispose()
      if (termRef.current === term) termRef.current = null
      if (fitRef.current === fit) fitRef.current = null
      if (wsRef.current === socket) wsRef.current = null
    }
  }, [channel])

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-[var(--console-line)] p-4">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--console-accent)]">
              <TerminalSquare className="h-4 w-4" />
              live hermes session
            </div>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-normal text-[var(--console-text)]">Hermes Chat</h1>
            <div className="mt-1 truncate font-mono text-xs text-[var(--console-muted)]">dashboard /api/pty</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 font-mono text-xs uppercase tracking-[0.14em] ${connectionState === 'open' ? 'border-[rgba(70,214,180,0.45)] bg-[rgba(70,214,180,0.1)] text-[var(--console-accent)]' : 'border-[var(--console-line)] bg-[rgba(16,22,28,0.72)] text-[var(--console-muted)]'}`}>
              <Signal className="h-3.5 w-3.5" />
              {connectionState}
            </span>
            <button className="button-base" onClick={clearTerminal} title="Clear terminal" type="button">
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
            <button className="button-base button-primary" onClick={reconnect} title="Reconnect chat" type="button">
              <RefreshCw className="h-4 w-4" />
              Reconnect
            </button>
          </div>
        </div>
      </header>

      {banner && <ErrorBanner message={banner} />}

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div className="chat-terminal min-h-0 flex-1 overflow-hidden rounded-lg border border-[rgba(70,214,180,0.24)] bg-[#071113]" ref={hostRef} />
        <div className="grid gap-2 border border-[var(--console-line)] bg-[rgba(16,22,28,0.72)] p-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <textarea
            className="control min-h-12 resize-none"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                sendLine()
              }
            }}
            placeholder="Message Hermes"
            value={input}
          />
          <button className="button-base button-primary min-h-12 px-5" disabled={connectionState !== 'open' || input.trim().length === 0} onClick={sendLine} title="Send message" type="button">
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </div>
    </section>
  )
}

function Metric({ label, value, wide = false }: { label: string; value: number | string; wide?: boolean }) {
  return (
    <div className={`border border-[var(--console-line)] bg-[rgba(16,22,28,0.52)] p-3 ${wide ? 'col-span-2' : ''}`}>
      <div className="font-mono text-lg text-[var(--console-text)]">{value}</div>
      <div className="text-[0.66rem] uppercase tracking-[0.18em] text-[var(--console-muted)]">{label}</div>
    </div>
  )
}

function Toolbar(props: {
  assignees: KanbanAssignee[]
  assigneeFilter: string
  boardData: KanbanBoardResponse | null
  busy: boolean
  currentBoard?: KanbanBoard
  labels: Labels
  search: string
  showArchived: boolean
  statusFilter: KanbanTaskStatus | 'all'
  tenantFilter: string
  onAssigneeFilter: (value: string) => void
  onCreateTask: () => void
  onDispatch: () => void
  onManageBoard: () => void
  onRefresh: () => void
  onSearch: (value: string) => void
  onStatusFilter: (value: KanbanTaskStatus | 'all') => void
  onTenantFilter: (value: string) => void
  onToggleArchived: () => void
}) {
  return (
    <header className="space-y-3 border-b border-[var(--console-line)] p-4">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--console-accent)]">
            <Network className="h-4 w-4" />
            {props.labels.commandSurface}
          </div>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-normal text-[var(--console-text)]">
            {boardDisplayName(props.currentBoard, props.labels)}
          </h1>
          <div className="mt-1 truncate font-mono text-xs text-[var(--console-muted)]">
            {props.currentBoard?.slug || 'default'}
            {props.currentBoard?.description ? ` / ${props.currentBoard.description}` : ''}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="button-base" disabled={props.busy} onClick={props.onRefresh} title={props.labels.refreshBoard} type="button">
            <RefreshCw className={`h-4 w-4 ${props.busy ? 'animate-spin' : ''}`} />
            {props.labels.refresh}
          </button>
          <button className="button-base" disabled={props.busy} onClick={props.onManageBoard} title={props.labels.manageCurrentBoard} type="button">
            <Settings2 className="h-4 w-4" />
            {props.labels.board}
          </button>
          <button className={props.showArchived ? 'button-base button-primary' : 'button-base'} disabled={props.busy} onClick={props.onToggleArchived} type="button">
            <Archive className="h-4 w-4" />
            {props.showArchived ? props.labels.hideArchived : props.labels.showArchived}
          </button>
          <button className="button-base" disabled={props.busy} onClick={props.onDispatch} title={props.labels.dispatchReadyWork} type="button">
            <Send className="h-4 w-4" />
            {props.labels.dispatch}
          </button>
          <button className="button-base button-primary" onClick={props.onCreateTask} type="button">
            <Plus className="h-4 w-4" />
            {props.labels.newTask}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(12rem,1fr)_11rem_11rem_11rem]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--console-muted)]" />
          <input className="control control-icon-left w-full" onChange={(event) => props.onSearch(event.target.value)} placeholder={props.labels.filterSearchPlaceholder} value={props.search} />
        </label>
        <label className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--console-muted)]" />
          <select className="control control-select-icon-left w-full" onChange={(event) => props.onStatusFilter(event.target.value as KanbanTaskStatus | 'all')} value={props.statusFilter}>
            <option value="all">{props.labels.allStatuses}</option>
            {STATUS_ORDER.filter((status) => props.showArchived || status !== 'archived').map((status) => <option key={status} value={status}>{statusLabel(props.labels, status)}</option>)}
          </select>
        </label>
        <select className="control w-full" onChange={(event) => props.onAssigneeFilter(event.target.value)} value={props.assigneeFilter}>
          <option value="all">{props.labels.allAssignees}</option>
          <option value="unassigned">{props.labels.unassigned}</option>
          {props.assignees.map((assignee) => <option key={assignee.name} value={assignee.name}>{assignee.name}</option>)}
        </select>
        <select className="control w-full" onChange={(event) => props.onTenantFilter(event.target.value)} value={props.tenantFilter}>
          <option value="">{props.labels.allTenants}</option>
          {(props.boardData?.tenants ?? []).map((tenant) => <option key={tenant} value={tenant}>{tenant}</option>)}
        </select>
      </div>
    </header>
  )
}

function DiagnosticsStrip({ diagnostics, labels, onSelectTask }: { diagnostics: KanbanDiagnosticRow[]; labels: Labels; onSelectTask: (taskId: string) => void }) {
  if (!diagnostics.length) return null
  return (
    <section className="mx-4 mt-4 rounded-lg border border-[rgba(216,180,92,0.28)] bg-[rgba(216,180,92,0.08)] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--console-warning)]">
          <ShieldAlert className="h-4 w-4" />
          {labels.diagnostics}
        </div>
        <span className="font-mono text-xs text-[var(--console-muted)]">{diagnostics.length} {labels.tasks}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 xl:grid-cols-4">
        {diagnostics.slice(0, 4).map((row) => (
          <button
            className="rounded border border-[var(--console-line)] bg-[rgba(9,13,17,0.42)] p-2 text-left transition hover:border-[rgba(216,180,92,0.5)]"
            key={row.task_id}
            onClick={() => onSelectTask(row.task_id)}
            type="button"
          >
            <div className="truncate text-sm font-medium">{row.task_title || compactId(row.task_id)}</div>
            <div className="mt-1 truncate text-xs text-[var(--console-muted)]">{diagnosticsLabel(row.diagnostics)}</div>
          </button>
        ))}
      </div>
    </section>
  )
}

function KanbanColumn(props: {
  diagnosticsByTask: Map<string, KanbanDiagnosticRow>
  dragTaskId: string | null
  labels: Labels
  selectedIds: Set<string>
  status: KanbanTaskStatus
  tasks: KanbanTask[]
  onDragEnd: () => void
  onDragStart: (taskId: string) => void
  onDropTask: (taskId: string, status: KanbanTaskStatus) => void
  onSelectTask: (taskId: string) => void
  onToggleSelected: (taskId: string, checked: boolean) => void
}) {
  const meta = STATUS_META[props.status]
  const Icon = meta.icon
  const label = statusLabel(props.labels, props.status)
  return (
    <section
      className="flex min-h-0 flex-col rounded-xl border border-[var(--console-line)] bg-[rgba(16,22,28,0.52)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        const id = event.dataTransfer.getData('text/plain') || props.dragTaskId
        if (id) props.onDropTask(id, props.status)
      }}
    >
      <header className={`flex items-center justify-between border-l-4 ${meta.line} border-b border-[var(--console-line)] px-3 py-3`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${props.status === 'running' ? 'animate-spin text-[var(--console-accent)]' : 'text-[var(--console-muted)]'}`} />
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <span className="rounded-full border border-[var(--console-line)] px-2 py-0.5 font-mono text-xs text-[var(--console-muted)]">{props.tasks.length}</span>
      </header>
      <div className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {props.tasks.length === 0 ? (
          <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-[var(--console-line)] px-4 text-center text-xs text-[var(--console-muted)]">
            {interpolate(props.labels.noTasksInStatus, { status: label })}
          </div>
        ) : props.tasks.map((task, index) => (
          <TaskCard
            diagnosticRow={props.diagnosticsByTask.get(task.id)}
            index={index}
            key={task.id}
            labels={props.labels}
            selected={props.selectedIds.has(task.id)}
            task={task}
            onDragEnd={props.onDragEnd}
            onDragStart={props.onDragStart}
            onSelectTask={props.onSelectTask}
            onToggleSelected={props.onToggleSelected}
          />
        ))}
      </div>
    </section>
  )
}

function TaskCard({ diagnosticRow, index, labels, onDragEnd, onDragStart, onSelectTask, onToggleSelected, selected, task }: {
  diagnosticRow?: KanbanDiagnosticRow
  index: number
  labels: Labels
  onDragEnd: () => void
  onDragStart: (taskId: string) => void
  onSelectTask: (taskId: string) => void
  onToggleSelected: (taskId: string, checked: boolean) => void
  selected: boolean
  task: KanbanTask
}) {
  const diagnosticTotal = diagnosticRow?.diagnostics.length ?? task.diagnostics?.length ?? task.warnings?.count ?? 0
  return (
    <article
      className={`group rounded-lg border bg-[rgba(9,13,17,0.72)] p-3 transition hover:-translate-y-0.5 hover:border-[rgba(70,214,180,0.42)] hover:bg-[rgba(12,20,25,0.95)] ${selected ? 'border-[rgba(70,214,180,0.62)] ring-1 ring-[rgba(70,214,180,0.22)]' : 'border-[var(--console-line)]'}`}
      draggable
      onClick={() => onSelectTask(task.id)}
      onDragEnd={onDragEnd}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', task.id)
        onDragStart(task.id)
      }}
      style={{ animationDelay: `${index * 35}ms` }}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 text-[var(--console-faint)] transition hover:text-[var(--console-accent)]"
          onClick={(event) => {
            event.stopPropagation()
            onToggleSelected(task.id, !selected)
          }}
          title={selected ? labels.removeBulkSelection : labels.addBulkSelection}
          type="button"
        >
          {selected ? <SquareCheck className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
        <h3 className="min-w-0 flex-1 line-clamp-2 text-sm font-semibold leading-snug text-[var(--console-text)]">{task.title}</h3>
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--console-faint)] transition group-hover:text-[var(--console-accent)]" />
      </div>
      {task.body && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--console-muted)]">{task.body}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge icon={<UserRound className="h-3 w-3" />} label={task.assignee || labels.unassigned} />
        <Badge icon={<TimerReset className="h-3 w-3" />} label={formatAgeLabel(labels, task.age?.created_age_seconds)} />
        {task.priority > 0 && <Badge tone="warn" label={`P${task.priority}`} />}
        {diagnosticTotal > 0 && <Badge tone="danger" icon={<ShieldAlert className="h-3 w-3" />} label={String(diagnosticTotal)} />}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[var(--console-line)] pt-2 font-mono text-[0.68rem] text-[var(--console-faint)]">
        <span>{compactId(task.id)}</span>
        <span>{task.tenant || workspaceKindLabel(labels, task.workspace_kind)}</span>
      </div>
    </article>
  )
}

function BulkActionBar(props: {
  assignees: KanbanAssignee[]
  busy: boolean
  labels: Labels
  selectedCount: number
  onClear: () => void
  onUpdate: (input: Omit<BulkTaskInput, 'ids'>, message: string) => void
}) {
  const [assignee, setAssignee] = useState('')
  const [summary, setSummary] = useState('')

  return (
    <div className="fixed bottom-4 left-4 right-4 z-20 mx-auto flex max-w-5xl flex-col gap-3 rounded-xl border border-[var(--console-line-strong)] bg-[rgba(10,15,20,0.96)] p-3 shadow-2xl shadow-black/40 backdrop-blur md:flex-row md:items-center">
      <div className="flex items-center gap-2 text-sm">
        <SquareCheck className="h-4 w-4 text-[var(--console-accent)]" />
        <span className="font-medium">{props.selectedCount} {props.labels.selected}</span>
      </div>
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 md:grid-cols-[10rem_minmax(12rem,1fr)]">
        <select className="control w-full" onChange={(event) => setAssignee(event.target.value)} value={assignee}>
          <option value="">{props.labels.assignProfile}</option>
          <option value="__unassigned__">{props.labels.unassigned}</option>
          {props.assignees.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
        </select>
        <input className="control w-full" onChange={(event) => setSummary(event.target.value)} placeholder={props.labels.optionalCompletionSummary} value={summary} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="button-base" disabled={props.busy} onClick={() => props.onUpdate({ status: 'ready' }, interpolate(props.labels.tasksMovedTo, { status: props.labels.statusReady }))} type="button"><Play className="h-4 w-4" />{props.labels.statusReady}</button>
        <button className="button-base" disabled={props.busy} onClick={() => props.onUpdate({ status: 'todo' }, interpolate(props.labels.tasksMovedTo, { status: props.labels.statusTodo }))} type="button"><ClipboardList className="h-4 w-4" />{props.labels.statusTodo}</button>
        <button className="button-base" disabled={props.busy} onClick={() => props.onUpdate({ status: 'done', summary: summary || undefined }, props.labels.tasksCompleted)} type="button"><CheckCircle2 className="h-4 w-4" />{props.labels.statusDone}</button>
        <button className="button-base" disabled={props.busy || !assignee} onClick={() => props.onUpdate({ assignee: assignee === '__unassigned__' ? '' : assignee }, props.labels.tasksReassigned)} type="button"><UserRound className="h-4 w-4" />{props.labels.assign}</button>
        <button className="button-base button-danger" disabled={props.busy} onClick={() => props.onUpdate({ archive: true }, props.labels.tasksArchived)} type="button"><Archive className="h-4 w-4" />{props.labels.archive}</button>
        <button className="button-base" onClick={props.onClear} type="button"><X className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

function Badge({ icon, label, tone = 'neutral' }: { icon?: ReactNode; label: string; tone?: 'neutral' | 'warn' | 'danger' }) {
  const tones = {
    neutral: 'border-[var(--console-line)] text-[var(--console-muted)]',
    warn: 'border-[rgba(216,180,92,0.42)] text-[var(--console-warning)]',
    danger: 'border-[rgba(255,107,107,0.42)] text-[var(--console-danger)]',
  }
  return <span className={`inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 text-[0.68rem] ${tones[tone]}`}>{icon}<span className="truncate">{label}</span></span>
}

function GeneratedArtifactsPanel(props: {
  detail: KanbanTaskDetail | null
  labels: Labels
  task: KanbanTask
}) {
  const [notice, setNotice] = useState<string | null>(null)
  const changedFiles = useMemo(() => collectChangedFiles(props.detail), [props.detail])
  const workspacePath = props.task.workspace_path || ''

  if (!workspacePath && changedFiles.length === 0) return null

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setNotice(props.labels.copied)
    } catch (err) {
      setNotice(`${props.labels.copyFailed}: ${(err as Error).message}`)
    }
    window.setTimeout(() => setNotice(null), 1800)
  }

  return (
    <Panel title={props.labels.generatedArtifacts}>
      <div className="space-y-3">
        {workspacePath && (
          <div className="space-y-2 border border-[var(--console-line)] bg-[rgba(9,13,17,0.45)] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.68rem] uppercase tracking-[0.16em] text-[var(--console-muted)]">{props.labels.workspacePath}</span>
              <button className="button-base h-8 px-2 text-xs" onClick={() => void copyText(workspacePath)} title={props.labels.copyPath} type="button">
                <Copy className="h-3.5 w-3.5" />
                {props.labels.copyPath}
              </button>
            </div>
            <code className="block break-all rounded border border-[var(--console-line)] bg-[#070b0f] p-2 font-mono text-xs text-[var(--console-text)]">{workspacePath}</code>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.68rem] uppercase tracking-[0.16em] text-[var(--console-muted)]">{props.labels.dockerCopyCommand}</span>
              <button className="button-base h-8 px-2 text-xs" onClick={() => void copyText(dockerCopyCommand(workspacePath))} title={props.labels.copyCommand} type="button">
                <TerminalSquare className="h-3.5 w-3.5" />
                {props.labels.copyCommand}
              </button>
            </div>
            <code className="block break-all rounded border border-[var(--console-line)] bg-[#070b0f] p-2 font-mono text-xs text-[var(--console-muted)]">{dockerCopyCommand(workspacePath)}</code>
          </div>
        )}

        <p className="text-xs leading-relaxed text-[var(--console-muted)]">{props.labels.dockerCopyHint}</p>

        <div className="space-y-2">
          <div className="text-[0.68rem] uppercase tracking-[0.16em] text-[var(--console-muted)]">{props.labels.changedFiles}</div>
          {changedFiles.length ? changedFiles.map((file) => {
            const fullPath = joinWorkspacePath(workspacePath, file)
            const command = dockerCopyCommand(fullPath)
            return (
              <div className="space-y-2 border border-[var(--console-line)] bg-[rgba(9,13,17,0.45)] p-3" key={file}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--console-text)]">{file}</div>
                    <div className="mt-1 break-all font-mono text-xs text-[var(--console-muted)]">{fullPath}</div>
                  </div>
                  <button className="button-base h-8 shrink-0 px-2 text-xs" onClick={() => void copyText(command)} title={props.labels.copyCommand} type="button">
                    <Copy className="h-3.5 w-3.5" />
                    {props.labels.copyCommand}
                  </button>
                </div>
                <code className="block break-all rounded border border-[var(--console-line)] bg-[#070b0f] p-2 font-mono text-xs text-[var(--console-muted)]">{command}</code>
              </div>
            )
          }) : (
            <div className="border border-dashed border-[var(--console-line)] p-3 text-sm text-[var(--console-muted)]">{props.labels.noChangedFiles}</div>
          )}
        </div>

        {notice && <div className="text-xs text-[var(--console-accent)]">{notice}</div>}
      </div>
    </Panel>
  )
}

function TaskDrawer(props: {
  assignees: KanbanAssignee[]
  busy: boolean
  detail: KanbanTaskDetail | null
  diagnosticRow?: KanbanDiagnosticRow
  labels: Labels
  loading: boolean
  log: KanbanTaskLog | null
  onAddComment: (taskId: string, body: string) => Promise<void>
  onAddLink: (parentId: string, childId: string) => Promise<void>
  onAssign: (taskId: string, assignee: string) => Promise<void>
  onClose: () => void
  onDeleteLink: (parentId: string, childId: string) => Promise<void>
  onLoadLog: (taskId: string) => Promise<void>
  onOpenTask: (taskId: string) => void
  onReassign: (taskId: string, profile: string, reclaimFirst: boolean, reason?: string) => Promise<void>
  onReclaim: (taskId: string, reason?: string) => Promise<void>
  onSetStatus: (taskId: string, status: KanbanTaskStatus, extra?: { block_reason?: string; summary?: string }) => Promise<void>
  onSpecify: (taskId: string) => Promise<void>
  open: boolean
}) {
  const [comment, setComment] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [summary, setSummary] = useState('')
  const [parentId, setParentId] = useState('')
  const [childId, setChildId] = useState('')
  const [reclaimReason, setReclaimReason] = useState('')
  const [reassignProfile, setReassignProfile] = useState('')
  const [reassignWithReclaim, setReassignWithReclaim] = useState(true)
  const task = props.detail?.task
  const diagnostics = [...(props.diagnosticRow?.diagnostics ?? []), ...(task?.diagnostics ?? [])]

  if (!props.open) return null

  return (
    <aside className="fixed inset-y-0 right-0 z-20 flex w-full max-w-xl flex-col border-l border-[var(--console-line-strong)] bg-[rgba(10,15,20,0.96)] shadow-2xl shadow-black/40 backdrop-blur">
      <header className="flex items-center justify-between border-b border-[var(--console-line)] p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--console-accent)]">
            <PanelRightOpen className="h-4 w-4" />
            {props.labels.taskDetail}
          </div>
          <h2 className="mt-1 truncate text-lg font-semibold">{task?.title || props.labels.loadingTask}</h2>
        </div>
        <button className="button-base" onClick={props.onClose} type="button"><X className="h-4 w-4" /></button>
      </header>

      {props.loading ? (
        <div className="space-y-3 p-4">
          <div className="skeleton h-28 rounded-lg" />
          <div className="skeleton h-40 rounded-lg" />
        </div>
      ) : task ? (
        <div className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <section className="grid grid-cols-2 gap-2">
            <Info label={props.labels.status} value={statusLabel(props.labels, task.status)} />
            <Info label={props.labels.priority} value={`P${task.priority}`} />
            <Info label={props.labels.created} value={formatDateTime(task.created_at)} />
            <Info label={props.labels.assignee} value={task.assignee || props.labels.unassigned} />
          </section>

          {task.body && <Panel title={props.labels.body}><p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--console-muted)]">{task.body}</p></Panel>}
          {(task.result || task.latest_summary) && <Panel title={props.labels.latestResult}><p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--console-muted)]">{task.result || task.latest_summary}</p></Panel>}
          <GeneratedArtifactsPanel detail={props.detail} labels={props.labels} task={task} />

          {diagnostics.length > 0 && (
            <Panel title={props.labels.diagnostics}>
              <div className="space-y-2">
                {diagnostics.map((item, index) => (
                  <DiagnosticItem item={item} key={`${item.kind ?? 'diag'}-${index}`} />
                ))}
              </div>
            </Panel>
          )}

          <Panel title={props.labels.actions}>
            <div className="grid grid-cols-2 gap-2">
              <button className="button-base" disabled={props.busy} onClick={() => void props.onSetStatus(task.id, 'ready')} type="button"><Play className="h-4 w-4" />{props.labels.statusReady}</button>
              <button className="button-base" disabled={props.busy} onClick={() => void props.onSetStatus(task.id, 'todo')} type="button"><ClipboardList className="h-4 w-4" />{props.labels.statusTodo}</button>
              <button className="button-base" disabled={props.busy || !summary.trim()} onClick={() => void props.onSetStatus(task.id, 'done', { summary })} type="button"><CheckCircle2 className="h-4 w-4" />{props.labels.statusDone}</button>
              <button className="button-base button-danger" disabled={props.busy || !blockReason.trim()} onClick={() => void props.onSetStatus(task.id, 'blocked', { block_reason: blockReason })} type="button"><AlertTriangle className="h-4 w-4" />{props.labels.block}</button>
              <button className="button-base button-danger" disabled={props.busy || task.status === 'archived'} onClick={() => void props.onSetStatus(task.id, 'archived')} type="button"><Archive className="h-4 w-4" />{props.labels.archive}</button>
            </div>
            <Field label={props.labels.completionSummary}><textarea className="control min-h-20 w-full resize-y" onChange={(event) => setSummary(event.target.value)} value={summary} /></Field>
            <Field label={props.labels.blockReason}><input className="control w-full" onChange={(event) => setBlockReason(event.target.value)} value={blockReason} /></Field>
            <Field label={props.labels.assignProfile}>
              <select className="control w-full" onChange={(event) => void props.onAssign(task.id, event.target.value)} value={task.assignee || ''}>
                <option value="">{props.labels.unassigned}</option>
                {props.assignees.map((assignee) => <option key={assignee.name} value={assignee.name}>{assignee.name}</option>)}
              </select>
            </Field>
          </Panel>

          <Panel title={props.labels.recovery}>
            <div className="grid grid-cols-2 gap-2">
              <button className="button-base" disabled={props.busy} onClick={() => void props.onSpecify(task.id)} type="button"><Wand2 className="h-4 w-4" />{props.labels.specify}</button>
              <button className="button-base" disabled={props.busy} onClick={() => void props.onReclaim(task.id, reclaimReason || undefined)} type="button"><RotateCcw className="h-4 w-4" />{props.labels.reclaim}</button>
            </div>
            <Field label={props.labels.reclaimReason}><input className="control w-full" onChange={(event) => setReclaimReason(event.target.value)} value={reclaimReason} /></Field>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <select className="control min-w-0" onChange={(event) => setReassignProfile(event.target.value)} value={reassignProfile}>
                <option value="">{props.labels.reassignProfile}</option>
                {props.assignees.map((assignee) => <option key={assignee.name} value={assignee.name}>{assignee.name}</option>)}
              </select>
              <button className="button-base" disabled={props.busy || !reassignProfile} onClick={() => void props.onReassign(task.id, reassignProfile, reassignWithReclaim, reclaimReason || undefined)} type="button">
                <UserRound className="h-4 w-4" />
                {props.labels.reassign}
              </button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-[var(--console-muted)]">
              <input checked={reassignWithReclaim} onChange={(event) => setReassignWithReclaim(event.target.checked)} type="checkbox" />
              {props.labels.reclaimBeforeReassignment}
            </label>
          </Panel>

          <Panel title={props.labels.relationships}>
            <RelationshipList
              childIds={props.detail?.links?.children ?? []}
              labels={props.labels}
              parentIds={props.detail?.links?.parents ?? []}
              taskId={task.id}
              onDelete={props.onDeleteLink}
              onOpenTask={props.onOpenTask}
            />
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input className="control min-w-0" onChange={(event) => setParentId(event.target.value)} placeholder={props.labels.parentTaskId} value={parentId} />
              <button className="button-base" disabled={props.busy || !parentId.trim()} onClick={() => void props.onAddLink(parentId.trim(), task.id).then(() => setParentId(''))} type="button"><Link2 className="h-4 w-4" />{props.labels.parent}</button>
            </div>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input className="control min-w-0" onChange={(event) => setChildId(event.target.value)} placeholder={props.labels.childTaskId} value={childId} />
              <button className="button-base" disabled={props.busy || !childId.trim()} onClick={() => void props.onAddLink(task.id, childId.trim()).then(() => setChildId(''))} type="button"><GitPullRequest className="h-4 w-4" />{props.labels.child}</button>
            </div>
          </Panel>

          <Panel title={props.labels.comments}>
            <div className="space-y-2">
              {props.detail?.comments.length ? props.detail.comments.map((item) => (
                <div className="border border-[var(--console-line)] bg-[rgba(9,13,17,0.45)] p-2" key={item.id}>
                  <div className="flex justify-between gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-[var(--console-muted)]">
                    <span>{item.author}</span>
                    <span>{formatDateTime(item.created_at)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--console-text)]">{item.body}</p>
                </div>
              )) : <div className="text-sm text-[var(--console-muted)]">{props.labels.noCommentsYet}</div>}
            </div>
            <div className="mt-3 flex gap-2">
              <input className="control min-w-0 flex-1" onChange={(event) => setComment(event.target.value)} placeholder={props.labels.addNote} value={comment} />
              <button className="button-base" disabled={props.busy || !comment.trim()} onClick={() => void props.onAddComment(task.id, comment).then(() => setComment(''))} title={props.labels.addComment} type="button"><MessageSquare className="h-4 w-4" /></button>
            </div>
          </Panel>

          <Panel title={props.labels.runsAndLog}>
            <div className="space-y-2">
              {props.detail?.runs.length ? props.detail.runs.slice().reverse().map((run) => (
                <div className="border border-[var(--console-line)] p-2 font-mono text-xs text-[var(--console-muted)]" key={run.id}>
                  <div className="flex justify-between gap-2"><span>{run.profile || props.labels.unknown}</span><span>{run.status || run.outcome || 'run'}</span></div>
                  {run.summary && <div className="mt-1 whitespace-pre-wrap">{run.summary}</div>}
                  {run.error && <div className="mt-1 text-[var(--console-danger)]">{run.error}</div>}
                </div>
              )) : <div className="text-sm text-[var(--console-muted)]">{props.labels.noRunsRecorded}</div>}
            </div>
            <button className="button-base mt-3" disabled={props.busy} onClick={() => void props.onLoadLog(task.id)} type="button"><TerminalSquare className="h-4 w-4" />{props.labels.loadWorkerLog}</button>
            {props.log && (
              <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-[var(--console-line)] bg-[#070b0f] p-3 font-mono text-xs text-[var(--console-muted)] scrollbar-thin">{props.log.exists ? props.log.content : props.labels.noWorkerLog}</pre>
            )}
          </Panel>

          <Panel title={props.labels.events}>
            <div className="space-y-2">
              {props.detail?.events.length ? props.detail.events.slice().reverse().map((event) => (
                <div className="border border-[var(--console-line)] bg-[rgba(9,13,17,0.38)] p-2 font-mono text-xs text-[var(--console-muted)]" key={event.id}>
                  <div className="flex justify-between gap-2"><span>{event.kind}</span><span>{formatDateTime(event.created_at)}</span></div>
                </div>
              )) : <div className="text-sm text-[var(--console-muted)]">{props.labels.noEventsYet}</div>}
            </div>
          </Panel>
        </div>
      ) : (
        <div className="p-4 text-sm text-[var(--console-muted)]">{props.labels.selectTaskToInspect}</div>
      )}
    </aside>
  )
}

function DiagnosticItem({ item }: { item: KanbanDiagnostic }) {
  const severity = item.severity || 'warning'
  const tone = severity === 'critical' || severity === 'error' ? 'text-[var(--console-danger)]' : 'text-[var(--console-warning)]'
  return (
    <div className="rounded border border-[rgba(216,180,92,0.22)] bg-[rgba(216,180,92,0.06)] p-2">
      <div className={`flex items-center justify-between gap-2 text-xs uppercase tracking-[0.14em] ${tone}`}>
        <span>{item.kind || 'diagnostic'}</span>
        <span>{severity}</span>
      </div>
      <p className="mt-1 text-sm text-[var(--console-muted)]">{item.message || diagnosticsLabel([item])}</p>
    </div>
  )
}

function RelationshipList(props: {
  childIds: string[]
  labels: Labels
  parentIds: string[]
  taskId: string
  onDelete: (parentId: string, childId: string) => Promise<void>
  onOpenTask: (taskId: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <RelationshipGroup
        ids={props.parentIds}
        label={props.labels.parents}
        labels={props.labels}
        onDelete={(id) => props.onDelete(id, props.taskId)}
        onOpen={props.onOpenTask}
      />
      <RelationshipGroup
        ids={props.childIds}
        label={props.labels.children}
        labels={props.labels}
        onDelete={(id) => props.onDelete(props.taskId, id)}
        onOpen={props.onOpenTask}
      />
    </div>
  )
}

function RelationshipGroup({ ids, label, labels, onDelete, onOpen }: { ids: string[]; label: string; labels: Labels; onDelete: (taskId: string) => Promise<void>; onOpen: (taskId: string) => void }) {
  return (
    <div className="rounded border border-[var(--console-line)] bg-[rgba(9,13,17,0.35)] p-2">
      <div className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--console-muted)]">{label}</div>
      {ids.length ? ids.map((id) => (
        <div className="flex items-center justify-between gap-2 py-1" key={id}>
          <button className="truncate font-mono text-xs text-[var(--console-text)] hover:text-[var(--console-accent)]" onClick={() => onOpen(id)} type="button">{compactId(id)}</button>
          <button className="text-[var(--console-faint)] hover:text-[var(--console-danger)]" onClick={() => void onDelete(id)} title={labels.removeLink} type="button"><Link2Off className="h-3.5 w-3.5" /></button>
        </div>
      )) : <div className="text-xs text-[var(--console-faint)]">{labels.none}</div>}
    </div>
  )
}

function Panel({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section className="rounded-xl border border-[var(--console-line)] bg-[rgba(16,22,28,0.46)] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs uppercase tracking-[0.18em] text-[var(--console-muted)]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--console-line)] bg-[rgba(16,22,28,0.46)] p-3">
      <div className="truncate text-sm text-[var(--console-text)]">{value}</div>
      <div className="mt-1 text-[0.66rem] uppercase tracking-[0.18em] text-[var(--console-muted)]">{label}</div>
    </div>
  )
}

function CreateProfileModal(props: {
  labels: Labels
  onClose: () => void
  onCreate: (input: { name: string; clone_from_default?: boolean; no_skills?: boolean; soul?: string }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [cloneFromDefault, setCloneFromDefault] = useState(true)
  const [soul, setSoul] = useState('')
  const normalizedName = name.trim().toLowerCase()
  const isValid = normalizedName === 'default' || /^[a-z0-9][a-z0-9_-]{0,63}$/.test(normalizedName)
  return (
    <Modal title={props.labels.createProfile} onClose={props.onClose}>
      <form className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" onSubmit={(event) => {
        event.preventDefault()
        if (!normalizedName || !isValid) return
        void props.onCreate({ name: normalizedName, clone_from_default: cloneFromDefault, no_skills: false, soul })
      }}>
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--console-accent)]">
              <UserPlus className="h-4 w-4" />
              {props.labels.createProfile}
            </div>
            <p className="mt-2 text-sm text-[var(--console-muted)]">{props.labels.profileSetupHelp}</p>
          </div>
          <Field label={props.labels.name}>
            <input
              autoFocus
              className="control w-full font-mono"
              onChange={(event) => setName(event.target.value)}
              pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,63}"
              placeholder="worker-alpha"
              required
              value={name}
            />
            <p className={`mt-2 text-xs ${name && !isValid ? 'text-[var(--console-danger)]' : 'text-[var(--console-muted)]'}`}>
              {props.labels.profileNameHelp}
            </p>
          </Field>
          <label className={`flex items-start gap-3 border p-3 text-sm text-[var(--console-muted)] ${cloneFromDefault ? 'border-[rgba(70,214,180,0.45)] bg-[rgba(70,214,180,0.1)]' : 'border-[var(--console-line)] bg-[rgba(16,22,28,0.46)]'}`}>
            <input checked={cloneFromDefault} className="mt-1" onChange={(event) => setCloneFromDefault(event.target.checked)} type="checkbox" />
            <span>
              <span className="block text-[var(--console-text)]">{props.labels.cloneDefaultProfile}</span>
              <span className="mt-1 block text-xs">{props.labels.profileNameHelp}</span>
            </span>
          </label>
        </div>
        <div className="flex min-h-[24rem] flex-col space-y-3 border border-[var(--console-line)] bg-[rgba(9,13,17,0.34)] p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--console-muted)]">{props.labels.profileSoul}</div>
          <Field label={props.labels.profileInstructions} className="flex min-h-0 flex-1 flex-col">
            <textarea
              className="control min-h-80 flex-1 resize-y lg:min-h-0"
              onChange={(event) => setSoul(event.target.value)}
              placeholder={props.labels.profileInstructionsPlaceholder}
              value={soul}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2 lg:col-span-2">
          <button className="button-base" onClick={props.onClose} type="button">{props.labels.cancel}</button>
          <button className="button-base button-primary" disabled={!normalizedName || !isValid} type="submit"><UserPlus className="h-4 w-4" />{props.labels.create}</button>
        </div>
      </form>
    </Modal>
  )
}

function CreateTaskModal(props: {
  assignees: KanbanAssignee[]
  labels: Labels
  tenants: string[]
  onClose: () => void
  onCreate: (input: { title: string; body?: string; assignee?: string; tenant?: string; priority?: number; triage?: boolean }) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [assignee, setAssignee] = useState('')
  const [tenant, setTenant] = useState('')
  const [priority, setPriority] = useState(1)
  const [triage, setTriage] = useState(false)
  return (
    <Modal title={props.labels.createTask} onClose={props.onClose}>
      <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault()
        if (!title.trim()) return
        void props.onCreate({ title: title.trim(), body: body.trim() || undefined, assignee: assignee || undefined, tenant: tenant || undefined, priority, triage })
      }}>
        <Field label={props.labels.title}><input className="control w-full" onChange={(event) => setTitle(event.target.value)} required value={title} /></Field>
        <Field label={props.labels.body}><textarea className="control min-h-28 w-full resize-y" onChange={(event) => setBody(event.target.value)} value={body} /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={props.labels.assignee}>
            <select className="control w-full" onChange={(event) => setAssignee(event.target.value)} value={assignee}>
              <option value="">{props.labels.unassigned}</option>
              {props.assignees.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </Field>
          <Field label={props.labels.tenant}>
            <input className="control w-full" list="tenant-options" onChange={(event) => setTenant(event.target.value)} value={tenant} />
            <datalist id="tenant-options">{props.tenants.map((item) => <option key={item} value={item} />)}</datalist>
          </Field>
          <Field label={props.labels.priority}>
            <input className="control w-full" max={5} min={0} onChange={(event) => setPriority(Number(event.target.value))} type="number" value={priority} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--console-muted)]">
          <input checked={triage} onChange={(event) => setTriage(event.target.checked)} type="checkbox" />
          {props.labels.placeInTriage}
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button className="button-base" onClick={props.onClose} type="button">{props.labels.cancel}</button>
          <button className="button-base button-primary" type="submit"><Plus className="h-4 w-4" />{props.labels.create}</button>
        </div>
      </form>
    </Modal>
  )
}

function CreateBoardModal(props: {
  labels: Labels
  onClose: () => void
  onCreate: (input: { slug: string; name?: string; description?: string; icon?: string; color?: string; switch?: boolean }) => Promise<void>
}) {
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('kanban')
  const [color, setColor] = useState('#46d6b4')
  return (
    <Modal title={props.labels.createBoard} onClose={props.onClose}>
      <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault()
        if (!slug.trim()) return
        void props.onCreate({ slug: slug.trim().toLowerCase(), name: name.trim() || undefined, description: description.trim() || undefined, icon: icon.trim() || undefined, color, switch: true })
      }}>
        <Field label={props.labels.slug}><input className="control w-full" onChange={(event) => setSlug(event.target.value)} pattern="[a-z0-9][a-z0-9_-]{0,63}" required value={slug} /></Field>
        <Field label={props.labels.name}><input className="control w-full" onChange={(event) => setName(event.target.value)} value={name} /></Field>
        <Field label={props.labels.description}><textarea className="control min-h-20 w-full resize-y" onChange={(event) => setDescription(event.target.value)} value={description} /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={props.labels.icon}><input className="control w-full" onChange={(event) => setIcon(event.target.value)} value={icon} /></Field>
          <Field label={props.labels.color}><input className="control h-10 w-full" onChange={(event) => setColor(event.target.value)} type="color" value={color} /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="button-base" onClick={props.onClose} type="button">{props.labels.cancel}</button>
          <button className="button-base button-primary" type="submit"><Blocks className="h-4 w-4" />{props.labels.createBoard}</button>
        </div>
      </form>
    </Modal>
  )
}

function BoardManagerModal(props: {
  board: KanbanBoard
  labels: Labels
  onArchive: (slug: string) => Promise<void>
  onClose: () => void
  onDelete: (slug: string) => Promise<void>
  onSave: (slug: string, input: { name?: string; description?: string; icon?: string; color?: string }) => Promise<void>
}) {
  const [name, setName] = useState(props.board.name || '')
  const [description, setDescription] = useState(props.board.description || '')
  const [icon, setIcon] = useState(props.board.icon || 'kanban')
  const [color, setColor] = useState(props.board.color || '#46d6b4')
  const [confirmSlug, setConfirmSlug] = useState('')
  const confirmed = confirmSlug === props.board.slug

  return (
    <Modal title={props.labels.manageBoard} onClose={props.onClose}>
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--console-line)] bg-[rgba(16,22,28,0.42)] p-3">
          <div className="font-mono text-xs text-[var(--console-muted)]">{props.board.slug}</div>
          <div className="mt-1 text-sm text-[var(--console-muted)]">{props.board.total ?? 0} {props.labels.tasksTracked}</div>
        </div>
        <Field label={props.labels.name}><input className="control w-full" onChange={(event) => setName(event.target.value)} value={name} /></Field>
        <Field label={props.labels.description}><textarea className="control min-h-20 w-full resize-y" onChange={(event) => setDescription(event.target.value)} value={description} /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={props.labels.icon}><input className="control w-full" onChange={(event) => setIcon(event.target.value)} value={icon} /></Field>
          <Field label={props.labels.color}><input className="control h-10 w-full" onChange={(event) => setColor(event.target.value)} type="color" value={color} /></Field>
        </div>
        <div className="flex justify-end gap-2">
          <button className="button-base" onClick={props.onClose} type="button">{props.labels.cancel}</button>
          <button className="button-base button-primary" onClick={() => void props.onSave(props.board.slug, { name, description, icon, color })} type="button"><Pencil className="h-4 w-4" />{props.labels.save}</button>
        </div>
        <div className="border-t border-[var(--console-line)] pt-4">
          <Field label={interpolate(props.labels.typeSlugToEnable, { slug: props.board.slug })}>
            <input className="control w-full" onChange={(event) => setConfirmSlug(event.target.value)} value={confirmSlug} />
          </Field>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button className="button-base button-danger" disabled={!confirmed} onClick={() => void props.onArchive(props.board.slug)} type="button"><Archive className="h-4 w-4" />{props.labels.archive}</button>
            <button className="button-base button-danger" disabled={!confirmed} onClick={() => void props.onDelete(props.board.slug)} type="button"><Trash2 className="h-4 w-4" />{props.labels.delete}</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/62 p-4 backdrop-blur-sm">
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--console-line-strong)] bg-[rgba(10,15,20,0.97)] p-4 shadow-2xl shadow-black/40 scrollbar-thin">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="button-base" onClick={onClose} type="button"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ children, className = '', label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <label className={`mt-3 block space-y-1 ${className}`}>
      <span className="text-xs uppercase tracking-[0.16em] text-[var(--console-muted)]">{label}</span>
      {children}
    </label>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mx-4 mt-4 rounded-lg border border-[rgba(255,107,107,0.35)] bg-[rgba(255,107,107,0.1)] p-3 text-sm text-[var(--console-danger)]">
      <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{message}</span></div>
    </div>
  )
}

function Notice({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-lg border border-[rgba(70,214,180,0.28)] bg-[rgba(70,214,180,0.1)] p-3 text-sm text-[#d8fff5]">
      <span>{message}</span>
      <button className="text-[var(--console-muted)] hover:text-[var(--console-text)]" onClick={onClose} type="button"><X className="h-4 w-4" /></button>
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div className="grid h-full auto-cols-[minmax(18rem,1fr)] grid-flow-col gap-3 overflow-hidden">
      {STATUS_ORDER.slice(0, 5).map((status) => (
        <div className="rounded-xl border border-[var(--console-line)] bg-[rgba(16,22,28,0.45)] p-3" key={status}>
          <div className="skeleton h-8 rounded-lg" />
          <div className="mt-4 space-y-2">
            <div className="skeleton h-28 rounded-lg" />
            <div className="skeleton h-24 rounded-lg" />
            <div className="skeleton h-32 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

function diagnosticsLabel(items: KanbanDiagnostic[]): string {
  if (!items.length) return 'No diagnostics'
  const kinds = items.map((item) => item.kind || item.message || item.severity || 'diagnostic')
  return kinds.slice(0, 3).join(', ')
}

export default App
