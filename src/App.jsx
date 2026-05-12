import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  quoteOfWeek, mondayIndex, mondayOfWeek,
  dateKey, prettyDayDate, WEEKDAY_LABELS
} from './data.js'
import { toKg, formatWeight, formatNumber } from './units.js'
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js'
import {
  useStore, getStore, actions,
  activeProgram, findDay, sessionFor, logsFor, getPRKg
} from './store.js'
import { connectRealtime, disconnectRealtime } from './realtime.js'
import LoginScreen from './LoginScreen.jsx'

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

const today = () => dateKey(new Date())

const accentForDayId = (store, id) => findDay(store, id)?.accent || '#dc2626'

// Look up the most recent weightKg ever logged for an exercise (any date).
const getLastWeightKg = (store, exerciseName) => {
  let latest = null
  for (const list of Object.values(store.sessionsByDate || {})) {
    for (const sess of list) {
      for (const l of sess.logs || []) {
        if (l.exerciseName !== exerciseName || l.weightKg == null) continue
        const t = new Date(l.ts).getTime()
        if (!latest || t > latest.t) latest = { kg: l.weightKg, t }
      }
    }
  }
  for (const sess of store.history || []) {
    for (const l of sess.logs || []) {
      if (l.exerciseName !== exerciseName || l.weightKg == null) continue
      const t = new Date(l.ts).getTime()
      if (!latest || t > latest.t) latest = { kg: l.weightKg, t }
    }
  }
  return latest ? latest.kg : null
}

const computeStreak = (store) => {
  const dates = new Set()
  for (const [d, list] of Object.entries(store.sessionsByDate || {})) {
    if (list?.some(s => (s.logs || []).some(l => l.done))) dates.add(d)
  }
  for (const s of store.history || []) {
    if ((s.logs || []).some(l => l.done)) dates.add(s.date)
  }
  const sorted = [...dates].sort((a, b) => b.localeCompare(a))
  if (!sorted.length) return 0
  const t = today()
  const y = dateKey(new Date(Date.now() - 86400000))
  if (sorted[0] !== t && sorted[0] !== y) return 0
  let streak = 0
  let cursor = new Date(sorted[0] + 'T12:00:00')
  for (const d of sorted) {
    if (d === dateKey(cursor)) { streak++; cursor.setDate(cursor.getDate() - 1) }
    else break
  }
  return streak
}

