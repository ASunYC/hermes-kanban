# Hermes Kanban

React/Vite cockpit UI for Hermes Dashboard and Gateway.

## Features

- Gateway chat with local session history.
- Kanban board for Hermes `/api/plugins/kanban/*`.
- Profile management for Hermes worker roles.
- Runtime model settings and language switch.
- Docker-friendly artifact paths for completed Kanban tasks.

## Local Development

```powershell
$env:HERMES_DASHBOARD_URL="http://127.0.0.1:9119"
$env:HERMES_GATEWAY_URL="http://127.0.0.1:8642"
$env:HERMES_GATEWAY_KEY="your API_SERVER_KEY"

npm install
npm run dev -- --host 0.0.0.0
```

Open:

```text
http://127.0.0.1:5174
```

## GitHub Pages

This repository is configured to publish with GitHub Actions.

The production base path is:

```text
/hermes-kanban/
```

After the workflow succeeds, the site URL is:

```text
https://asunyc.github.io/hermes-kanban/
```

The static GitHub Pages build can render the UI shell, but live Chat and Kanban operations still need a reachable Hermes Dashboard and Gateway. For normal development, use the local Vite dev server so `/api` and `/gateway` can be proxied.

## Scripts

```bash
npm run lint
npm run build
npm run preview
```
