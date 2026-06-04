'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { findSessionByCode, joinSession, verifyPin } from '@/lib/supabase'

export default function TestLogin() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')
  const [session, setSession] = useState<{ id: string; title: string } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCodeSubmit() {
    if (code.length < 6) return
    setLoading(true)
    setError('')
    try {
      const s = await findSessionByCode(code)
      if (!s) { setError('Session nicht gefunden. Code prüfen?'); return }
      if (s.type !== 'test') { setError('Das ist kein Test-Code.'); return }
      setSession(s)
      setStep(2)
    } catch {
      setError('Fehler beim Suchen der Session.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePinSubmit() {
    if (!pin.trim() || !session) return
    setLoading(true)
    setError('')
    try {
      const person = await verifyPin(pin.trim())
      if (!person) { setError('PIN nicht gefunden oder ungültig.'); return }
      const participant = await joinSession(session.id, person.name, person.klasse, pin.trim())
      localStorage.setItem(`participant_${session.id}`, participant.id)
      router.push(`/test/${session.id}`)
    } catch {
      setError('Fehler beim Einloggen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="center">
      <div style={{ width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>📝 Test starten</h1>
        <p style={{ color: 'var(--text2)', marginBottom: '2rem', fontSize: '0.875rem' }}>
          {step === 1 ? 'Gib den 6-stelligen Code ein' : `Session: ${session?.title}`}
        </p>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Session-Code</label>
              <input
                type="text"
                placeholder="ABC123"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
                style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '1.5rem', textAlign: 'center' }}
              />
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: '0.875rem' }}>{error}</p>}
            <button className="btn btn-primary btn-full" onClick={handleCodeSubmit} disabled={loading || code.length < 6}>
              {loading ? 'Suche…' : 'Weiter →'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Dein PIN</label>
              <input
                type="text"
                placeholder="1234"
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                style={{ letterSpacing: '0.2em', fontSize: '1.5rem', textAlign: 'center' }}
              />
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: '0.875rem' }}>{error}</p>}
            <button className="btn btn-primary btn-full" onClick={handlePinSubmit} disabled={loading || !pin.trim()}>
              {loading ? 'Einloggen…' : 'Test starten'}
            </button>
            <button className="btn btn-secondary btn-full" onClick={() => setStep(1)}>
              ← Zurück
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