// Build the library catalog from all loaded programs.
const buildLibrary = (programs) => {
  const map = new Map()
  for (const p of programs) {
    for (const d of p.days) {
      for (const g of d.groups) {
        for (const e of g.exercises) {
          const key = e.name.toLowerCase()
          const ex = map.get(key) || { name: e.name, detail: e.detail || '', weighted: false }
          ex.weighted = ex.weighted || !!e.weighted
          if (!ex.detail && e.detail) ex.detail = e.detail
          map.set(key, ex)
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/* ────────────────────────────── App ────────────────────────────── */

export default function App() {
  const store = useStore()
  const [authed, setAuthed] = useState(() => !!getToken())
  const [hydrated, setHydrated] = useState(false)
  const [hydrateErr, setHydrateErr] = useState('')
  const [tab, setTab] = useState('today')
  const [toast, setToast] = useState(null)
  const [online, setOnline] = useState(navigator.onLine)
  const toastTimer = useRef(0)

  const flashToast = (msg, ms = 2500) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthed(false); setHydrated(false); disconnectRealtime()
    })
  }, [])

  useEffect(() => {
    if (!authed) return
    let cancelled = false
    setHydrated(false); setHydrateErr('')
    actions.hydrate(today())
      .then(() => { if (!cancelled) setHydrated(true) })
      .catch(e => {
        if (cancelled) return
        if (e?.status === 401) { setAuthed(false); setToken(''); return }
        setHydrateErr(e?.message || 'Could not reach server')
      })
    connectRealtime()
    return () => { cancelled = true; disconnectRealtime() }
  }, [authed])

  useEffect(() => {
    const u = () => setOnline(navigator.onLine)
    window.addEventListener('online', u)
    window.addEventListener('offline', u)
    const onVis = () => {
      if (document.visibilityState === 'visible' && authed && hydrated) {
        actions.refreshSessions(today()).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('online', u)
      window.removeEventListener('offline', u)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [authed, hydrated])

  const theme = store.profile?.theme || 'dark'
  const t = THEMES[theme]
  useEffect(() => {
    document.documentElement.style.background = t.pageBg
    document.body.style.background = t.pageBg
    document.body.style.color = t.text
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', t.pageBg)
  }, [t])

  if (!authed) {
    return <LoginScreen t={t} onLoggedIn={() => setAuthed(true)} />
  }

  if (!hydrated) {
    return (
      <LoadingScreen t={t} error={hydrateErr}
        onRetry={() => {
          setHydrateErr('')
          actions.hydrate(today())
            .then(() => setHydrated(true))
            .catch(e => setHydrateErr(e?.message || 'Still no luck'))
        }}
        onSignOut={() => { setToken(''); setAuthed(false) }} />
    )
  }

  return (
    <div style={{
      minHeight: '100dvh', background: t.pageBg, color: t.text,
      paddingBottom: 24
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px' }}>
        <Header
          t={t} store={store}
          streak={computeStreak(store)}
          onToggleTheme={() => actions.setProfile({ theme: theme === 'dark' ? 'light' : 'dark' })}
          onToggleUnits={() => actions.setProfile({ units: store.profile.units === 'kg' ? 'lb' : 'kg' })}
          onSignOut={async () => {
            try { await api.auth.logout() } catch {}
            setToken('')
            setAuthed(false)
          }}
          tab={tab} setTab={setTab}
        />
        {!online && (
          <div className="heading" style={{
            background: '#d97706', color: '#fff',
            padding: '8px 12px', borderRadius: 10,
            fontSize: 11, letterSpacing: '0.12em', fontWeight: 700,
            marginTop: 10, textAlign: 'center'
          }}>OFFLINE — CONNECT TO SYNC</div>
        )}

        <main style={{ paddingTop: 14 }}>
          {tab === 'today' && <TodayView t={t} store={store} onPRToast={flashToast} />}
          {tab === 'week' && <WeekView t={t} store={store} setTab={setTab} />}
          {tab === 'history' && <HistoryView t={t} store={store} />}
          {tab === 'prs' && <PRsView t={t} store={store} />}
        </main>
      </div>

      {toast && (
        <div className="fade" style={{
          position: 'fixed', left: '50%',
          bottom: 'calc(env(safe-area-inset-bottom) + 24px)',
          transform: 'translateX(-50%)',
          background: t.card, border: `1px solid ${t.accent}`,
          color: t.text, padding: '12px 18px', borderRadius: 14,
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
          zIndex: 100, maxWidth: 'calc(100vw - 32px)', textAlign: 'center'
        }}>{toast}</div>
      )}
    </div>
  )
}

/* ─────────── Loading + Header + chrome ─────────── */

function LoadingScreen({ t, error, onRetry, onSignOut }) {
  return (
    <div style={{
      minHeight: '100dvh', background: t.pageBg, color: t.text,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center',
      padding: 'calc(env(safe-area-inset-top) + 24px) 24px calc(env(safe-area-inset-bottom) + 24px)'
    }}>
      <h1 className="heading" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.22em', marginBottom: 6 }}>
        <span style={{ color: t.accent }}>IRON</span> LOG
      </h1>
      <div style={{ color: t.sub, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        {error ? 'Could not reach server' : 'Loading…'}
      </div>
      {error && (
        <>
          <div style={{ color: t.sub, fontSize: 12, marginTop: 18, maxWidth: 340, textAlign: 'center' }}>
            {error}. The server may be waking up — give it ~30s on first hit.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={onRetry} className="heading" style={{
              padding: '12px 18px', borderRadius: 12, background: t.accent, color: '#fff',
              fontWeight: 800, letterSpacing: '0.06em', fontSize: 12
            }}>RETRY</button>
            <button onClick={onSignOut} className="heading" style={{
              padding: '12px 18px', borderRadius: 12, background: t.soft,
              border: `1px solid ${t.border}`, color: t.text,
              fontWeight: 700, letterSpacing: '0.06em', fontSize: 12
            }}>SIGN OUT</button>
          </div>
        </>
      )}
    </div>
  )
}

function Header({ t, store, streak, onToggleTheme, onToggleUnits, onSignOut, tab, setTab }) {
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
          {streak >= 2 && (
            <span title={`${streak}-day streak`} style={{
              fontFamily: 'DM Mono', fontSize: 10, fontWeight: 500,
              color: t.sub, letterSpacing: '0.08em'
            }}>🔥 {streak}</span>
          )}
        </h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <IconBtn t={t} title="Sign out" onClick={onSignOut}>⎋</IconBtn>
          <IconBtn t={t} title="Units" onClick={onToggleUnits}>
            <span style={{ fontFamily: 'Unbounded', fontSize: 11, fontWeight: 700 }}>
              {(store.profile.units || 'kg').toUpperCase()}
            </span>
          </IconBtn>
          <IconBtn t={t} title="Theme" onClick={onToggleTheme}>
            {store.profile.theme === 'dark' ? '☀️' : '🌙'}
          </IconBtn>
        </div>
      </div>
      <Tabs t={t} tab={tab} setTab={setTab} />
    </header>
  )
}

function IconBtn({ t, onClick, children, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 38, height: 38, borderRadius: 10,
      background: t.card, border: `1px solid ${t.border}`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, color: t.text
    }}>{children}</button>
  )
}

function Tabs({ t, tab, setTab }) {
  const tabs = [
    { id: 'today', label: 'TODAY' },
    { id: 'week', label: 'WEEK' },
    { id: 'history', label: 'HISTORY' },
    { id: 'prs', label: 'PRs' }
  ]
  return (
    <nav style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 12 }}>
      {tabs.map(x => {
        const active = tab === x.id
        return (
          <button key={x.id} onClick={() => setTab(x.id)} className="heading" style={{
            padding: '9px 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            background: active ? t.accent : t.card,
            color: active ? '#fff' : t.text,
            border: `1px solid ${active ? t.accent : t.border}`,
            borderRadius: 10
          }}>{x.label}</button>
        )
      })}
    </nav>
  )
}

function Card({ t, children, style }) {
  return (
    <section style={{
      background: t.card, border: `1px solid ${t.border}`, borderRadius: 14,
      padding: 14, ...style
    }}>{children}</section>
  )
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
      }}>{children}</div>
    </div>,
    document.body
  )
}

