import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  isWeighted, LIBRARY, PROGRAM_LIST, quoteOfWeek,
  mondayIndex, mondayOfWeek, dateKey, prettyDayDate, WEEKDAY_LABELS
} from './data.js'
import {
  loadCache, createSync,
  getPasscode, setPasscode, clearPasscode,
  isUnlocked, markUnlocked, lockNow,
  getLastWeightKg, getPRKg
} from './storage.js'
import {
  toKg, formatWeight, formatNumber
} from './units.js'
import {
  addExercise, removeExercise, addGroup, removeGroup, renameGroup,
  resetDay, presetProgram
} from './program.js'
import {
  supportsBiometric, platformAuthenticatorAvailable,
  hasBiometric, enrollBiometric, verifyBiometric
} from './biometric.js'

const THEMES = {
  dark: {
    pageBg: '#0a0908', card: '#141210', border: '#272320', text: '#e8e0d5',
    sub: '#9a9183', accent: '#dc2626', soft: '#1c1815', input: '#0f0d0b'
  },
  light: {
    pageBg: '#f0ebe3', card: '#faf7f2', border: '#ddd5c8', text: '#1e1710',
    sub: '#6b6356', accent: '#dc2626', soft: '#f4efe6', input: '#fffdf8'
  }
}

// Search every program in state.programs for a day with this id.
const findDay = (state, id) => {
  if (!id) return null
  for (const prog of Object.values(state?.programs || {})) {
    const d = prog?.days?.find(d => d.id === id)
    if (d) return d
  }
  return null
}
const accentForDay = (state, id) => findDay(state, id)?.accent || '#dc2626'

const activeProgram = (state) =>
  state?.programs?.[state?.prefs?.activeProgramId] || state?.programs?.hybrid

export default function App() {
  const [state, setStateRaw] = useState(loadCache)
  const [tab, setTab] = useState('today')
  const [status, setStatus] = useState('idle')
  const [authState, setAuthState] = useState(() => isUnlocked() ? 'unlocked' : 'locked')
  const syncRef = useRef(null)

  // Sync controller — only active when unlocked.
  useEffect(() => {
    if (authState !== 'unlocked') return

    const sync = createSync({
      onStatus: setStatus,
      onRemoteState: (next) => setStateRaw(next),
      onAuthRequired: () => {
        // Server rejected our PIN — wipe the bad copy and re-lock.
        clearPasscode()
        lockNow()
        setAuthState('locked')
      }
    })
    syncRef.current = sync
    sync.bootstrap().then(initial => initial && setStateRaw(initial))

    const onVisible = () => {
      if (document.visibilityState === 'visible') sync.refresh()
      else sync.flushNow()
    }
    const onOnline = () => sync.flushNow()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      sync.flushNow()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [authState])

  const setState = (next) => {
    setStateRaw(prev => {
      const value = typeof next === 'function' ? next(prev) : next
      syncRef.current?.save(value)
      return value
    })
  }

  const handleUnlocked = ({ pinJustEntered } = {}) => {
    markUnlocked()
    if (pinJustEntered && supportsBiometric() && !hasBiometric()) {
      setAuthState('setup-bio')
    } else {
      setAuthState('unlocked')
    }
  }
  const handleLockNow = () => { lockNow(); setAuthState('locked') }

  const t = THEMES[state.prefs.theme]
  useEffect(() => {
    document.documentElement.style.background = t.pageBg
    document.body.style.background = t.pageBg
    document.body.style.color = t.text
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', t.pageBg)
  }, [t])

  const setPrefs = patch => setState(s => ({ ...s, prefs: { ...s.prefs, ...patch } }))

  const toggleTheme = () =>
    setPrefs({ theme: state.prefs.theme === 'dark' ? 'light' : 'dark' })
  const toggleUnits = () =>
    setPrefs({ units: state.prefs.units === 'kg' ? 'lb' : 'kg' })

  // Toast queue
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(0)
  const flashToast = (msg, ms = 2500) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }

  // Online indicator
  const [online, setOnline] = useState(typeof navigator === 'undefined' || navigator.onLine)
  useEffect(() => {
    const u = () => setOnline(navigator.onLine)
    window.addEventListener('online', u)
    window.addEventListener('offline', u)
    return () => {
      window.removeEventListener('online', u)
      window.removeEventListener('offline', u)
    }
  }, [])

  if (authState === 'locked') {
    return <LockScreen t={t} onUnlocked={handleUnlocked} />
  }
  if (authState === 'setup-bio') {
    return <BioSetup t={t} onDone={() => setAuthState('unlocked')} />
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: t.pageBg,
      color: t.text,
      paddingBottom: 24
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px' }}>
        <Header
          t={t} state={state}
          status={status}
          streak={computeStreak(state)}
          onToggleTheme={toggleTheme}
          onToggleUnits={toggleUnits}
          onLock={handleLockNow}
          tab={tab} setTab={setTab}
        />
        {!online && (
          <div className="heading" style={{
            background: '#d97706', color: '#fff',
            padding: '8px 12px', borderRadius: 10,
            fontSize: 11, letterSpacing: '0.12em', fontWeight: 700,
            marginTop: 10, textAlign: 'center'
          }}>OFFLINE — CHANGES SYNC WHEN BACK</div>
        )}

        <main style={{ paddingTop: 14 }}>
          {tab === 'today'   && <TodayView   t={t} state={state} setState={setState} onPRToast={flashToast} />}
          {tab === 'week'    && <WeekView    t={t} state={state} setState={setState} setTab={setTab} />}
          {tab === 'history' && <HistoryView t={t} state={state} />}
          {tab === 'prs'     && <PRsView     t={t} state={state} />}
        </main>
      </div>

      {toast && (
        <div className="fade" style={{
          position: 'fixed', left: '50%', bottom: 'calc(env(safe-area-inset-bottom) + 24px)',
          transform: 'translateX(-50%)',
          background: t.card, border: `1px solid ${t.accent}`,
          color: t.text, padding: '12px 18px', borderRadius: 14,
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
          zIndex: 100, maxWidth: 'calc(100vw - 32px)',
          textAlign: 'center'
        }}>{toast}</div>
      )}
    </div>
  )
}

function computeStreak(state) {
  const dates = Object.keys(state.sessions || {})
    .filter(k => !k.startsWith('__'))
    .filter(k => Object.values(state.sessions[k]?.logs || {}).some(l => l?.done))
    .sort((a, b) => b.localeCompare(a))
  if (!dates.length) return 0
  const today = dateKey(new Date())
  const yesterday = dateKey(new Date(Date.now() - 86400000))
  if (dates[0] !== today && dates[0] !== yesterday) return 0
  let streak = 0
  let cursor = new Date(dates[0] + 'T12:00:00')
  for (const d of dates) {
    if (d === dateKey(cursor)) { streak++; cursor.setDate(cursor.getDate() - 1) }
    else break
  }
  return streak
}

