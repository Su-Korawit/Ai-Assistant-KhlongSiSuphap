import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Serves api/generate-klong.js locally under `npm run dev`, mirroring how
// Vercel serves the same file as a serverless function in production —
// one handler, no dev/prod drift.
const apiDevMiddleware = () => ({
  name: 'api-dev-middleware',
  configureServer(server) {
    server.middlewares.use('/api/generate-klong', async (req, res) => {
      const { default: handler } = await server.ssrLoadModule('/api/generate-klong.js')
      await handler(req, res)
    })
  },
})

export default defineConfig(({ mode }) => {
  // Vite only puts VITE_-prefixed vars on import.meta.env for client code —
  // by design, so server secrets never reach the browser. The dev
  // middleware above runs server-side Node code, so it needs
  // GEMINI_API_KEY on process.env explicitly, same as Vercel provides in prod.
  const env = loadEnv(mode, process.cwd(), '')
  if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY

  return {
    plugins: [react(), apiDevMiddleware()],
  }
})
