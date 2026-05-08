import React, { useEffect, useMemo, useState } from 'react'
import {
  DAYS, SCHEDULE, SHIELD, WEIGHTED, quoteOfWeek,
  mondayIndex, mondayOfWeek, dateKey, WEEKDAY_LABELS
} from './data.js'
import { loadAll, saveAll, exportBackup, importBackup } from './storage.js'

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
  const [state, setState] = useState(loadAll)
  const [tab, setTab] = useState('today')
  const [toast, setToast] = useState(null)

  // Persist on every change
  useEffect(() => { saveAll(state) }, [state])

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

  const flash = (msg, ms = 1800) => {
    setToast(msg)
    setTimeout(() => setToast(null), ms)
  }

  const handleBackup = async () => {
    const code = exportBackup(state)
    try {
      await navigator.clipboard.writeText(code)
      flash('Backup copied to clipboard ✓')
    } catch {
      window.prompt('Copy this backup string:', code)
    }
  }

  const handleRestore = () => {
    const input = window.prompt('Paste your IRON LOG backup string:')
    if (!input) return
    try {
      const parsed = importBackup(input)
      setState(parsed)
      flash('Backup restored ✓')
    } catch (e) {
      flash('Invalid backup ✗')
    }
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
          onToggleTheme={toggleTheme}
          onToggleUnits={toggleUnits}
          onBackup={handleBackup}
          onRestore={handleRestore}
          tab={tab} setTab={setTab}
        />

        <main style={{ paddingTop: 14 }}>
          {tab === 'today'   && <TodayView   t={t} state={state} setState={setState} />}
          {tab === 'week'    && <WeekView    t={t} state={state} setState={setState} setTab={setTab} />}
          {tab === 'history' && <HistoryView t={t} state={state} />}
          {tab === 'prs'     && <PRsView     t={t} state={state} />}
        </main>
      </div>

      {toast && (
        <div className="fade" style={{
          position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)',
          background: t.card, border: `1px solid ${t.border}`,
          color: t.text, padding: '10px 16px', borderRadius: 12,
          fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          zIndex: 90
        }}>{toast}</div>
      )}
    </div>
  )
}

/* ─────────────────── Header ─────────────────── */

function Header({ t, state, onToggleTheme, onToggleUnits, onBackup, onRestore, tab, setTab }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: t.pageBg, paddingTop: 14, paddingBottom: 6,
      borderBottom: `1px solid ${t.border}`,
      marginBottom: 4
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="heading" style={{
          fontSize: 22, fontWeight: 800, letterSpacing: '0.18em', color: t.text
        }}>
          <span style={{ color: t.accent }}>IRON</span> LOG
        </h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <IconBtn t={t} title="Backup" onClick={onBackup}>💾</IconBtn>
          <IconBtn t={t} title="Restore" onClick={onRestore}>📥</IconBtn>
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
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="sheet-enter"
        style={{
          width: '100%', maxWidth: 560,
          background: t.card, color: t.text,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          borderTop: `1px solid ${t.border}`,
          padding: '18px 18px 28px', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
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
    </div>
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
