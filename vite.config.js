import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Serves api/*.js locally under `npm run dev`, mirroring how Vercel serves
// the same files as serverless functions in production — one handler per
// route, no dev/prod drift.
const API_ROUTES = {
  '/api/generate-klong': '/api/generate-klong.js',
  '/api/ai-settings': '/api/ai-settings.js',
  '/api/validator-settings': '/api/validator-settings.js',
  '/api/challenges': '/api/challenges.js',
  '/api/prompts': '/api/prompts.js',
  '/api/prompt-categories': '/api/prompt-categories.js',
  '/api/admin/login': '/api/admin/login.js',
  '/api/admin/logout': '/api/admin/logout.js',
  '/api/admin/session': '/api/admin/session.js',
  '/api/admin/ai-settings': '/api/admin/ai-settings.js',
}

const apiDevMiddleware = () => ({
  name: 'api-dev-middleware',
  configureServer(server) {
    for (const [route, modulePath] of Object.entries(API_ROUTES)) {
      server.middlewares.use(route, async (req, res) => {
        const { default: handler } = await server.ssrLoadModule(modulePath)
        await handler(req, res)
      })
    }
  },
})

export default defineConfig(({ mode }) => {
  // Vite only puts VITE_-prefixed vars on import.meta.env for client code —
  // by design, so server secrets never reach the browser. The dev
  // middleware above runs server-side Node code, so it needs these on
  // process.env explicitly, same as Vercel provides in prod.
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['GEMINI_API_KEY', 'DATABASE_URL', 'SESSION_SECRET']) {
    if (env[key]) process.env[key] = env[key]
  }

  return {
    plugins: [react(), apiDevMiddleware()],
    // Two real bundles, not one router: /admin never ships to a public
    // visitor's browser and vice versa (see CLAUDE.md's route-structure
    // note). vercel.json rewrites the /admin path to admin.html in prod;
    // in dev, Vite serves it directly at /admin.html.
    build: {
      rollupOptions: {
        input: {
          main: `${import.meta.dirname}/index.html`,
          admin: `${import.meta.dirname}/admin.html`,
        },
      },
    },
  }
})
