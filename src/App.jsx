import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DAYS, SCHEDULE, SHIELD, WEIGHTED, quoteOfWeek,
  mondayIndex, mondayOfWeek, dateKey, WEEKDAY_LABELS
} from './data.js'
import {
  loadCache, createSync,
  getPasscode, setPasscode, clearPasscode,
  isUnlocked, markUnlocked, lockNow
} from './storage.js'
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

const accentForDay = id => DAYS.find(d => d.id === id)?.accent || '#dc2626'

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
    setPrefs({ units: state.prefs.units === 'kg' ? 'lbs' : 'kg' })

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
          onToggleTheme={toggleTheme}
          onToggleUnits={toggleUnits}
          onLock={handleLockNow}
          tab={tab} setTab={setTab}
        />

        <main style={{ paddingTop: 14 }}>
          {tab === 'today'   && <TodayView   t={t} state={state} setState={setState} />}
          {tab === 'week'    && <WeekView    t={t} state={state} setState={setState} setTab={setTab} />}
          {tab === 'history' && <HistoryView t={t} state={state} />}
          {tab === 'prs'     && <PRsView     t={t} state={state} />}
        </main>
      </div>
    </div>
  )
}

/* ─────────── Modal: portal + scroll lock ─────────── */

function Modal({ onCancel, children, zIndex = 80 }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return createPortal(
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      {children}
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

function Header({ t, state, status, onToggleTheme, onToggleUnits, onLock, tab, setTab }) {
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

function TodayView({ t, state, setState }) {
  const today = new Date()
  const defaultDay = state.prefs.selectedDay || DAYS[mondayIndex(today)].id
  const [activeDay, setActiveDay] = useState(defaultDay)
  const [sheet, setSheet] = useState(null) // { exercise }

  useEffect(() => {
    if (state.prefs.selectedDay !== activeDay) {
      setState(s => ({ ...s, prefs: { ...s.prefs, selectedDay: activeDay } }))
    }
  }, [activeDay])

  const day = DAYS.find(d => d.id === activeDay)
  const groups = SCHEDULE[activeDay] || []
  const dKey = dateKey(today)
  const session = state.sessions[dKey]
  const sameDayActive = session?.day === activeDay
  const logs = sameDayActive ? (session.logs || {}) : {}

  const flat = groups.flatMap(g => g.items.map(i => i.name))
  const doneCount = flat.filter(n => logs[n]?.done).length
  const totalCount = flat.length
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  const quote = quoteOfWeek(today)

  const writeLog = (name, payload) => {
    setState(s => {
      const day = activeDay
      const prev = s.sessions[dKey]
      const sess = prev && prev.day === day ? prev : { day, logs: {} }
      const logs = { ...sess.logs }
      if (payload === null) delete logs[name]
      else logs[name] = { ...(logs[name] || {}), ...payload, ts: Date.now() }
      return { ...s, sessions: { ...s.sessions, [dKey]: { ...sess, logs } } }
    })
  }

  const onToggle = (item) => {
    const cur = logs[item.name]
    if (cur?.done) {
      writeLog(item.name, null)
      return
    }
    if (WEIGHTED.has(item.name)) {
      setSheet({ exercise: item, prevWeight: cur?.weight || '' })
    } else {
      writeLog(item.name, { done: true })
    }
  }

  return (
    <div className="fade">
      {/* Day picker */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6,
        marginBottom: 14
      }}>
        {DAYS.map(d => {
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
      <Card t={t} style={{ marginBottom: 12, borderLeft: `4px solid ${day.accent}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 26 }}>{day.emoji}</div>
          <div style={{ flex: 1 }}>
            <div className="heading" style={{
              fontSize: 11, letterSpacing: '0.18em', color: t.sub
            }}>{day.id} · {dateKey(today)}</div>
            <div className="heading" style={{ fontSize: 16, fontWeight: 700 }}>{day.title}</div>
          </div>
        </div>
        {activeDay !== 'D7' && (
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
                width: `${pct}%`, height: '100%', background: day.accent,
                transition: 'width 0.25s ease'
              }} />
            </div>
          </div>
        )}
      </Card>

      {/* Quote of week */}
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

      {activeDay === 'D7' ? (
        <Card t={t} style={{ textAlign: 'center', padding: '34px 18px' }}>
          <div style={{ fontSize: 56 }}>💤</div>
          <div className="heading" style={{ fontSize: 18, marginTop: 8, fontWeight: 700 }}>REST DAY</div>
          <div style={{ color: t.sub, marginTop: 8, fontSize: 13 }}>Light walking only. Recover hard.</div>
        </Card>
      ) : (
        groups.map(g => (
          <GroupCard key={g.group} t={t} title={g.group} accent={day.accent}>
            {g.items.map(item => (
              <ExerciseRow
                key={item.name}
                t={t}
                item={item}
                log={logs[item.name]}
                units={state.prefs.units}
                onToggle={() => onToggle(item)}
                onEditWeight={() => setSheet({ exercise: item, prevWeight: logs[item.name]?.weight || '' })}
              />
            ))}
          </GroupCard>
        ))
      )}

      <ShieldSection t={t} state={state} dKey={dKey} setState={setState} />

      {sheet && (
        <WeightSheet
          t={t}
          item={sheet.exercise}
          units={state.prefs.units}
          initial={sheet.prevWeight}
          onCancel={() => setSheet(null)}
          onSave={(weight) => {
            writeLog(sheet.exercise.name, { done: true, weight, units: state.prefs.units })
            setSheet(null)
          }}
        />
      )}
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

function GroupCard({ t, title, children, accent }) {
  return (
    <Card t={t} style={{ marginBottom: 10 }}>
      <div className="heading" style={{
        fontSize: 11, letterSpacing: '0.2em', color: t.sub, marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        {accent && <span style={{ width: 6, height: 6, borderRadius: 999, background: accent }} />}
        {title.toUpperCase()}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </Card>
  )
}

function ExerciseRow({ t, item, log, units, onToggle, onEditWeight }) {
  const isDone = !!log?.done
  const isWeighted = WEIGHTED.has(item.name)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 4px',
      borderRadius: 10
    }}>
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

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, color: t.text, fontWeight: 500,
          textDecoration: isDone ? 'line-through' : 'none',
          opacity: isDone ? 0.65 : 1
        }}>{item.name}</div>
        <div style={{ fontSize: 11, color: t.sub, marginTop: 2 }}>{item.detail}</div>
      </div>

      {isWeighted && isDone && log?.weight != null && (
        <button onClick={onEditWeight} style={{
          fontSize: 12, color: t.text, background: t.soft,
          border: `1px solid ${t.border}`, borderRadius: 8,
          padding: '4px 8px', fontWeight: 600
        }}>
          {log.weight}{log.units || units}
        </button>
      )}
    </div>
  )
}

/* ─────────── Weight bottom sheet ─────────── */

function WeightSheet({ t, item, units, initial, onCancel, onSave }) {
  const [val, setVal] = useState(String(initial || ''))
  const submit = (e) => {
    e?.preventDefault?.()
    const n = Number(val)
    if (!Number.isFinite(n) || n <= 0) return
    onSave(n)
  }
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
          maxHeight: '85vh', overflowY: 'auto'
        }}>
        <div style={{
          width: 40, height: 4, borderRadius: 4, background: t.border,
          margin: '0 auto 14px'
        }} />
        <div className="heading" style={{
          fontSize: 11, letterSpacing: '0.2em', color: t.sub
        }}>WEIGHT USED</div>
        <div className="heading" style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{item.name}</div>
        <div style={{ color: t.sub, fontSize: 12, marginTop: 2 }}>{item.detail}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <input
            autoFocus type="number" inputMode="decimal" step="0.5"
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
          }}>{units.toUpperCase()}</div>
        </div>

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
      {SHIELD.map(g => (
        <div key={g.group} style={{ marginBottom: 10 }}>
          <div className="heading" style={{
            fontSize: 11, letterSpacing: '0.12em', color: t.sub, marginBottom: 6
          }}>{g.group}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {g.items.map(item => {
              const done = !!checks[item.name]?.done
              return (
                <button key={item.name} onClick={() => toggle(item.name)} style={{
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

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    return { date: d, key: dateKey(d), idx: i, dayDef: DAYS[i] }
  })

  const goToDay = (dayId) => {
    setState(s => ({ ...s, prefs: { ...s.prefs, selectedDay: dayId } }))
    setTab('today')
  }

  return (
    <div className="fade">
      <div className="heading" style={{
        fontSize: 12, letterSpacing: '0.2em', color: t.sub, marginBottom: 10
      }}>THIS WEEK · {WEEKDAY_LABELS[todayIdx]} {dateKey(today)}</div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6,
        marginBottom: 18
      }}>
        {days.map(d => {
          const sess = state.sessions[d.key]
          const matchesPlan = sess && sess.day === d.dayDef.id
          const total = SCHEDULE[d.dayDef.id]?.reduce((a, g) => a + g.items.length, 0) || 0
          const done = matchesPlan ? Object.values(sess.logs || {}).filter(l => l.done).length : 0
          const isToday = d.idx === todayIdx
          const complete = total > 0 && done >= total

          return (
            <button key={d.key} onClick={() => goToDay(d.dayDef.id)}
              className={complete && isToday ? 'pulse-today' : ''}
              style={{
                background: t.card,
                border: `1px solid ${complete ? d.dayDef.accent : t.border}`,
                borderRadius: 12, padding: '12px 4px',
                position: 'relative',
                boxShadow: complete ? `inset 0 0 0 2px ${d.dayDef.accent}33` : 'none'
              }}>
              {isToday && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 6, height: 6, borderRadius: 999,
                  background: d.dayDef.accent
                }} />
              )}
              <div style={{ fontSize: 18 }}>{d.dayDef.emoji}</div>
              <div className="heading" style={{
                fontSize: 10, letterSpacing: '0.1em', marginTop: 4, color: t.sub
              }}>{WEEKDAY_LABELS[d.idx]}</div>
              <div className="heading" style={{
                fontSize: 12, fontWeight: 700, color: t.text, marginTop: 2
              }}>{d.dayDef.id}</div>
              <div style={{ fontSize: 10, color: t.sub, marginTop: 4 }}>
                {total ? `${done}/${total}` : '—'}
              </div>
            </button>
          )
        })}
      </div>

      <div className="heading" style={{
        fontSize: 11, letterSpacing: '0.2em', color: t.sub, marginBottom: 8
      }}>FULL WEEK PLAN</div>

      {DAYS.map(d => (
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
              <div className="heading" style={{ fontSize: 13, fontWeight: 700 }}>{d.id} — {d.title}</div>
              <div style={{ fontSize: 11, color: t.sub, marginTop: 4 }}>
                {(SCHEDULE[d.id] || []).map(g => g.group).join(' · ')}
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
        const accent = accentForDay(sess.day)
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
                  {sess.day} · {prettyDate(k)}
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
                    {v.weight != null
                      ? <span style={{ fontWeight: 700, color: t.text }}>
                          {v.weight}{v.units || ''}
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
  const records = useMemo(() => {
    const map = new Map()
    for (const [k, sess] of Object.entries(state.sessions)) {
      if (k.startsWith('__')) continue
      for (const [name, v] of Object.entries(sess.logs || {})) {
        if (v.weight == null) continue
        const w = Number(v.weight); if (!Number.isFinite(w)) continue
        const cur = map.get(name)
        if (!cur || w > cur.weight) map.set(name, { name, weight: w, units: v.units || '', date: k })
      }
    }
    return [...map.values()].sort((a, b) => b.weight - a.weight)
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
              {r.weight}<span style={{
                fontSize: 11, color: t.sub, marginLeft: 4
              }}>{r.units}</span>
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
