/**
 * Vercel serverless proxy for Whoop API GETs (avoids browser CORS).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const path = String(req.query.path ?? '')
  if (!path.startsWith('/')) {
    res.status(400).json({ error: 'path must start with /' })
    return
  }

  const auth = req.headers.authorization
  if (!auth) {
    res.status(401).json({ error: 'Missing Authorization' })
    return
  }

  try {
    const upstream = await fetch(`https://api.prod.whoop.com/developer/v2${path}`, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
    })
    const text = await upstream.text()
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(text)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Proxy failed' })
  }
}
