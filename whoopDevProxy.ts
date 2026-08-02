import type { Connect, Plugin } from 'vite'

async function readBody(req: Connect.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

function attachWhoopRoutes(middlewares: Connect.Server) {
  middlewares.use('/api/whoop-token', async (req, res, next) => {
    if (req.method !== 'POST') {
      next()
      return
    }
    try {
      const raw = await readBody(req)
      const body = JSON.parse(raw || '{}') as Record<string, string>
      const form = new URLSearchParams()
      for (const [k, v] of Object.entries(body)) {
        if (typeof v === 'string') form.set(k, v)
      }
      const upstream = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      })
      const text = await upstream.text()
      res.statusCode = upstream.status
      res.setHeader('Content-Type', 'application/json')
      res.end(text)
    } catch (err) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'token proxy failed' }))
    }
  })

  middlewares.use('/api/whoop-proxy', async (req, res, next) => {
    if (req.method !== 'GET') {
      next()
      return
    }
    try {
      const url = new URL(req.url ?? '', 'http://localhost')
      const path = url.searchParams.get('path') ?? ''
      if (!path.startsWith('/')) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'path must start with /' }))
        return
      }
      const auth = req.headers.authorization
      if (!auth) {
        res.statusCode = 401
        res.end(JSON.stringify({ error: 'Missing Authorization' }))
        return
      }
      const upstream = await fetch(`https://api.prod.whoop.com/developer/v2${path}`, {
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json',
        },
      })
      const text = await upstream.text()
      res.statusCode = upstream.status
      res.setHeader('Content-Type', 'application/json')
      res.end(text)
    } catch (err) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'proxy failed' }))
    }
  })
}

/** Dev/preview middleware so Whoop OAuth works on Cloudflare tunnels without Vercel. */
export function whoopDevProxy(): Plugin {
  return {
    name: 'forge-whoop-dev-proxy',
    configureServer(server) {
      attachWhoopRoutes(server.middlewares)
    },
    configurePreviewServer(server) {
      attachWhoopRoutes(server.middlewares)
    },
  }
}