/* ─────────── Modal: portal + scroll lock + keyboard-aware ─────────── */

function Modal({ onCancel, children, zIndex = 80 }) {
  const [kbOffset, setKbOffset] = useState(0)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const vv = window.visualViewport
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (!vv) { setKbOffset(0); return }
        // Distance the keyboard occupies from the bottom of the layout viewport.
        const offset = window.innerHeight - vv.height - vv.offsetTop
        setKbOffset(Math.max(0, Math.round(offset)))
      })
    }
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    return () => {
      cancelAnimationFrame(raf)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      document.body.style.overflow = prev
    }
  }, [])

  return createPortal(
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div style={{
        width: '100%', display: 'flex', justifyContent: 'center',
        transform: `translateY(-${kbOffset}px)`,
        transition: 'transform 0.18s ease'
      }}>
        {children}
      </div>
    </div>,
    document.body
  )
}

/* ─────────── Lock screen + PIN pad + biometrics ─────────── */

function LockScreen({ t, onUnlocked }) {
  const [shake, setShake] = useState(false)
  const [bioReady, setBioReady] = useState(false)
  const [bioBusy, setBioBusy] = useState(false)
  const [bioError, setBioError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const ok = hasBiometric() && await platformAuthenticatorAvailable()
      if (!cancelled) setBioReady(ok)
    })()
    return () => { cancelled = true }
  }, [])

  const tryBiometric = async () => {
    setBioBusy(true); setBioError('')
    try {
      const ok = await verifyBiometric()
      if (ok) onUnlocked({ pinJustEntered: false })
    } catch (e) {
      setBioError('Face ID failed — use PIN instead.')
    } finally {
      setBioBusy(false)
    }
  }

  const tryPin = async (pin) => {
    if (navigator.vibrate) navigator.vibrate(20)
    // Verify against the server.
    try {
      const r = await fetch('/api/state', {
        headers: { authorization: `Bearer ${pin}` }
      })
      if (r.ok) {
        setPasscode(pin)
        onUnlocked({ pinJustEntered: true })
        return true
      }
      if (r.status === 401) {
        if (navigator.vibrate) navigator.vibrate([60, 30, 60])
        setShake(true); setTimeout(() => setShake(false), 400)
        return false
      }
    } catch {
      // Offline: accept if it matches what we already had.
      const stored = getPasscode()
      if (stored && stored === pin) {
        onUnlocked({ pinJustEntered: false })
        return true
      }
    }
    setShake(true); setTimeout(() => setShake(false), 400)
    return false
  }

  return (
    <div style={{
      minHeight: '100dvh', background: t.pageBg, color: t.text,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center',
      padding: 'calc(env(safe-area-inset-top) + 24px) 18px calc(env(safe-area-inset-bottom) + 24px)'
    }}>
      <h1 className="heading" style={{
        fontSize: 30, fontWeight: 800, letterSpacing: '0.22em',
        marginBottom: 4, color: t.text
      }}>
        <span style={{ color: t.accent }}>IRON</span> LOG
      </h1>
      <div style={{ color: t.sub, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 36 }}>
        Locked
      </div>

      {bioReady && (
        <button onClick={tryBiometric} disabled={bioBusy}
          className="no-select"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 8, marginBottom: 28,
            background: 'transparent', color: t.text
          }}>
          <div style={{
            width: 64, height: 64, borderRadius: 999,
            background: t.card, border: `1px solid ${t.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30
          }}>{bioBusy ? '…' : '🫆'}</div>
          <div className="heading" style={{
            fontSize: 11, letterSpacing: '0.18em', color: t.sub
          }}>{bioBusy ? 'WAITING…' : 'TAP FOR FACE ID'}</div>
        </button>
      )}

      <div className={shake ? 'shake' : ''}>
        <PinPad t={t} onSubmit={tryPin} />
      </div>

      {bioError && (
        <div style={{ color: t.accent, fontSize: 11, marginTop: 14 }}>{bioError}</div>
      )}
    </div>
  )
}

function PinPad({ t, onSubmit }) {
  const [val, setVal] = useState('')
  const len = 4

  const submit = async (pin) => {
    const ok = await onSubmit(pin)
    if (!ok) setVal('')
  }

  const press = (digit) => {
    if (val.length >= len) return
    if (navigator.vibrate) navigator.vibrate(10)
    const next = val + digit
    setVal(next)
    if (next.length === len) submit(next)
  }
  const back = () => {
    if (navigator.vibrate) navigator.vibrate(10)
    setVal(v => v.slice(0, -1))
  }

  const keys = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['',  '0', '⌫']
  ]

  return (
    <div className="no-select">
      {/* dots */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 28
      }}>
        {Array.from({ length: len }, (_, i) => {
          const filled = i < val.length
          return (
            <span key={i} className={filled ? 'pin-pop' : ''} style={{
              width: 14, height: 14, borderRadius: 999,
              background: filled ? t.accent : 'transparent',
              border: `2px solid ${filled ? t.accent : t.border}`,
              transition: 'background 0.1s'
            }} />
          )
        })}
      </div>

      {/* keys */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 76px)',
        gap: 14, justifyContent: 'center'
      }}>
        {keys.flat().map((k, i) => {
          if (!k) return <span key={i} />
          if (k === '⌫') return (
            <button key={i} onClick={back} className="tap-key"
              style={keyStyle(t, true)}>
              <span style={{ fontSize: 20 }}>⌫</span>
            </button>
          )
          return (
            <button key={i} onClick={() => press(k)} className="tap-key heading"
              style={keyStyle(t, false)}>{k}</button>
          )
        })}
      </div>
    </div>
  )
}

const keyStyle = (t, ghost) => ({
  width: 76, height: 76, borderRadius: 999,
  background: ghost ? 'transparent' : t.card,
  border: ghost ? 'none' : `1px solid ${t.border}`,
  color: t.text,
  fontFamily: 'Unbounded, sans-serif',
  fontSize: 28, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
})

function BioSetup({ t, onDone }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    platformAuthenticatorAvailable().then(setSupported)
  }, [])

  const enable = async () => {
    setBusy(true); setErr('')
    try {
      await enrollBiometric()
      onDone()
    } catch (e) {
      setErr('Could not enable Face ID. Try again or skip.')
    } finally { setBusy(false) }
  }

  return (
    <div style={{
      minHeight: '100dvh', background: t.pageBg, color: t.text,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      padding: 'calc(env(safe-area-inset-top) + 24px) 24px calc(env(safe-area-inset-bottom) + 24px)'
    }}>
      <div style={{ fontSize: 64 }}>🫆</div>
      <h1 className="heading" style={{
        fontSize: 22, fontWeight: 800, letterSpacing: '0.06em', marginTop: 20
      }}>Enable Face ID?</h1>
      <p style={{ color: t.sub, fontSize: 14, lineHeight: 1.5, marginTop: 12, maxWidth: 320 }}>
        Skip the PIN next time. Your face never leaves this device — IRON LOG just asks the OS if it's you.
      </p>
      {!supported && (
        <p style={{ color: t.sub, fontSize: 11, marginTop: 12 }}>
          (Not available on this device — you can skip.)
        </p>
      )}
      {err && <p style={{ color: t.accent, fontSize: 12, marginTop: 14 }}>{err}</p>}

      <div style={{ display: 'flex', gap: 10, marginTop: 28, width: '100%', maxWidth: 360 }}>
        <button onClick={onDone} className="heading" style={{
          flex: 1, padding: '14px 0', borderRadius: 12,
          background: t.soft, border: `1px solid ${t.border}`,
          color: t.text, fontWeight: 700, letterSpacing: '0.06em', fontSize: 13
        }}>SKIP</button>
        <button onClick={enable} disabled={busy || !supported} className="heading" style={{
          flex: 2, padding: '14px 0', borderRadius: 12,
          background: t.accent, color: '#fff',
          fontWeight: 800, letterSpacing: '0.06em', fontSize: 13,
          opacity: (busy || !supported) ? 0.6 : 1
        }}>{busy ? 'WAITING…' : 'ENABLE FACE ID'}</button>
      </div>
    </div>
  )
}

/* ─────────────────── Header ─────────────────── */

function Header({ t, state, status, streak = 0, onToggleTheme, onToggleUnits, onLock, tab, setTab }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: t.pageBg,
      paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
      paddingBottom: 8,
      borderBottom: `1px solid ${t.border}`,
      marginBottom: 4
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h1 className="heading" style={{
          fontSize: 22, fontWeight: 800, letterSpacing: '0.18em', color: t.text,
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span><span style={{ color: t.accent }}>IRON</span> LOG</span>
          <SyncDot t={t} status={status} />
          {streak >= 2 && (
            <span title={`${streak}-day streak`} style={{
              fontFamily: 'DM Mono', fontSize: 10, fontWeight: 500,
              color: t.sub, letterSpacing: '0.08em'
            }}>🔥 {streak}</span>
          )}
        </h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <IconBtn t={t} title="Lock now" onClick={onLock}>🔒</IconBtn>
          <IconBtn t={t} title="Units" onClick={onToggleUnits}>
            <span style={{ fontFamily: 'Unbounded', fontSize: 11, fontWeight: 700 }}>
              {state.prefs.units.toUpperCase()}
            </span>
          </IconBtn>
          <IconBtn t={t} title="Theme" onClick={onToggleTheme}>
            {state.prefs.theme === 'dark' ? '☀️' : '🌙'}
          </IconBtn>
        </div>
      </div>
      <Tabs t={t} tab={tab} setTab={setTab} />
    </header>
  )
}

function SyncDot({ t, status }) {
  const map = {
    loading: { color: '#d97706', label: 'Loading' },
    saving:  { color: '#d97706', label: 'Saving…' },
    synced:  { color: '#16a34a', label: 'Synced' },
    offline: { color: '#9a9183', label: 'Offline' },
    error:   { color: '#dc2626', label: 'Error' },
    idle:    { color: '#9a9183', label: 'Ready' }
  }
  const s = map[status] || map.idle
  return (
    <span title={s.label} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'DM Mono', fontSize: 9, fontWeight: 400,
      letterSpacing: '0.12em', color: t.sub, textTransform: 'uppercase'
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: 999,
        background: s.color,
        boxShadow: status === 'saving' ? `0 0 6px ${s.color}` : 'none',
        transition: 'background 0.2s'
      }} />
      {s.label}
    </span>
  )
}

function IconBtn({ t, onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 38, height: 38, borderRadius: 10,
        background: t.card, border: `1px solid ${t.border}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, color: t.text
      }}
    >{children}</button>
  )
}

