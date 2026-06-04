'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { findSessionByCode, joinSession } from '@/lib/supabase'

export default function QuizLogin() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [klasse, setKlasse] = useState('')
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
      if (s.type !== 'quiz') { setError('Das ist kein Quiz-Code.'); return }
      setSession(s)
      setStep(2)
    } catch {
      setError('Fehler beim Suchen der Session.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!name.trim() || !klasse.trim() || !session) return
    setLoading(true)
    setError('')
    try {
      const participant = await joinSession(session.id, name.trim(), klasse.trim())
      localStorage.setItem(`participant_${session.id}`, participant.id)
      router.push(`/quiz/${session.id}`)
    } catch {
      setError('Fehler beim Beitreten.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="center">
      <div style={{ width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>🎮 Quiz beitreten</h1>
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
              <label>Dein Name</label>
              <input
                type="text"
                placeholder="Max Mustermann"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label>Klasse</label>
              <input
                type="text"
                placeholder="9a"
                value={klasse}
                onChange={e => setKlasse(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: '0.875rem' }}>{error}</p>}
            <button className="btn btn-primary btn-full" onClick={handleJoin} disabled={loading || !name.trim() || !klasse.trim()}>
              {loading ? 'Beitreten…' : 'Quiz beitreten'}
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
