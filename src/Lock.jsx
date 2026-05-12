import React, { useEffect, useState } from 'react'
import {
  supportsBiometric, platformAuthenticatorAvailable,
  hasBiometric, enrollBiometric, verifyBiometric
} from './biometric.js'

const keyStyle = (t, ghost) => ({
  width: 76, height: 76, borderRadius: 999,
  background: ghost ? 'transparent' : t.card,
  border: ghost ? 'none' : `1px solid ${t.border}`,
  color: t.text,
  fontFamily: 'Unbounded, sans-serif',
  fontSize: 28, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
})

export function PinPad({ t, length = 4, value, onChange, onFull }) {
  const keys = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['',  '0', '⌫']
  ]
  const press = (digit) => {
    if (value.length >= length) return
    if (navigator.vibrate) navigator.vibrate(10)
    const next = value + digit
    onChange(next)
    if (next.length === length) onFull?.(next)
  }
  const back = () => {
    if (navigator.vibrate) navigator.vibrate(10)
    onChange(value.slice(0, -1))
  }
  return (
    <div className="no-select">
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 28
      }}>
        {Array.from({ length }, (_, i) => {
          const filled = i < value.length
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
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 76px)',
        gap: 14, justifyContent: 'center'
      }}>
        {keys.flat().map((k, i) => {
          if (!k) return <span key={i} />
          if (k === '⌫') return (
            <button key={i} onClick={back} className="tap-key" style={keyStyle(t, true)}>
              <span style={{ fontSize: 20 }}>⌫</span>
            </button>
          )
          return (
            <button key={i} onClick={() => press(k)} className="tap-key heading" style={keyStyle(t, false)}>
              {k}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function LockScreen({ t, expectedPin, onUnlocked, onSignOut }) {
  const [val, setVal] = useState('')
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

  const tryBio = async () => {
    setBioBusy(true); setBioError('')
    try {
      if (await verifyBiometric()) onUnlocked()
    } catch {
      setBioError('Face ID failed — use PIN.')
    } finally { setBioBusy(false) }
  }

  const tryPin = (pin) => {
    if (pin === expectedPin) {
      if (navigator.vibrate) navigator.vibrate(20)
      onUnlocked()
    } else {
      if (navigator.vibrate) navigator.vibrate([60, 30, 60])
      setShake(true); setTimeout(() => setShake(false), 400)
      setVal('')
    }
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
      <div style={{
        color: t.sub, fontSize: 11, letterSpacing: '0.18em',
        textTransform: 'uppercase', marginBottom: 36
      }}>Locked</div>

      {bioReady && (
        <button onClick={tryBio} disabled={bioBusy}
          className="no-select"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 8, marginBottom: 28, background: 'transparent', color: t.text
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
        <PinPad t={t} value={val} onChange={setVal} onFull={tryPin} />
      </div>

      {bioError && (
        <div style={{ color: t.accent, fontSize: 11, marginTop: 14 }}>{bioError}</div>
      )}

      <button onClick={onSignOut} style={{
        marginTop: 28, padding: '8px 16px',
        background: 'transparent', color: t.sub,
        fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
        fontFamily: 'Unbounded', fontWeight: 600
      }}>Sign out</button>
    </div>
  )
}

export function PinSetup({ t, onSet, onSkip }) {
  const [step, setStep] = useState('enter')   // 'enter' | 'confirm'
  const [first, setFirst] = useState('')
  const [val, setVal] = useState('')
  const [shake, setShake] = useState(false)

  const onFull = (pin) => {
    if (step === 'enter') {
      setFirst(pin); setVal(''); setStep('confirm')
    } else {
      if (pin === first) {
        if (navigator.vibrate) navigator.vibrate(20)
        onSet(pin)
      } else {
        if (navigator.vibrate) navigator.vibrate([60, 30, 60])
        setShake(true); setTimeout(() => setShake(false), 400)
        setVal(''); setFirst(''); setStep('enter')
      }
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', background: t.pageBg, color: t.text,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      padding: 'calc(env(safe-area-inset-top) + 24px) 24px calc(env(safe-area-inset-bottom) + 24px)'
    }}>
      <h1 className="heading" style={{
        fontSize: 22, fontWeight: 800, letterSpacing: '0.06em'
      }}>{step === 'enter' ? 'Set a 4-digit PIN' : 'Confirm your PIN'}</h1>
      <div style={{
        color: t.sub, fontSize: 12, marginTop: 8, marginBottom: 32, maxWidth: 320
      }}>{step === 'enter'
        ? 'You\'ll type this each time the app opens. Stays on this device only.'
        : 'Type it once more to confirm.'}</div>

      <div className={shake ? 'shake' : ''}>
        <PinPad t={t} value={val} onChange={setVal} onFull={onFull} />
      </div>

      <button onClick={onSkip} className="heading" style={{
        marginTop: 24, padding: '10px 18px',
        background: 'transparent', color: t.sub,
        fontSize: 11, letterSpacing: '0.18em', fontWeight: 700
      }}>SKIP — DON'T USE A PIN</button>
    </div>
  )
}

export function BioSetup({ t, onDone }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [supported, setSupported] = useState(true)

  useEffect(() => { platformAuthenticatorAvailable().then(setSupported) }, [])

  const enable = async () => {
    setBusy(true); setErr('')
    try {
      await enrollBiometric()
      onDone(true)
    } catch {
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
      <p style={{
        color: t.sub, fontSize: 14, lineHeight: 1.5, marginTop: 12, maxWidth: 320
      }}>Skip the PIN next time. Your face never leaves this device — IRON LOG just asks the OS if it's you.</p>
      {!supported && (
        <p style={{ color: t.sub, fontSize: 11, marginTop: 12 }}>
          (Not available on this device — skip.)
        </p>
      )}
      {err && <p style={{ color: t.accent, fontSize: 12, marginTop: 14 }}>{err}</p>}
      <div style={{ display: 'flex', gap: 10, marginTop: 28, width: '100%', maxWidth: 360 }}>
        <button onClick={() => onDone(false)} className="heading" style={{
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