function Tabs({ t, tab, setTab }) {
  const tabs = [
    { id: 'today',   label: 'TODAY' },
    { id: 'week',    label: 'WEEK' },
    { id: 'history', label: 'HISTORY' },
    { id: 'prs',     label: 'PRs' }
  ]
  return (
    <nav style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
      marginTop: 12
    }}>
      {tabs.map(x => {
        const active = tab === x.id
        return (
          <button key={x.id} onClick={() => setTab(x.id)}
            className="heading"
            style={{
              padding: '9px 6px', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em',
              background: active ? t.accent : t.card,
              color: active ? '#fff' : t.text,
              border: `1px solid ${active ? t.accent : t.border}`,
              borderRadius: 10
            }}
          >{x.label}</button>
        )
      })}
    </nav>
  )
}

/* ─────────────────── TODAY ─────────────────── */

function TodayView({ t, state, setState, onPRToast }) {
  const today = new Date()
  const program = activeProgram(state)
  const days = program?.days || []
  const defaultDay = state.prefs.selectedDay && days.find(d => d.id === state.prefs.selectedDay)
    ? state.prefs.selectedDay
    : days[0]?.id
  const [activeDay, setActiveDay] = useState(defaultDay)
  const [sheet, setSheet] = useState(null) // { exercise }
  const [editing, setEditing] = useState(false)
  const [picker, setPicker] = useState(null) // { groupId }
  const [resetMenu, setResetMenu] = useState(false)

  useEffect(() => {
    if (state.prefs.selectedDay !== activeDay) {
      setState(s => ({ ...s, prefs: { ...s.prefs, selectedDay: activeDay } }))
    }
  }, [activeDay])

  // When the user switches programs, fall back to the first day of the new
  // program if the previously-active day no longer exists.
  useEffect(() => {
    if (!days.find(d => d.id === activeDay) && days[0]) setActiveDay(days[0].id)
  }, [state.prefs.activeProgramId])

  const day = days.find(d => d.id === activeDay) || days[0]
  const groups = day?.groups || []
  const dKey = dateKey(today)
  const session = state.sessions[dKey]
  const sameDayActive = session?.day === activeDay
  const logs = sameDayActive ? (session.logs || {}) : {}

  const flat = groups.flatMap(g => g.items.map(i => i.name))
  const doneCount = flat.filter(n => logs[n]?.done).length
  const totalCount = flat.length
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  const quote = quoteOfWeek(today)
  const isRest = (day?.title || '').toLowerCase().includes('rest')

  const writeLog = (name, payload) => {
    setState(s => {
      const dayKey = activeDay
      const prev = s.sessions[dKey]
      const sess = prev && prev.day === dayKey ? prev : { day: dayKey, logs: {} }
      const logs = { ...sess.logs }
      if (payload === null) delete logs[name]
      else logs[name] = { ...(logs[name] || {}), ...payload, ts: Date.now() }
      return { ...s, sessions: { ...s.sessions, [dKey]: { ...sess, logs } } }
    })
  }

  const onToggle = (item) => {
    if (editing) return
    const cur = logs[item.name]
    if (cur?.done) {
      writeLog(item.name, null)
      return
    }
    if (item.weighted || isWeighted(item.name)) {
      setSheet({ exercise: item, prevKg: cur?.weightKg ?? null })
    } else {
      writeLog(item.name, { done: true })
    }
  }

  const onSaveWeight = (kg) => {
    if (!sheet) return
    const name = sheet.exercise.name
    const prevPR = getPRKg(state, name) ?? 0
    writeLog(name, { done: true, weightKg: kg })
    setSheet(null)
    if (kg != null && kg > prevPR && kg > 0) {
      onPRToast?.(`🏆 New PR — ${name} ${formatWeight(kg, state.prefs.units)}`)
    }
  }

  // Editor handlers ─────────────────────────────────────────
  const editProgram = (mutator) => setState(s => {
    const id = s.prefs.activeProgramId
    const prog = s.programs?.[id]
    if (!prog) return s
    return {
      ...s,
      programs: { ...s.programs, [id]: mutator(prog) }
    }
  })

  const switchProgram = (id) => {
    if (state.prefs.activeProgramId === id) return
    setState(s => ({ ...s, prefs: { ...s.prefs, activeProgramId: id, selectedDay: null } }))
  }

  return (
    <div className="fade">
      {/* Program switcher */}
      <ProgramSwitcher t={t}
        activeId={state.prefs.activeProgramId || 'hybrid'}
        onSwitch={switchProgram} />

      {/* Day picker */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${days.length}, 1fr)`, gap: 6,
        marginBottom: 14
      }}>
        {days.map(d => {
          const active = d.id === activeDay
          return (
            <button key={d.id} onClick={() => setActiveDay(d.id)}
              className="heading"
              style={{
                padding: '10px 0', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em',
                background: active ? d.accent : t.card,
                border: `1px solid ${active ? d.accent : t.border}`,
                color: active ? '#fff' : t.text,
                borderRadius: 10
              }}
            >{d.label}</button>
          )
        })}
      </div>

      {/* Day header card */}
      <Card t={t} style={{ marginBottom: 12, borderLeft: `4px solid ${day?.accent || t.accent}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 26 }}>{day?.emoji}</div>
          <div style={{ flex: 1 }}>
            <div className="heading" style={{
              fontSize: 11, letterSpacing: '0.18em', color: t.sub
            }}>{day?.label} · {prettyDayDate(today)}</div>
            <div className="heading" style={{ fontSize: 16, fontWeight: 700 }}>{day?.title}</div>
          </div>
          <button onClick={() => setEditing(v => !v)} title={editing ? 'Done' : 'Edit day'}
            className="heading" style={{
              padding: '6px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              borderRadius: 8,
              background: editing ? day?.accent : 'transparent',
              border: `1px solid ${editing ? day?.accent : t.border}`,
              color: editing ? '#fff' : t.text
            }}>{editing ? 'DONE' : '✏️ EDIT'}</button>
          {editing && (
            <button onClick={() => setResetMenu(true)} title="Reset"
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'transparent', border: `1px solid ${t.border}`,
                color: t.text, fontSize: 14
              }}>↺</button>
          )}
        </div>
        {!isRest && !editing && (
          <div style={{ marginTop: 12 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 11, color: t.sub, marginBottom: 6
            }}>
              <span>{doneCount} / {totalCount} complete</span>
              <span>{pct}%</span>
            </div>
            <div style={{
              height: 8, background: t.soft, borderRadius: 999, overflow: 'hidden',
              border: `1px solid ${t.border}`
            }}>
              <div style={{
                width: `${pct}%`, height: '100%', background: day?.accent || t.accent,
                transition: 'width 0.25s ease'
              }} />
            </div>
          </div>
        )}
      </Card>

      {/* Quote of week — hide while editing for focus */}
      {!editing && (
        <Card t={t} style={{ marginBottom: 12 }}>
          <div className="heading" style={{
            fontSize: 10, letterSpacing: '0.2em', color: t.sub, marginBottom: 6
          }}>QUOTE OF THE WEEK</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: t.text }}>
            “{quote.text}”
            {quote.author && (
              <span style={{ color: t.sub, marginLeft: 6, fontSize: 12 }}>
                — {quote.author}
              </span>
            )}
          </div>
        </Card>
      )}

      {isRest && !editing ? (
        <Card t={t} style={{ textAlign: 'center', padding: '34px 18px' }}>
          <div style={{ fontSize: 56 }}>{day?.emoji || '💤'}</div>
          <div className="heading" style={{ fontSize: 18, marginTop: 8, fontWeight: 700 }}>REST DAY</div>
          <div style={{ color: t.sub, marginTop: 8, fontSize: 13 }}>Light walking only. Recover hard.</div>
        </Card>
      ) : (
        groups.map(grp => {
          const groupComplete = grp.items.length > 0 &&
            grp.items.every(it => logs[it.name]?.done)
          return (
            <GroupCard key={grp.id} t={t}
              title={grp.name}
              accent={day?.accent}
              complete={!editing && groupComplete}
              editing={editing}
              onRename={(name) => editProgram(p => renameGroup(p, day.id, grp.id, name))}
              onDelete={() => {
                if (confirm(`Delete group "${grp.name}" and all its items?`))
                  editProgram(p => removeGroup(p, day.id, grp.id))
              }}
              onAddExercise={() => setPicker({ groupId: grp.id })}
            >
              {grp.items.map(item => (
                <ExerciseRow
                  key={item.id || item.name}
                  t={t}
                  item={item}
                  log={logs[item.name]}
                  units={state.prefs.units}
                  pr={getPRKg(state, item.name)}
                  editing={editing}
                  onToggle={() => onToggle(item)}
                  onEditWeight={() => setSheet({ exercise: item, prevKg: logs[item.name]?.weightKg ?? null })}
                  onDelete={() => editProgram(p => removeExercise(p, day.id, grp.id, item.id))}
                />
              ))}
            </GroupCard>
          )
        })
      )}

      {editing && (
        <button onClick={() => {
          const name = prompt('New group name?')
          if (name?.trim()) editProgram(p => addGroup(p, day.id, name.trim()))
        }} className="heading" style={{
          width: '100%', padding: 14, marginTop: 4,
          background: t.card, border: `1px dashed ${t.border}`,
          borderRadius: 12, color: t.sub,
          fontSize: 12, letterSpacing: '0.12em', fontWeight: 700
        }}>+ ADD GROUP</button>
      )}

      {!editing && <ShieldSection t={t} state={state} dKey={dKey} setState={setState} />}

      {sheet && (
        <WeightSheet
          t={t}
          item={sheet.exercise}
          units={state.prefs.units}
          initialKg={sheet.prevKg ?? getLastWeightKg(state, sheet.exercise.name)}
          onCancel={() => setSheet(null)}
          onSave={onSaveWeight}
        />
      )}

      {picker && (
        <LibraryPicker
          t={t}
          onCancel={() => setPicker(null)}
          onPick={(item) => {
            editProgram(p => addExercise(p, day.id, picker.groupId, {
              name: item.name, detail: item.detail, weighted: !!item.weighted
            }))
            setPicker(null)
          }}
        />
      )}

      {resetMenu && (
        <ResetMenu t={t}
          onCancel={() => setResetMenu(false)}
          onResetDay={() => {
            if (confirm(`Reset ${day?.label} to default?`))
              editProgram(p => resetDay(p, day.id))
            setResetMenu(false)
          }}
          onResetAll={() => {
            const id = state.prefs.activeProgramId || 'hybrid'
            const presetName = id === 'original' ? 'Original' : 'Hybrid Athletic'
            if (confirm(`Reset the ${presetName} plan to default?`))
              setState(s => ({
                ...s,
                programs: { ...s.programs, [id]: presetProgram(id) }
              }))
            setResetMenu(false)
          }}
        />
      )}
    </div>
  )
}

