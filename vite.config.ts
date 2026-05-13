import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const BACKEND = process.env.HERMES_DASHBOARD_URL ?? 'http://127.0.0.1:9119'
const GATEWAY = process.env.HERMES_GATEWAY_URL ?? 'http://127.0.0.1:8642'
const GATEWAY_KEY = process.env.HERMES_GATEWAY_KEY ?? ''
const IS_GITHUB_PAGES = process.env.GITHUB_PAGES === 'true'
const TOKEN_RE = /window\.__HERMES_SESSION_TOKEN__\s*=\s*"([^"]+)"/
const BASE_RE = /window\.__HERMES_BASE_PATH__\s*=\s*"([^"]*)"/
const CHAT_RE = /window\.__HERMES_DASHBOARD_EMBEDDED_CHAT__\s*=\s*(true|false)/

async function readDashboardMetadata() {
  const res = await fetch(BACKEND, { headers: { accept: 'text/html' } })
  const html = await res.text()
  return {
    basePath: html.match(BASE_RE)?.[1] ?? '',
    embeddedChat: html.match(CHAT_RE)?.[1] === 'true',
    token: html.match(TOKEN_RE)?.[1] ?? '',
  }
}

function hermesDevToken(): Plugin {
  return {
    name: 'hermes-kanban:dev-session-token',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__hermes/session', async (_req, res) => {
        try {
          const meta = await readDashboardMetadata()
          if (!meta.token) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: `Could not find session token in ${BACKEND}` }))
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
        const meta = await readDashboardMetadata()
        if (!meta.token) {
          console.warn(`[hermes-kanban] Could not find session token in ${BACKEND}; API calls may return 401.`)
          return
        }
        return [{
          tag: 'script',
          injectTo: 'head',
          children: `window.__HERMES_SESSION_TOKEN__=${JSON.stringify(meta.token)};window.__HERMES_BASE_PATH__=${JSON.stringify(meta.basePath)};window.__HERMES_DASHBOARD_EMBEDDED_CHAT__=${JSON.stringify(meta.embeddedChat)};`,
        }]
      } catch (err) {
        console.warn(`[hermes-kanban] Dashboard at ${BACKEND} unreachable. Start it with \`hermes dashboard\` or set HERMES_DASHBOARD_URL. (${(err as Error).message})`)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: IS_GITHUB_PAGES ? '/hermes-kanban/' : '/',
  plugins: [react(), tailwindcss(), hermesDevToken()],
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
        target: BACKEND,
        changeOrigin: true,
        ws: true,
      },
      '/dashboard-plugins': {
        target: BACKEND,
        changeOrigin: true,
      },
      '/gateway': {
        target: GATEWAY,
        changeOrigin: true,
        headers: GATEWAY_KEY ? { Authorization: `Bearer ${GATEWAY_KEY}` } : undefined,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('referer')
            if (GATEWAY_KEY && !proxyReq.getHeader('authorization')) {
              proxyReq.setHeader('authorization', `Bearer ${GATEWAY_KEY}`)
            }
          })
        },
        rewrite: (requestPath) => requestPath.replace(/^\/gateway/, ''),
      },
    },
  },
})
