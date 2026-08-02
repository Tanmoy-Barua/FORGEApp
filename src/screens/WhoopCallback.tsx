import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { exchangeWhoopCode, loadWhoopCredentials } from '../lib/whoop'

export function WhoopCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const expected = sessionStorage.getItem('forge_whoop_oauth_state')
    const creds = loadWhoopCredentials()

    if (!code) {
      setError('Missing authorization code from Whoop')
      return
    }
    if (!state || !expected || state !== expected) {
      setError('OAuth state mismatch — try Connect Whoop again')
      return
    }
    if (!creds?.clientId || !creds.clientSecret) {
      setError('Whoop Client ID/Secret missing — save them in Settings first')
      return
    }

    void exchangeWhoopCode(code, creds.clientId, creds.clientSecret)
      .then(() => {
        sessionStorage.removeItem('forge_whoop_oauth_state')
        navigate('/', { replace: true })
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Whoop connect failed')
      })
  }, [navigate])

  return (
    <div className="page">
      <h1 className="page-title">Whoop</h1>
      {error ? (
        <>
          <p style={{ color: 'var(--red)', marginBottom: 16 }}>{error}</p>
          <Link to="/" className="btn btn-primary btn-block">
            Back to Home
          </Link>
        </>
      ) : (
        <p className="page-sub">Finishing Whoop connection…</p>
      )}
    </div>
  )
}