function ProgramSwitcher({ t, activeId, onSwitch }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 10
    }}>
      <span className="heading" style={{
        fontSize: 10, letterSpacing: '0.18em', color: t.sub
      }}>PROGRAM</span>
      <div style={{
        flex: 1,
        display: 'inline-flex', borderRadius: 999,
        background: t.card, border: `1px solid ${t.border}`,
        padding: 3
      }}>
        {PROGRAM_LIST.map(p => {
          const active = p.id === activeId
          return (
            <button key={p.id} onClick={() => onSwitch(p.id)} className="heading" style={{
              flex: 1, padding: '7px 10px',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              borderRadius: 999,
              background: active ? t.accent : 'transparent',
              color: active ? '#fff' : t.sub
            }}>{p.name.toUpperCase()}</button>
          )
        })}
      </div>
    </div>
  )
}

function Card({ t, children, style }) {
  return (
    <section style={{
      background: t.card, border: `1px solid ${t.border}`, borderRadius: 14,
      padding: 14, ...style
    }}>
      {children}
    </section>
  )
}

function GroupCard({
  t, title, children, accent, complete, editing,
  onRename, onDelete, onAddExercise
}) {
  const [renameInput, setRenameInput] = useState(null)
  const borderColor = complete ? '#16a34a' : t.border
  return (
    <Card t={t} style={{
      marginBottom: 10,
      border: `1px solid ${borderColor}`,
      transition: 'border-color 0.2s'
    }}>
      <div className="heading" style={{
        fontSize: 11, letterSpacing: '0.2em', color: complete ? '#16a34a' : t.sub,
        marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8
      }}>
        {accent && <span style={{
          width: 6, height: 6, borderRadius: 999,
          background: complete ? '#16a34a' : accent
        }} />}
        {renameInput != null ? (
          <input autoFocus value={renameInput}
            onChange={e => setRenameInput(e.target.value)}
            onBlur={() => { onRename?.(renameInput); setRenameInput(null) }}
            onKeyDown={e => {
              if (e.key === 'Enter') { onRename?.(renameInput); setRenameInput(null) }
              if (e.key === 'Escape') setRenameInput(null)
            }}
            style={{
              flex: 1, fontFamily: 'Unbounded', fontSize: 11,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              padding: '4px 6px', borderRadius: 6,
              background: t.input, color: t.text,
              border: `1px solid ${t.border}`, outline: 'none'
            }}
          />
        ) : (
          <span
            onClick={editing ? () => setRenameInput(title) : undefined}
            style={{
              flex: 1,
              cursor: editing ? 'text' : 'default',
              textTransform: 'uppercase'
            }}>{title}{complete && ' ✓'}</span>
        )}
        {editing && (
          <button onClick={onDelete} title="Delete group" style={{
            color: t.sub, fontSize: 14, padding: '0 4px'
          }}>🗑</button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
      {editing && (
        <button onClick={onAddExercise} className="heading" style={{
          marginTop: 10, width: '100%', padding: 10,
          background: 'transparent', border: `1px dashed ${t.border}`,
          borderRadius: 10, color: t.sub,
          fontSize: 11, letterSpacing: '0.12em', fontWeight: 700
        }}>+ ADD EXERCISE</button>
      )}
    </Card>
  )
}

function ExerciseRow({ t, item, log, units, pr, editing, onToggle, onEditWeight, onDelete }) {
  const isDone = !!log?.done
  const weighted = !!item.weighted || isWeighted(item.name)
  const hasPR = pr != null && pr > 0
  const isNewPR = isDone && weighted && log?.weightKg != null && log.weightKg > 0 && log.weightKg >= (pr || 0)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 4px',
      borderRadius: 10
    }}>
      {editing ? (
        <button onClick={onDelete} title="Delete" style={{
          width: 26, height: 26, borderRadius: 8,
          border: `2px solid ${t.border}`, background: 'transparent',
          color: t.accent, fontSize: 14, lineHeight: 1, flexShrink: 0
        }}>🗑</button>
      ) : (
        <button onClick={onToggle}
          aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
          style={{
            width: 26, height: 26, borderRadius: 8,
            border: `2px solid ${isDone ? '#16a34a' : t.border}`,
            background: isDone ? '#16a34a' : 'transparent',
            color: '#fff', fontSize: 14, lineHeight: 1,
            flexShrink: 0
          }}
        >{isDone ? '✓' : ''}</button>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, color: t.text, fontWeight: 500,
          textDecoration: isDone && !editing ? 'line-through' : 'none',
          opacity: isDone && !editing ? 0.65 : 1,
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap'
        }}>
          <span>{item.name}</span>
          {!editing && hasPR && weighted && !isNewPR && (
            <span title={`PR: ${formatWeight(pr, units)}`} style={{ fontSize: 12, opacity: 0.85 }}>🏆</span>
          )}
          {!editing && isNewPR && (
            <span className="pin-pop" style={{
              fontSize: 9, fontFamily: 'Unbounded', fontWeight: 800,
              letterSpacing: '0.12em',
              color: '#fff', background: t.accent,
              padding: '2px 6px', borderRadius: 6
            }}>🏆 NEW PR</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: t.sub, marginTop: 2 }}>{item.detail}</div>
      </div>

      {!editing && weighted && isDone && log?.weightKg != null && (
        <button onClick={onEditWeight} style={{
          fontSize: 12, color: t.text, background: t.soft,
          border: `1px solid ${t.border}`, borderRadius: 8,
          padding: '4px 8px', fontWeight: 600,
          fontFamily: 'Unbounded'
        }}>
          {formatWeight(log.weightKg, units)}
        </button>
      )}
    </div>
  )
}

