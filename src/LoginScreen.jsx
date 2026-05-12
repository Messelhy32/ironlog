import React, { useState } from 'react'
import { api, setToken } from './api.js'

export default function LoginScreen({ t, onLoggedIn }) {
  const [username, setUsername] = useState('me')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e?.preventDefault?.()
    setErr(''); setBusy(true)
    try {
      const { token } = await api.auth.login({ username, password })
      setToken(token)
      onLoggedIn?.()
    } catch (e) {
      setErr(e?.body?.error || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', background: t.pageBg, color: t.text,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center',
      padding: 'calc(env(safe-area-inset-top) + 24px) 24px calc(env(safe-area-inset-bottom) + 24px)'
    }}>
      <h1 className="heading" style={{
        fontSize: 30, fontWeight: 800, letterSpacing: '0.22em', marginBottom: 6, color: t.text
      }}>
        <span style={{ color: t.accent }}>IRON</span> LOG
      </h1>
      <div style={{ color: t.sub, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 32 }}>
        Sign in
      </div>

      <form onSubmit={submit} style={{ width: '100%', maxWidth: 360 }}>
        <input autoFocus type="text" value={username}
          onChange={e => setUsername(e.target.value)}
          autoComplete="username"
          placeholder="username"
          style={inp(t)} />
        <input type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="password"
          style={{ ...inp(t), marginTop: 10 }} />
        {err && <div style={{ color: t.accent, fontSize: 12, marginTop: 10 }}>{err}</div>}
        <button type="submit" disabled={busy || !password} className="heading" style={{
          width: '100%', padding: '14px 0', marginTop: 16, borderRadius: 12,
          background: t.accent, color: '#fff',
          fontWeight: 800, letterSpacing: '0.06em', fontSize: 13,
          opacity: (busy || !password) ? 0.6 : 1
        }}>{busy ? 'SIGNING IN…' : 'SIGN IN'}</button>
      </form>
    </div>
  )
}

const inp = (t) => ({
  width: '100%', padding: '14px 16px',
  fontSize: 15, fontFamily: 'DM Mono',
  background: t.input, color: t.text,
  border: `1px solid ${t.border}`, borderRadius: 12, outline: 'none'
})
