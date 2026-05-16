# Hermes Kanban

> Hermes Dashboard / Gateway 的任务指挥台：把聊天、看板调度、Profile 管理、模型设置和执行产物追踪放进一个 React + Vite UI。

<div align="center">

<img alt="Version" src="https://img.shields.io/badge/version-0.0.0-blue.svg"> <img alt="React" src="https://img.shields.io/badge/react-19.2-61dafb.svg"> <img alt="Vite" src="https://img.shields.io/badge/vite-8.0-646cff.svg"> <img alt="TypeScript" src="https://img.shields.io/badge/typescript-6.0-3178c6.svg"> <img alt="GitHub Pages" src="https://img.shields.io/badge/deploy-GitHub%20Pages-222.svg">

**创作者**: [ASunYC](https://github.com/ASunYC)

[在线预览](#-在线预览) · [项目简介](#-项目简介) · [功能特性](#-功能特性) · [快速开始](#-快速开始) · [命令表](#-命令表) · [环境变量](#-环境变量) · [部署说明](#-部署说明) · [常见问题](#-常见问题)

</div>

---

## 🎬 在线预览

<div align="center">

**Hermes Kanban GitHub Pages**

https://asunyc.github.io/hermes-kanban/

*Pages 版本可以打开 UI 外壳和静态演示数据；实时 Chat、Kanban、Profiles、Settings 需要本地 Vite 开发服务器代理到 Hermes Dashboard 和 Gateway。*

</div>

---

## 📖 项目简介

Hermes Kanban 是 Hermes 工作流的浏览器控制台。它面向需要同时观察聊天会话、任务队列、执行角色和模型配置的使用场景，提供一个更集中、更适合调度的前端入口。

- 🔌 **连接 Hermes Dashboard**：通过 `/api` 读取状态、会话、模型和 Profile 信息。
- 💬 **连接 Hermes Gateway**：通过 `/gateway` 发起聊天请求，并保存本地会话历史。
- 🧭 **管理 Kanban 任务**：对接 `/api/plugins/kanban/*`，支持看板、任务、评论、事件和批量操作。
- 🧑‍💻 **管理 Worker Profiles**：创建、删除、查看和编辑 Profile 的 `SOUL.md` 角色设定。
- 📦 **追踪执行产物**：展示任务日志、变更文件、生成产物路径和 Docker 复制命令。

### 设计理念

**一个面向执行的 cockpit UI**

- 聊天、系统状态、任务队列和角色管理放在同一个工作台里。
- 开发环境优先，默认通过 Vite proxy 转发到本机 Hermes 服务。
- GitHub Pages 保留静态预览能力，方便展示 UI 和演示流程。

---

## ✨ 功能特性

### 核心能力

- 💬 **Gateway Chat**：支持本地会话、置顶、重命名、删除、同步 Dashboard 历史。
- 🗂️ **多看板 Kanban**：创建、切换、编辑、归档和删除看板。
- ✅ **任务流转**：支持 `triage`、`todo`、`ready`、`running`、`blocked`、`done`、`archived` 状态。
- 🧩 **任务详情**：查看评论、事件、运行记录、Worker 日志、父子任务关系和诊断信息。
- 🛠️ **批量操作**：批量移动状态、分配执行者、归档和更新任务。
- 🧑‍🚀 **Profile 管理**：创建 Profile、克隆 default 配置、编辑角色指令、管理执行身份。
- 🧠 **模型设置**：查看模型目录、保存主模型、添加自定义 provider/model。
- 🌐 **中英文界面**：内置 English / 中文两套 UI 文案。
- 📡 **事件流刷新**：通过 WebSocket 订阅 Kanban 事件，降低手动刷新成本。
- 🧪 **静态 Demo 模式**：GitHub Pages 环境可使用本地 demo 数据体验部分流程。

### 技术亮点

- React 19 + TypeScript 6 + Vite 8
- Tailwind CSS 4 + `@nous-research/ui`
- `lucide-react` 图标体系
- `@xterm/xterm` 终端日志展示
- Vite dev server 自动注入 Hermes session token
- GitHub Actions + GitHub Pages 静态发布

---

## 🚀 快速开始

### 1. 准备 Hermes 服务

本地开发需要先启动 Hermes Dashboard 和 Gateway。默认地址如下：

```text
Dashboard: http://127.0.0.1:9119
Gateway:   http://127.0.0.1:8642
```

如果你的 Hermes 服务使用了其他端口，请在 `.env.local` 中覆盖。

### 2. 配置环境变量

```powershell
Copy-Item .env.example .env.local

$env:HERMES_DASHBOARD_URL="http://127.0.0.1:9119"
$env:HERMES_GATEWAY_URL="http://127.0.0.1:8642"
$env:HERMES_GATEWAY_KEY="your API_SERVER_KEY"
```

也可以直接编辑 `.env.local`：

```dotenv
HERMES_DASHBOARD_URL=http://127.0.0.1:9119
HERMES_GATEWAY_URL=http://127.0.0.1:8642
HERMES_GATEWAY_KEY=
GITHUB_PAGES=false
```

### 3. 安装并启动

```bash
npm install
npm run dev -- --host 0.0.0.0
```

打开：

```text
http://127.0.0.1:5174
```

---

## ⌨️ 命令表

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器，默认端口 `5174` |
| `npm run build` | 运行 TypeScript 构建并生成生产静态文件 |
| `npm run preview` | 本地预览生产构建结果 |
| `npm run lint` | 运行 ESLint 检查 |

### 常用开发命令

```bash
# 启动开发服务
npm run dev -- --host 0.0.0.0

# 构建生产文件
npm run build

# 预览 dist
npm run preview
```

---

## 🔧 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HERMES_DASHBOARD_URL` | `http://127.0.0.1:9119` | Hermes Dashboard 地址，开发服务器会把 `/api` 和 `/dashboard-plugins` 代理到这里 |
| `HERMES_GATEWAY_URL` | `http://127.0.0.1:8642` | Hermes Gateway 地址，开发服务器会把 `/gateway` 代理到这里 |
| `HERMES_GATEWAY_KEY` | 空 | Gateway Bearer Key；设置后由 Vite proxy 注入 `Authorization` |
| `GITHUB_PAGES` | `false` | 设置为 `true` 时，生产构建使用 `/hermes-kanban/` base path |

### 代理行为

开发模式下，Vite 会自动处理三类请求：

| 前端路径 | 代理目标 |
|----------|----------|
| `/api/*` | `HERMES_DASHBOARD_URL` |
| `/dashboard-plugins/*` | `HERMES_DASHBOARD_URL` |
| `/gateway/*` | `HERMES_GATEWAY_URL`，并移除 `/gateway` 前缀 |

Vite 还会尝试从 Dashboard 首页读取 `window.__HERMES_SESSION_TOKEN__`，并注入到前端页面中，用于 Dashboard API 鉴权。

---

## 📁 项目结构

```text
hermes-kanban/
├── README.md
├── package.json
├── vite.config.ts
├── public/
├── src/
│   ├── App.tsx              # 主应用、视图状态和 UI 组件
│   ├── main.tsx             # React 入口
│   ├── index.css            # 全局样式和 Tailwind 引入
│   └── lib/
│       ├── api.ts           # Dashboard / Kanban / Gateway API 封装
│       └── format.ts        # 时间、ID、状态格式化工具
└── .github/
    └── workflows/           # GitHub Pages 构建发布流程
```

---

## 🚢 部署说明

本仓库已配置 GitHub Actions 发布到 GitHub Pages。

生产 base path：

```text
/hermes-kanban/
```

发布成功后的访问地址：

```text
https://asunyc.github.io/hermes-kanban/
```

### 静态页面限制

GitHub Pages 是纯静态环境，无法直接代理本机 Hermes Dashboard 和 Gateway。因此：

- 可以展示 UI 外壳。
- 可以使用浏览器本地 demo 数据体验部分 Kanban / Profiles 流程。
- 实时 Chat、Kanban、Profiles、Settings 仍建议使用本地 Vite dev server。

---

## ❓ 常见问题

### Q: 为什么 GitHub Pages 上不能连接我的本机 Hermes？

**A**: Pages 是公网静态站点，不能访问你的 `127.0.0.1` 服务，也不能提供 Vite proxy。需要实时功能时，请使用本地开发服务器：

```bash
npm run dev -- --host 0.0.0.0
```

### Q: 页面提示 Dashboard token 不存在怎么办？

**A**: 先确认 `HERMES_DASHBOARD_URL` 指向可访问的 Dashboard。开发服务器会读取 Dashboard 首页中的 session token，如果 Dashboard 未启动或地址不对，API 请求可能返回 `401`。

### Q: Gateway 聊天请求返回鉴权错误怎么办？

**A**: 检查 `.env.local` 中的 `HERMES_GATEWAY_KEY` 是否和 Hermes Gateway 的 `API_SERVER_KEY` 一致。设置后重启 Vite dev server。

### Q: Docker 模式下任务产物在哪里？

**A**: Hermes worker 的产物可能在容器路径中。任务详情会展示产物路径和 `docker cp` 命令，方便从 Hermes 容器复制到宿主机。

---

## 📝 更新日志

### v0.0.0

- 初始化 Hermes Kanban React/Vite 前端。
- 支持 Gateway Chat、本地会话和 Dashboard 历史同步。
- 支持 Hermes Kanban board、任务详情、事件流、批量操作和诊断信息。
- 支持 Profile 管理、模型设置、中英文切换和 GitHub Pages 静态预览。

---

<div align="center">

**如果这个项目对你有帮助，欢迎给 [ASunYC/hermes-kanban](https://github.com/ASunYC/hermes-kanban) 一个 Star。**

Made with ❤️ by ASunYC | Powered by React, Vite & Hermes

</div>