/* ─────────── Weight bottom sheet ─────────── */

function WeightSheet({ t, item, units, initialKg, onCancel, onSave }) {
  // "Working unit" — defaults to global pref but user can flip *per entry*.
  const [unit, setUnit] = useState(units || 'kg')
  const [val, setVal] = useState(() => formatNumber(initialKg, units || 'kg'))

  const flipUnit = (next) => {
    if (next === unit) return
    // Re-render the input value in the new unit, preserving the kg amount.
    const kg = toKg(val, unit)
    setUnit(next)
    setVal(kg == null ? '' : formatNumber(kg, next))
  }

  const submit = (e) => {
    e?.preventDefault?.()
    if (val === '') return
    const kg = toKg(val, unit)
    if (kg == null || !Number.isFinite(kg) || kg < 0) return
    onSave(kg)
  }

  const setBW = () => onSave(0)

  return (
    <Modal onCancel={onCancel}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="sheet-enter"
        style={{
          width: '100%', maxWidth: 560,
          background: t.card, color: t.text,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          borderTop: `1px solid ${t.border}`,
          padding: '18px 18px calc(env(safe-area-inset-bottom) + 28px)',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
          maxHeight: 'calc(100dvh - 60px)', overflowY: 'auto'
        }}>
        <div style={{
          width: 40, height: 4, borderRadius: 4, background: t.border,
          margin: '0 auto 14px'
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div className="heading" style={{
              fontSize: 11, letterSpacing: '0.2em', color: t.sub
            }}>WEIGHT USED</div>
            <div className="heading" style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{item.name}</div>
            <div style={{ color: t.sub, fontSize: 12, marginTop: 2 }}>{item.detail}</div>
          </div>
          {/* KG | LB pill */}
          <div style={{
            display: 'inline-flex', borderRadius: 999,
            background: t.soft, border: `1px solid ${t.border}`,
            padding: 3
          }}>
            {['kg','lb'].map(u => {
              const active = u === unit
              return (
                <button key={u} type="button" onClick={() => flipUnit(u)}
                  className="heading"
                  style={{
                    padding: '6px 14px', fontSize: 11, fontWeight: 700,
                    letterSpacing: '0.1em', borderRadius: 999,
                    background: active ? t.accent : 'transparent',
                    color: active ? '#fff' : t.sub
                  }}>{u.toUpperCase()}</button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <input
            autoFocus type="number" inputMode="decimal" step="0.5" min="0"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="0"
            style={{
              flex: 1,
              fontFamily: 'Unbounded',
              fontSize: 28, fontWeight: 700, padding: '14px 16px',
              background: t.input, color: t.text,
              border: `1px solid ${t.border}`, borderRadius: 12, outline: 'none'
            }}
          />
          <div className="heading" style={{
            fontSize: 16, fontWeight: 700, color: t.sub, padding: '0 6px'
          }}>{unit.toUpperCase()}</div>
        </div>

        <button type="button" onClick={setBW} className="heading" style={{
          width: '100%', marginTop: 10, padding: 12, borderRadius: 10,
          background: 'transparent', border: `1px solid ${t.border}`,
          color: t.sub, fontSize: 11, letterSpacing: '0.18em', fontWeight: 700
        }}>BODYWEIGHT (NO LOAD)</button>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onCancel} style={{
            flex: 1, padding: '14px 0', borderRadius: 12,
            background: t.soft, border: `1px solid ${t.border}`,
            color: t.text, fontWeight: 700, letterSpacing: '0.06em', fontSize: 13
          }} className="heading">CANCEL</button>
          <button type="submit" style={{
            flex: 2, padding: '14px 0', borderRadius: 12,
            background: t.accent, color: '#fff',
            fontWeight: 800, letterSpacing: '0.06em', fontSize: 13
          }} className="heading">SAVE LIFT</button>
        </div>
      </form>
    </Modal>
  )
}

/* ─────────── Library Picker ─────────── */

function LibraryPicker({ t, onCancel, onPick }) {
  const [query, setQuery] = useState('')
  const [custom, setCustom] = useState(false)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return LIBRARY
    return LIBRARY.filter(x => x.name.toLowerCase().includes(q))
  }, [query])

  if (custom) return <CustomExercise t={t} onCancel={() => setCustom(false)} onSave={onPick} />

  return (
    <Modal onCancel={onCancel}>
      <div onClick={e => e.stopPropagation()} className="sheet-enter" style={{
        width: '100%', maxWidth: 560,
        background: t.card, color: t.text,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        borderTop: `1px solid ${t.border}`,
        padding: '14px 14px calc(env(safe-area-inset-bottom) + 14px)',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        maxHeight: 'calc(100dvh - 60px)'
      }}>
        <div style={{
          width: 40, height: 4, borderRadius: 4, background: t.border,
          margin: '0 auto 10px'
        }} />
        <div className="heading" style={{ fontSize: 11, letterSpacing: '0.2em', color: t.sub }}>EXERCISE LIBRARY</div>
        <input autoFocus type="search" value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search exercises…"
          style={{
            marginTop: 10,
            width: '100%', padding: '12px 14px',
            fontSize: 14, fontFamily: 'DM Mono',
            background: t.input, color: t.text,
            border: `1px solid ${t.border}`, borderRadius: 12, outline: 'none'
          }} />
        <div style={{ flex: 1, overflowY: 'auto', marginTop: 10, marginBottom: 10 }}>
          {filtered.map(item => (
            <button key={item.name} onClick={() => onPick(item)} style={{
              width: '100%', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 8px', borderRadius: 10,
              background: 'transparent', color: t.text,
              borderBottom: `1px solid ${t.border}`
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {item.name} {item.weighted && <span title="Weighted">⚖️</span>}
                </div>
                <div style={{ fontSize: 11, color: t.sub, marginTop: 2 }}>{item.detail}</div>
              </div>
            </button>
          ))}
          {!filtered.length && (
            <div style={{ padding: 24, textAlign: 'center', color: t.sub, fontSize: 13 }}>
              No matches.
            </div>
          )}
        </div>
        <button onClick={() => setCustom(true)} className="heading" style={{
          width: '100%', padding: 14, borderRadius: 12,
          background: t.soft, border: `1px solid ${t.border}`,
          color: t.text, fontWeight: 700, letterSpacing: '0.08em', fontSize: 12
        }}>+ CUSTOM EXERCISE</button>
      </div>
    </Modal>
  )
}

function CustomExercise({ t, onCancel, onSave }) {
  const [name, setName] = useState('')
  const [detail, setDetail] = useState('')
  const [weighted, setWeighted] = useState(false)
  const submit = (e) => {
    e?.preventDefault?.()
    if (!name.trim()) return
    onSave({ name: name.trim(), detail: detail.trim() || '—', weighted })
  }
  return (
    <Modal onCancel={onCancel}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="sheet-enter" style={{
        width: '100%', maxWidth: 560,
        background: t.card, color: t.text,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        borderTop: `1px solid ${t.border}`,
        padding: '18px 18px calc(env(safe-area-inset-bottom) + 28px)',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          width: 40, height: 4, borderRadius: 4, background: t.border,
          margin: '0 auto 14px'
        }} />
        <div className="heading" style={{ fontSize: 11, letterSpacing: '0.2em', color: t.sub }}>CUSTOM EXERCISE</div>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          placeholder="Exercise name (e.g. Goblet Squat)" style={inputStyle(t)} />
        <input value={detail} onChange={e => setDetail(e.target.value)}
          placeholder="Sets×reps or duration (e.g. 3×10)" style={{ ...inputStyle(t), marginTop: 10 }} />
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginTop: 14, fontSize: 13, color: t.text, cursor: 'pointer'
        }}>
          <input type="checkbox" checked={weighted}
            onChange={e => setWeighted(e.target.checked)}
            style={{ width: 18, height: 18 }} />
          Weighted (asks for weight when ticked)
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onCancel} className="heading" style={{
            flex: 1, padding: '14px 0', borderRadius: 12,
            background: t.soft, border: `1px solid ${t.border}`,
            color: t.text, fontWeight: 700, letterSpacing: '0.06em', fontSize: 13
          }}>CANCEL</button>
          <button type="submit" className="heading" style={{
            flex: 2, padding: '14px 0', borderRadius: 12,
            background: t.accent, color: '#fff',
            fontWeight: 800, letterSpacing: '0.06em', fontSize: 13
          }}>ADD</button>
        </div>
      </form>
    </Modal>
  )
}

function ResetMenu({ t, onCancel, onResetDay, onResetAll }) {
  return (
    <Modal onCancel={onCancel}>
      <div onClick={e => e.stopPropagation()} className="sheet-enter" style={{
        width: '100%', maxWidth: 560,
        background: t.card, color: t.text,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        borderTop: `1px solid ${t.border}`,
        padding: '18px 18px calc(env(safe-area-inset-bottom) + 18px)',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          width: 40, height: 4, borderRadius: 4, background: t.border,
          margin: '0 auto 14px'
        }} />
        <div className="heading" style={{ fontSize: 11, letterSpacing: '0.2em', color: t.sub }}>RESET</div>
        <button onClick={onResetDay} className="heading" style={resetBtnStyle(t)}>↺ RESET THIS DAY TO DEFAULT</button>
        <button onClick={onResetAll} className="heading" style={{ ...resetBtnStyle(t), color: t.accent, borderColor: t.accent }}>↺ RESET ENTIRE PLAN</button>
        <button onClick={onCancel} className="heading" style={{
          width: '100%', padding: '14px 0', marginTop: 6, borderRadius: 12,
          background: 'transparent', color: t.sub,
          fontWeight: 600, letterSpacing: '0.06em', fontSize: 12
        }}>CANCEL</button>
      </div>
    </Modal>
  )
}

const inputStyle = (t) => ({
  width: '100%', padding: '12px 14px',
  fontSize: 15, fontFamily: 'DM Mono',
  background: t.input, color: t.text,
  border: `1px solid ${t.border}`, borderRadius: 12, outline: 'none'
})

const resetBtnStyle = (t) => ({
  width: '100%', padding: '14px 0', marginTop: 8, borderRadius: 12,
  background: t.soft, border: `1px solid ${t.border}`,
  color: t.text, fontWeight: 700, letterSpacing: '0.06em', fontSize: 13
})

/* ─────────── Posture Shield ─────────── */

function ShieldSection({ t, state, dKey, setState }) {
  const shieldKey = `__shield__:${dKey}`
  const checks = state.sessions[shieldKey]?.logs || {}
  const toggle = (name) => {
    setState(s => {
      const cur = s.sessions[shieldKey] || { day: 'SHIELD', logs: {} }
      const logs = { ...cur.logs }
      if (logs[name]?.done) delete logs[name]
      else logs[name] = { done: true, ts: Date.now() }
      return { ...s, sessions: { ...s.sessions, [shieldKey]: { ...cur, logs } } }
    })
  }

  return (
    <Card t={t} style={{ marginTop: 16, marginBottom: 8 }}>
      <div className="heading" style={{
        fontSize: 12, letterSpacing: '0.18em', fontWeight: 700, marginBottom: 4
      }}>🛡️ DAILY POSTURE SHIELD</div>
      <div style={{ fontSize: 11, color: t.sub, marginBottom: 12 }}>Do every day to bulletproof joints.</div>
      {(state.shield || []).map(g => (
        <div key={g.id || g.name} style={{ marginBottom: 10 }}>
          <div className="heading" style={{
            fontSize: 11, letterSpacing: '0.12em', color: t.sub, marginBottom: 6
          }}>{g.name}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {g.items.map(item => {
              const done = !!checks[item.name]?.done
              return (
                <button key={item.id || item.name} onClick={() => toggle(item.name)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 4px', borderRadius: 8, textAlign: 'left'
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 6,
                    border: `2px solid ${done ? '#16a34a' : t.border}`,
                    background: done ? '#16a34a' : 'transparent',
                    color: '#fff', fontSize: 12,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>{done ? '✓' : ''}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, opacity: done ? 0.6 : 1, textDecoration: done ? 'line-through' : 'none' }}>{item.name}</div>
                    <div style={{ fontSize: 10.5, color: t.sub }}>{item.detail}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </Card>
  )
}

/* ─────────────────── WEEK ─────────────────── */

function WeekView({ t, state, setState, setTab }) {
  const today = new Date()
  const monday = mondayOfWeek(today)
  const todayIdx = mondayIndex(today)
  const program = activeProgram(state)
  const programDays = program?.days || []

  // Each weekday cell shows what was actually done that date (if anything),
  // looked up across ALL programs so old D1 history still colors correctly.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    const key = dateKey(d)
    const sess = state.sessions[key]
    const dayDef = sess ? findDay(state, sess.day) : null
    return { date: d, key, idx: i, sess, dayDef }
  })

  const goToDay = (dayId) => {
    setState(s => ({ ...s, prefs: { ...s.prefs, selectedDay: dayId } }))
    setTab('today')
  }

  return (
    <div className="fade">
      <div className="heading" style={{
        fontSize: 12, letterSpacing: '0.2em', color: t.sub, marginBottom: 10
      }}>THIS WEEK · {WEEKDAY_LABELS[todayIdx]} {prettyDayDate(today)}</div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6,
        marginBottom: 18
      }}>
        {days.map(d => {
          const isToday = d.idx === todayIdx
          const dayDef = d.dayDef
          const total = dayDef ? (dayDef.groups || []).reduce((a, g) => a + g.items.length, 0) : 0
          const done = d.sess ? Object.values(d.sess.logs || {}).filter(l => l.done).length : 0
          const accent = dayDef?.accent || t.border
          const complete = total > 0 && done >= total
          const onClick = () => {
            if (dayDef) goToDay(dayDef.id)
            else setTab('today')
          }
          return (
            <button key={d.key} onClick={onClick}
              className={complete && isToday ? 'pulse-today' : ''}
              style={{
                background: t.card,
                border: `1px solid ${complete ? accent : t.border}`,
                borderRadius: 12, padding: '12px 4px',
                position: 'relative',
                boxShadow: complete ? `inset 0 0 0 2px ${accent}33` : 'none'
              }}>
              {isToday && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 6, height: 6, borderRadius: 999,
                  background: dayDef?.accent || t.sub
                }} />
              )}
              <div style={{ fontSize: 18 }}>{dayDef?.emoji || '·'}</div>
              <div className="heading" style={{
                fontSize: 10, letterSpacing: '0.1em', marginTop: 4, color: t.sub
              }}>{WEEKDAY_LABELS[d.idx]}</div>
              <div className="heading" style={{
                fontSize: 12, fontWeight: 700, color: t.text, marginTop: 2
              }}>{dayDef?.label || '—'}</div>
              <div style={{ fontSize: 10, color: t.sub, marginTop: 4 }}>
                {d.sess ? (total ? `${done}/${total}` : `${done}`) : '—'}
              </div>
            </button>
          )
        })}
      </div>

      <div className="heading" style={{
        fontSize: 11, letterSpacing: '0.2em', color: t.sub, marginBottom: 8
      }}>FULL WEEK PLAN</div>

      {programDays.map(d => (
        <button key={d.id} onClick={() => goToDay(d.id)} style={{
          width: '100%', textAlign: 'left',
          background: t.card, border: `1px solid ${t.border}`,
          borderLeft: `4px solid ${d.accent}`,
          borderRadius: 12, padding: 12, marginBottom: 8,
          color: t.text
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{d.emoji}</span>
            <div style={{ flex: 1 }}>
              <div className="heading" style={{ fontSize: 13, fontWeight: 700 }}>{d.label} — {d.title}</div>
              <div style={{ fontSize: 11, color: t.sub, marginTop: 4 }}>
                {(d.groups || []).map(g => g.name).join(' · ')}
              </div>
            </div>
            <span style={{ color: t.sub, fontSize: 16 }}>›</span>
          </div>
        </button>
      ))}
    </div>
  )
}

/* ─────────────────── HISTORY ─────────────────── */

function HistoryView({ t, state }) {
  const units = state.prefs.units
  const entries = useMemo(() => {
    return Object.entries(state.sessions)
      .filter(([k]) => !k.startsWith('__'))
      .sort((a, b) => b[0].localeCompare(a[0]))
  }, [state.sessions])

  const [open, setOpen] = useState(() => new Set(entries[0] ? [entries[0][0]] : []))
  const toggle = (k) => setOpen(prev => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n
  })

  if (!entries.length) {
    return <Empty t={t} icon="📜" title="No history yet" body="Complete an exercise to see it here." />
  }

  return (
    <div className="fade">
      <div className="heading" style={{
        fontSize: 12, letterSpacing: '0.2em', color: t.sub, marginBottom: 10
      }}>SESSION HISTORY</div>

      {entries.map(([k, sess]) => {
        const exDone = Object.entries(sess.logs || {}).filter(([, v]) => v.done)
        if (!exDone.length) return null
        const isOpen = open.has(k)
        const accent = accentForDay(state, sess.day)
        const dayDef = findDay(state, sess.day)
        return (
          <div key={k} style={{
            background: t.card, border: `1px solid ${t.border}`,
            borderLeft: `4px solid ${accent}`,
            borderRadius: 12, marginBottom: 8, overflow: 'hidden'
          }}>
            <button onClick={() => toggle(k)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: 12, color: t.text, textAlign: 'left'
            }}>
              <div style={{ flex: 1 }}>
                <div className="heading" style={{ fontSize: 13, fontWeight: 700 }}>
                  {dayDef?.label || sess.day} · {prettyDate(k)}
                </div>
                <div style={{ fontSize: 11, color: t.sub, marginTop: 3 }}>
                  {exDone.length} exercise{exDone.length !== 1 ? 's' : ''} logged
                </div>
              </div>
              <span style={{ color: t.sub, fontSize: 14 }}>{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && (
              <div style={{ padding: '0 12px 12px' }}>
                {exDone.map(([name, v]) => (
                  <div key={name} style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 0', borderTop: `1px solid ${t.border}`,
                    fontSize: 13
                  }}>
                    <span>{name}</span>
                    {v.weightKg != null
                      ? <span style={{ fontWeight: 700, color: t.text, fontFamily: 'Unbounded' }}>
                          {formatWeight(v.weightKg, units)}
                        </span>
                      : <span style={{ color: t.sub, fontSize: 11 }}>✓ done</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function prettyDate(k) {
  const [y, m, d] = k.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/* ─────────────────── PRs ─────────────────── */

function PRsView({ t, state }) {
  const units = state.prefs.units
  const records = useMemo(() => {
    const map = new Map()
    for (const [k, sess] of Object.entries(state.sessions)) {
      if (k.startsWith('__')) continue
      for (const [name, v] of Object.entries(sess.logs || {})) {
        if (v.weightKg == null) continue
        const kg = Number(v.weightKg); if (!Number.isFinite(kg)) continue
        const cur = map.get(name)
        if (!cur || kg > cur.kg) map.set(name, { name, kg, date: k })
      }
    }
    return [...map.values()].sort((a, b) => b.kg - a.kg)
  }, [state.sessions])

  if (!records.length) {
    return <Empty t={t} icon="🏆" title="No PRs yet" body="Log a weighted lift to start setting records." />
  }

  return (
    <div className="fade">
      <div className="heading" style={{
        fontSize: 12, letterSpacing: '0.2em', color: t.sub, marginBottom: 10
      }}>PERSONAL RECORDS</div>

      {records.map((r, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
        return (
          <div key={r.name} style={{
            background: t.card,
            border: `1px solid ${medal ? t.accent : t.border}`,
            borderRadius: 12, padding: 12, marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <div style={{
              fontSize: 24, width: 36, textAlign: 'center'
            }}>{medal || `#${i + 1}`}</div>
            <div style={{ flex: 1 }}>
              <div className="heading" style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: t.sub, marginTop: 3 }}>
                {prettyDate(r.date)}
              </div>
            </div>
            <div className="heading" style={{
              fontSize: 18, fontWeight: 800, color: t.text
            }}>
              {formatWeight(r.kg, units)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Empty({ t, icon, title, body }) {
  return (
    <div className="fade" style={{
      textAlign: 'center', padding: '40px 20px',
      background: t.card, border: `1px solid ${t.border}`,
      borderRadius: 14
    }}>
      <div style={{ fontSize: 50 }}>{icon}</div>
      <div className="heading" style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>{title}</div>
      <div style={{ color: t.sub, fontSize: 13, marginTop: 6 }}>{body}</div>
    </div>
  )
}
