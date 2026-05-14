import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const DEFAULT_BACKEND = 'http://127.0.0.1:9119'
const DEFAULT_GATEWAY = 'http://127.0.0.1:8642'
const TOKEN_RE = /window\.__HERMES_SESSION_TOKEN__\s*=\s*"([^"]+)"/
const BASE_RE = /window\.__HERMES_BASE_PATH__\s*=\s*"([^"]*)"/
const CHAT_RE = /window\.__HERMES_DASHBOARD_EMBEDDED_CHAT__\s*=\s*(true|false)/

function envValue(env: Record<string, string>, key: string, fallback = '') {
  return process.env[key]?.trim() || env[key]?.trim() || fallback
}

async function readDashboardMetadata(backend: string) {
  const res = await fetch(backend, { headers: { accept: 'text/html' } })
  const html = await res.text()
  return {
    basePath: html.match(BASE_RE)?.[1] ?? '',
    embeddedChat: html.match(CHAT_RE)?.[1] === 'true',
    token: html.match(TOKEN_RE)?.[1] ?? '',
  }
}

function hermesDevToken(backend: string): Plugin {
  return {
    name: 'hermes-kanban:dev-session-token',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__hermes/session', async (_req, res) => {
        try {
          const meta = await readDashboardMetadata(backend)
          if (!meta.token) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: `Could not find session token in ${backend}` }))
            return
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(meta))
        } catch (err) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: (err as Error).message }))
        }
      })
    },
    async transformIndexHtml() {
      try {
        const meta = await readDashboardMetadata(backend)
        if (!meta.token) {
          console.warn(`[hermes-kanban] Could not find session token in ${backend}; API calls may return 401.`)
          return
        }
        return [{
          tag: 'script',
          injectTo: 'head',
          children: `window.__HERMES_SESSION_TOKEN__=${JSON.stringify(meta.token)};window.__HERMES_BASE_PATH__=${JSON.stringify(meta.basePath)};window.__HERMES_DASHBOARD_EMBEDDED_CHAT__=${JSON.stringify(meta.embeddedChat)};`,
        }]
      } catch (err) {
        console.warn(`[hermes-kanban] Dashboard at ${backend} unreachable. Start it with \`hermes dashboard\` or set HERMES_DASHBOARD_URL in .env.local. (${(err as Error).message})`)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const backend = envValue(env, 'HERMES_DASHBOARD_URL', DEFAULT_BACKEND)
  const gateway = envValue(env, 'HERMES_GATEWAY_URL', DEFAULT_GATEWAY)
  const gatewayKey = envValue(env, 'HERMES_GATEWAY_KEY')
  const isGithubPages = envValue(env, 'GITHUB_PAGES') === 'true'

  return {
    base: isGithubPages ? '/hermes-kanban/' : '/',
    plugins: [react(), tailwindcss(), hermesDevToken(backend)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: '0.0.0.0',
      port: 5174,
      proxy: {
        '/api': {
          target: backend,
          changeOrigin: true,
          ws: true,
        },
        '/dashboard-plugins': {
          target: backend,
          changeOrigin: true,
        },
        '/gateway': {
          target: gateway,
          changeOrigin: true,
          headers: gatewayKey ? { Authorization: `Bearer ${gatewayKey}` } : undefined,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin')
              proxyReq.removeHeader('referer')
              if (gatewayKey && !proxyReq.getHeader('authorization')) {
                proxyReq.setHeader('authorization', `Bearer ${gatewayKey}`)
              }
            })
          },
          rewrite: (requestPath) => requestPath.replace(/^\/gateway/, ''),
        },
      },
    },
  }
})
