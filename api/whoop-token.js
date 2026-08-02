/**
 * Vercel serverless proxy for Whoop OAuth token exchange (avoids browser CORS).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const form = new URLSearchParams()
    for (const [k, v] of Object.entries(body ?? {})) {
      if (typeof v === 'string') form.set(k, v)
    }

    const upstream = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    const text = await upstream.text()
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Token proxy failed' })
  }
}