/* ─────────── ProgramSwitcher ─────────── */

function ProgramSwitcher({ t, store }) {
  if ((store.programs || []).length < 2) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span className="heading" style={{ fontSize: 10, letterSpacing: '0.18em', color: t.sub }}>PROGRAM</span>
      <div style={{
        flex: 1,
        display: 'inline-flex', borderRadius: 999,
        background: t.card, border: `1px solid ${t.border}`,
        padding: 3
      }}>
        {store.programs.map(p => {
          const active = String(p.id) === String(store.profile.activeProgramId)
          return (
            <button key={p.id}
              onClick={() => actions.setProfile({ activeProgramId: p.id, selectedDayId: p.days[0]?.id ?? null })}
              className="heading"
              style={{
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

/* ─────────── TODAY ─────────── */

function TodayView({ t, store, onPRToast }) {
  const program = activeProgram(store)
  const days = program?.days || []
  const dKey = today()
  const defaultDay = store.profile.selectedDayId && days.find(d => String(d.id) === String(store.profile.selectedDayId))
    ? store.profile.selectedDayId
    : days[0]?.id ?? null

  const [activeDay, setActiveDay] = useState(defaultDay)
  const [sheet, setSheet] = useState(null)            // { exercise, prevKg }
  const [editing, setEditing] = useState(false)
  const [picker, setPicker] = useState(null)          // { groupId }
  const [resetMenu, setResetMenu] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  // Sync activeDay with profile when it changes externally (program switch).
  useEffect(() => {
    if (!days.find(d => String(d.id) === String(activeDay)) && days[0]) {
      setActiveDay(days[0].id)
    }
  }, [program?.id, days.length])

  useEffect(() => {
    if (activeDay && String(store.profile.selectedDayId) !== String(activeDay)) {
      actions.setProfile({ selectedDayId: String(activeDay) }).catch(() => {})
    }
  }, [activeDay])

  const day = days.find(d => String(d.id) === String(activeDay)) || days[0]
  const groups = day?.groups || []
  const logs = logsFor(store, dKey, day?.id)

  const flat = groups.flatMap(g => g.exercises.map(e => e.name))
  const doneCount = flat.filter(n => logs[n]?.done).length
  const totalCount = flat.length
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0
  const isRest = (day?.title || '').toLowerCase().includes('rest')
  const quote = quoteOfWeek(new Date())

  const onToggle = async (item) => {
    if (editing) return
    const cur = logs[item.name]
    if (cur?.done) {
      await actions.removeLog({ date: dKey, dayId: day.id, exerciseName: item.name })
      return
    }
    if (item.weighted) {
      setSheet({ exercise: item, prevKg: cur?.weightKg ?? getLastWeightKg(store, item.name) })
    } else {
      try { await actions.upsertLog({ date: dKey, dayId: day.id, exerciseName: item.name, done: true, weightKg: null }) }
      catch (e) { onPRToast?.(`✗ ${e?.message || 'Could not save'}`) }
    }
  }

  const onSaveWeight = async (kg) => {
    if (!sheet) return
    const name = sheet.exercise.name
    const prevPR = getPRKg(store, name) ?? 0
    setSheet(null)
    try {
      const { prKg } = await actions.upsertLog({
        date: dKey, dayId: day.id, exerciseName: name, done: true, weightKg: kg
      })
      if (kg != null && kg > 0 && kg > prevPR) {
        onPRToast?.(`🏆 New PR — ${name} ${formatWeight(kg, store.profile.units)}`)
      }
    } catch (e) {
      onPRToast?.(`✗ ${e?.message || 'Could not save'}`)
    }
  }

  return (
    <div className="fade">
      <ProgramSwitcher t={t} store={store} />

      {/* Day picker */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${days.length}, 1fr)`, gap: 6,
        marginBottom: 14
      }}>
        {days.map(d => {
          const active = String(d.id) === String(activeDay)
          return (
            <button key={d.id} onClick={() => setActiveDay(d.id)} className="heading" style={{
              padding: '10px 0', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em',
              background: active ? d.accent : t.card,
              border: `1px solid ${active ? d.accent : t.border}`,
              color: active ? '#fff' : t.text,
              borderRadius: 10
            }}>{d.label}</button>
          )
        })}
      </div>

      {/* Day header card */}
      <Card t={t} style={{ marginBottom: 12, borderLeft: `4px solid ${day?.accent || t.accent}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 26 }}>{day?.emoji}</div>
          <div style={{ flex: 1 }}>
            <div className="heading" style={{ fontSize: 11, letterSpacing: '0.18em', color: t.sub }}>
              {day?.label} · {prettyDayDate(new Date())}
            </div>
            <div className="heading" style={{ fontSize: 16, fontWeight: 700 }}>{day?.title}</div>
          </div>
          <button onClick={() => setEditing(v => !v)}
            className="heading" style={{
              padding: '6px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              borderRadius: 8,
              background: editing ? (day?.accent || t.accent) : 'transparent',
              border: `1px solid ${editing ? (day?.accent || t.accent) : t.border}`,
              color: editing ? '#fff' : t.text
            }}>{editing ? 'DONE' : '✏️ EDIT'}</button>
          {editing && (
            <button onClick={() => setResetMenu(true)} title="Reset" style={{
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
            {doneCount > 0 && (
              <button onClick={() => setConfirmReset(true)} className="heading" style={{
                marginTop: 10, width: '100%', padding: '8px 0', borderRadius: 8,
                background: 'transparent', border: `1px solid ${t.border}`,
                color: t.accent, fontSize: 10, letterSpacing: '0.18em', fontWeight: 700
              }}>↻ RESET TODAY'S CHECKS</button>
            )}
          </div>
        )}
      </Card>

      {!editing && (
        <Card t={t} style={{ marginBottom: 12 }}>
          <div className="heading" style={{ fontSize: 10, letterSpacing: '0.2em', color: t.sub, marginBottom: 6 }}>
            QUOTE OF THE WEEK
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            “{quote.text}”
            {quote.author && <span style={{ color: t.sub, marginLeft: 6, fontSize: 12 }}>— {quote.author}</span>}
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
          const groupComplete = grp.exercises.length > 0 && grp.exercises.every(it => logs[it.name]?.done)
          return (
            <GroupCard key={grp.id} t={t}
              title={grp.name}
              accent={day?.accent}
              complete={!editing && groupComplete}
              editing={editing}
              onRename={(name) => actions.renameGroup(grp.id, name)}
              onDelete={() => {
                if (confirm(`Delete group "${grp.name}" and all its items?`))
                  actions.removeGroup(grp.id)
              }}
              onAddExercise={() => setPicker({ groupId: grp.id })}
            >
              {grp.exercises.map(item => (
                <ExerciseRow
                  key={item.id}
                  t={t}
                  item={item}
                  log={logs[item.name]}
                  units={store.profile.units}
                  pr={getPRKg(store, item.name)}
                  editing={editing}
                  onToggle={() => onToggle(item)}
                  onEditWeight={() => setSheet({ exercise: item, prevKg: logs[item.name]?.weightKg ?? null })}
                  onDelete={() => actions.removeExercise(item.id)}
                />
              ))}
            </GroupCard>
          )
        })
      )}

      {editing && day && (
        <button onClick={() => {
          const name = prompt('New group name?')
          if (name?.trim()) actions.addGroup({ dayId: day.id, name: name.trim() })
        }} className="heading" style={{
          width: '100%', padding: 14, marginTop: 4,
          background: t.card, border: `1px dashed ${t.border}`,
          borderRadius: 12, color: t.sub,
          fontSize: 12, letterSpacing: '0.12em', fontWeight: 700
        }}>+ ADD GROUP</button>
      )}

      {!editing && <ShieldSection t={t} store={store} />}

      {sheet && (
        <WeightSheet
          t={t}
          item={sheet.exercise}
          units={store.profile.units}
          initialKg={sheet.prevKg}
          onCancel={() => setSheet(null)}
          onSave={onSaveWeight}
        />
      )}

      {picker && day && (
        <LibraryPicker
          t={t}
          store={store}
          onCancel={() => setPicker(null)}
          onPick={async (item) => {
            await actions.addExercise({
              groupId: picker.groupId,
              name: item.name, detail: item.detail || '', weighted: !!item.weighted
            })
            setPicker(null)
          }}
        />
      )}

      {resetMenu && day && (
        <ResetMenu t={t}
          onCancel={() => setResetMenu(false)}
          onResetDay={() => {
            // For simplicity we reset the whole program (the user can re-edit).
            // True per-day reset would need a server endpoint we haven't built.
            if (confirm(`Reset the entire ${program.name} plan to default?`)) {
              actions.resetProgram(program.id)
            }
            setResetMenu(false)
          }}
          onResetAll={() => {
            if (confirm(`Reset the entire ${program.name} plan to default?`)) {
              actions.resetProgram(program.id)
            }
            setResetMenu(false)
          }}
        />
      )}

      {confirmReset && day && (
        <Modal onCancel={() => setConfirmReset(false)}>
          <div onClick={e => e.stopPropagation()} className="sheet-enter" style={{
            width: '100%', maxWidth: 560,
            background: t.card, color: t.text,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            borderTop: `1px solid ${t.border}`,
            padding: '18px 18px calc(env(safe-area-inset-bottom) + 18px)',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: t.border, margin: '0 auto 14px' }} />
            <div className="heading" style={{ fontSize: 11, letterSpacing: '0.2em', color: t.sub }}>RESET TODAY</div>
            <div className="heading" style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
              Clear today's {day.label} checks?
            </div>
            <div style={{ color: t.sub, fontSize: 12, marginTop: 4 }}>
              {doneCount} logged exercise{doneCount === 1 ? '' : 's'} will be deleted from today.
              Past sessions and PRs are untouched.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setConfirmReset(false)} className="heading" style={{
                flex: 1, padding: '14px 0', borderRadius: 12,
                background: t.soft, border: `1px solid ${t.border}`,
                color: t.text, fontWeight: 700, letterSpacing: '0.06em', fontSize: 13
              }}>CANCEL</button>
              <button onClick={() => {
                actions.resetSession({ date: dKey, dayId: day.id })
                setConfirmReset(false)
              }} className="heading" style={{
                flex: 2, padding: '14px 0', borderRadius: 12,
                background: t.accent, color: '#fff',
                fontWeight: 800, letterSpacing: '0.06em', fontSize: 13
              }}>RESET</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ─────────── GroupCard + ExerciseRow ─────────── */

function GroupCard({ t, title, children, accent, complete, editing, onRename, onDelete, onAddExercise }) {
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
            style={{ flex: 1, cursor: editing ? 'text' : 'default', textTransform: 'uppercase' }}
          >{title}{complete && ' ✓'}</span>
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
  const weighted = !!item.weighted
  const hasPR = pr != null && pr > 0
  const isNewPR = isDone && weighted && log?.weightKg != null && log.weightKg > 0 && log.weightKg >= (pr || 0)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 4px', borderRadius: 10
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
            color: '#fff', fontSize: 14, lineHeight: 1, flexShrink: 0
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
            <span style={{
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
        }}>{formatWeight(log.weightKg, units)}</button>
      )}
    </div>
  )
}

/* ─────────── WeightSheet ─────────── */

function WeightSheet({ t, item, units, initialKg, onCancel, onSave }) {
  const [unit, setUnit] = useState(units || 'kg')
  const [val, setVal] = useState(() => formatNumber(initialKg, units || 'kg'))

  const flipUnit = (next) => {
    if (next === unit) return
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
        <div style={{ width: 40, height: 4, borderRadius: 4, background: t.border, margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div className="heading" style={{ fontSize: 11, letterSpacing: '0.2em', color: t.sub }}>WEIGHT USED</div>
            <div className="heading" style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{item.name}</div>
            <div style={{ color: t.sub, fontSize: 12, marginTop: 2 }}>{item.detail}</div>
          </div>
          <div style={{
            display: 'inline-flex', borderRadius: 999,
            background: t.soft, border: `1px solid ${t.border}`, padding: 3
          }}>
            {['kg','lb'].map(u => {
              const active = u === unit
              return (
                <button key={u} type="button" onClick={() => flipUnit(u)} className="heading" style={{
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
          <input autoFocus type="number" inputMode="decimal" step="0.5" min="0"
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
          <button type="button" onClick={onCancel} className="heading" style={{
            flex: 1, padding: '14px 0', borderRadius: 12,
            background: t.soft, border: `1px solid ${t.border}`,
            color: t.text, fontWeight: 700, letterSpacing: '0.06em', fontSize: 13
          }}>CANCEL</button>
          <button type="submit" className="heading" style={{
            flex: 2, padding: '14px 0', borderRadius: 12,
            background: t.accent, color: '#fff',
            fontWeight: 800, letterSpacing: '0.06em', fontSize: 13
          }}>SAVE LIFT</button>
        </div>
      </form>
    </Modal>
  )
}

/* ─────────── Library Picker + Custom Exercise ─────────── */

function LibraryPicker({ t, store, onCancel, onPick }) {
  const [query, setQuery] = useState('')
  const [custom, setCustom] = useState(false)
  const library = useMemo(() => buildLibrary(store.programs), [store.programs])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? library.filter(x => x.name.toLowerCase().includes(q)) : library
  }, [library, query])

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
        <div style={{ width: 40, height: 4, borderRadius: 4, background: t.border, margin: '0 auto 10px' }} />
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
        <div style={{ width: 40, height: 4, borderRadius: 4, background: t.border, margin: '0 auto 14px' }} />
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
        <div style={{ width: 40, height: 4, borderRadius: 4, background: t.border, margin: '0 auto 14px' }} />
        <div className="heading" style={{ fontSize: 11, letterSpacing: '0.2em', color: t.sub }}>RESET PLAN</div>
        <button onClick={onResetAll} className="heading" style={{
          width: '100%', padding: '14px 0', marginTop: 8, borderRadius: 12,
          background: t.soft, border: `1px solid ${t.accent}`,
          color: t.accent, fontWeight: 700, letterSpacing: '0.06em', fontSize: 13
        }}>↺ RESET ENTIRE PLAN</button>
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

/* ─────────── Posture Shield ─────────── */

function ShieldSection({ t, store }) {
  const dKey = today()
  const checks = useMemo(() => {
    const map = {}
    for (const l of (store.shieldLogsByDate[dKey] || [])) {
      map[String(l.itemId)] = l
    }
    return map
  }, [store.shieldLogsByDate, dKey])

  const toggle = (itemId, currentDone) => {
    actions.toggleShield({ date: dKey, itemId, done: !currentDone })
  }

  if (!store.shield?.length) return null

  return (
    <Card t={t} style={{ marginTop: 16, marginBottom: 8 }}>
      <div className="heading" style={{
        fontSize: 12, letterSpacing: '0.18em', fontWeight: 700, marginBottom: 4
      }}>🛡️ DAILY POSTURE SHIELD</div>
      <div style={{ fontSize: 11, color: t.sub, marginBottom: 12 }}>Do every day to bulletproof joints.</div>
      {store.shield.map(g => (
        <div key={g.id} style={{ marginBottom: 10 }}>
          <div className="heading" style={{
            fontSize: 11, letterSpacing: '0.12em', color: t.sub, marginBottom: 6
          }}>{g.name}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {g.items.map(item => {
              const done = !!checks[item.id]?.done
              return (
                <button key={item.id} onClick={() => toggle(item.id, done)} style={{
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

/* ─────────── WEEK ─────────── */

function WeekView({ t, store, setTab }) {
  const todayDate = new Date()
  const monday = mondayOfWeek(todayDate)
  const todayIdx = mondayIndex(todayDate)
  const program = activeProgram(store)
  const programDays = program?.days || []

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    const key = dateKey(d)
    const list = store.sessionsByDate[key] || (store.history.filter(s => s.date === key))
    const sess = list[0] || null
    const dayDef = sess ? findDay(store, sess.dayId) : null
    return { date: d, key, idx: i, sess, dayDef }
  })

  const goToDay = async (dayId) => {
    await actions.setProfile({ selectedDayId: dayId }).catch(() => {})
    setTab('today')
  }

  return (
    <div className="fade">
      <div className="heading" style={{
        fontSize: 12, letterSpacing: '0.2em', color: t.sub, marginBottom: 10
      }}>THIS WEEK · {WEEKDAY_LABELS[todayIdx]} {prettyDayDate(todayDate)}</div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6,
        marginBottom: 18
      }}>
        {days.map(d => {
          const isToday = d.idx === todayIdx
          const dayDef = d.dayDef
          const total = dayDef ? (dayDef.groups || []).reduce((a, g) => a + g.exercises.length, 0) : 0
          const done = d.sess ? (d.sess.logs || []).filter(l => l.done).length : 0
          const accent = dayDef?.accent || t.border
          const complete = total > 0 && done >= total
          const onClick = () => { if (dayDef) goToDay(dayDef.id); else setTab('today') }
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
              <div className="heading" style={{ fontSize: 10, letterSpacing: '0.1em', marginTop: 4, color: t.sub }}>
                {WEEKDAY_LABELS[d.idx]}
              </div>
              <div className="heading" style={{ fontSize: 12, fontWeight: 700, color: t.text, marginTop: 2 }}>
                {dayDef?.label || '—'}
              </div>
              <div style={{ fontSize: 10, color: t.sub, marginTop: 4 }}>
                {d.sess ? (total ? `${done}/${total}` : `${done}`) : '—'}
              </div>
            </button>
          )
        })}
      </div>

      <div className="heading" style={{ fontSize: 11, letterSpacing: '0.2em', color: t.sub, marginBottom: 8 }}>
        FULL WEEK PLAN — {program?.name}
      </div>
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

/* ─────────── HISTORY ─────────── */

function HistoryView({ t, store }) {
  const units = store.profile.units
  const entries = useMemo(() => {
    const all = [...(store.history || [])]
    // Merge today's sessions in (they may not be in history yet).
    const todayKey = today()
    const todays = store.sessionsByDate[todayKey] || []
    for (const s of todays) if (!all.find(x => x.id === s.id)) all.unshift(s)
    return all
      .filter(s => (s.logs || []).some(l => l.done))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [store.history, store.sessionsByDate])

  const [open, setOpen] = useState(() => new Set(entries[0] ? [entries[0].id] : []))
  const toggle = (id) => setOpen(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  if (!entries.length) {
    return <Empty t={t} icon="📜" title="No history yet" body="Complete an exercise to see it here." />
  }

  return (
    <div className="fade">
      <div className="heading" style={{ fontSize: 12, letterSpacing: '0.2em', color: t.sub, marginBottom: 10 }}>
        SESSION HISTORY
      </div>
      {entries.map(sess => {
        const exDone = (sess.logs || []).filter(l => l.done)
        const isOpen = open.has(sess.id)
        const accent = accentForDayId(store, sess.dayId)
        const dayDef = findDay(store, sess.dayId)
        return (
          <div key={sess.id} style={{
            background: t.card, border: `1px solid ${t.border}`,
            borderLeft: `4px solid ${accent}`,
            borderRadius: 12, marginBottom: 8, overflow: 'hidden'
          }}>
            <button onClick={() => toggle(sess.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: 12, color: t.text, textAlign: 'left'
            }}>
              <div style={{ flex: 1 }}>
                <div className="heading" style={{ fontSize: 13, fontWeight: 700 }}>
                  {dayDef?.label || sess.dayId} · {prettyHistDate(sess.date)}
                </div>
                <div style={{ fontSize: 11, color: t.sub, marginTop: 3 }}>
                  {exDone.length} exercise{exDone.length !== 1 ? 's' : ''} logged
                </div>
              </div>
              <span style={{ color: t.sub, fontSize: 14 }}>{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && (
              <div style={{ padding: '0 12px 12px' }}>
                {exDone.map(v => (
                  <div key={v.exerciseName} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 0', borderTop: `1px solid ${t.border}`,
                    fontSize: 13
                  }}>
                    <span>{v.exerciseName}</span>
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

function prettyHistDate(k) {
  const [y, m, d] = k.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/* ─────────── PRs ─────────── */

function PRsView({ t, store }) {
  const units = store.profile.units
  const records = store.prs || []

  if (!records.length) {
    return <Empty t={t} icon="🏆" title="No PRs yet" body="Log a weighted lift to start setting records." />
  }
  return (
    <div className="fade">
      <div className="heading" style={{ fontSize: 12, letterSpacing: '0.2em', color: t.sub, marginBottom: 10 }}>
        PERSONAL RECORDS
      </div>
      {records.map((r, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
        return (
          <div key={r.exerciseName} style={{
            background: t.card,
            border: `1px solid ${medal ? t.accent : t.border}`,
            borderRadius: 12, padding: 12, marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <div style={{ fontSize: 24, width: 36, textAlign: 'center' }}>{medal || `#${i + 1}`}</div>
            <div style={{ flex: 1 }}>
              <div className="heading" style={{ fontSize: 13, fontWeight: 700 }}>{r.exerciseName}</div>
              <div style={{ fontSize: 11, color: t.sub, marginTop: 3 }}>
                {r.lastTs ? prettyHistDate(String(r.lastTs).slice(0, 10)) : ''}
              </div>
            </div>
            <div className="heading" style={{ fontSize: 18, fontWeight: 800, color: t.text }}>
              {formatWeight(r.prKg, units)}
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
