'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase, saveAnswer, type Session, type Participant, type Answer } from '@/lib/supabase'

export default function TestSession() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [localAnswers, setLocalAnswers] = useState<(number | null)[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    const pid = localStorage.getItem(`participant_${sessionId}`)

    async function load() {
      const { data: s } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
      if (s) {
        setSession(s)
        setLocalAnswers(new Array(s.questions.length).fill(null))
      }
      if (pid) {
        const { data: p } = await supabase.from('participants').select('*').eq('id', pid).single()
        if (p) {
          setParticipant(p)
          if (p.note) setNote(p.note)
          if (p.answers && p.answers.length > 0) setSubmitted(true)
        }
      }
    }
    load()

    const channel = supabase.channel(`test-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, payload => {
        setSession(payload.new as Session)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'participants', filter: `id=eq.${pid ?? 'none'}` }, payload => {
        const p = payload.new as Participant
        if (p.note) setNote(p.note)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  function selectAnswer(optionIndex: number) {
    if (submitted) return
    setLocalAnswers(prev => {
      const next = [...prev]
      next[currentQ] = optionIndex
      return next
    })
  }

  async function handleSubmit() {
    if (!session || !participant) return
    setLoading(true)
    try {
      const answers: Answer[] = localAnswers.map((sel, i) => {
        const q = session.questions[i]
        const correct = sel === q.correct
        return { questionIndex: i, selectedOption: sel, correct, points: correct ? q.points : 0 }
      })
      const score = answers.reduce((sum, a) => sum + a.points, 0)
      await saveAnswer(participant.id, answers, score)
      setParticipant(prev => prev ? { ...prev, answers, score } : null)
      setSubmitted(true)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  if (!session || !participant) {
    return <div className="center"><p style={{ color: 'var(--text2)' }}>Laden…</p></div>
  }

  const answeredCount = localAnswers.filter(a => a !== null).length
  const progress = (answeredCount / session.questions.length) * 100

  if (submitted) {
    const storedAnswers: Answer[] = participant.answers ?? []
    const correct = storedAnswers.filter(a => a.correct).length
    const total = session.questions.length
    return (
      <div className="center">
        <div style={{ width: '100%', maxWidth: 500, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Test abgegeben</h2>
          <p style={{ color: 'var(--text2)', marginBottom: '1.5rem' }}>{participant.name}</p>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{correct} / {total}</div>
            <div style={{ color: 'var(--text2)', marginTop: '0.25rem' }}>richtige Antworten</div>
          </div>
          {note && (
            <div className="card" style={{ background: 'rgba(124, 111, 224, 0.1)', border: '1px solid var(--accent)' }}>
              <div style={{ color: 'var(--text2)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Deine Note</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent2)' }}>{note}</div>
            </div>
          )}
          {!note && <p style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>Warte auf Benotung durch die Lehrerin…</p>}
        </div>
      </div>
    )
  }

  const q = session.questions[currentQ]

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontWeight: 700 }}>{participant.name}</span>
        <span style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>{answeredCount} / {session.questions.length} beantwortet</span>
      </div>

      {/* Progress bar */}
      <div className="timer-bar" style={{ marginBottom: '1rem' }}>
        <div className="timer-bar-fill" style={{ width: `${progress}%`, background: 'var(--green)', transition: 'width 0.3s' }} />
      </div>

      {/* Question navigation */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
        {session.questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentQ(i)}
            style={{
              width: '2.2rem', height: '2.2rem',
              borderRadius: '8px',
              border: currentQ === i ? '2px solid var(--accent)' : '2px solid transparent',
              background: localAnswers[i] !== null ? 'var(--green)' : 'var(--bg3)',
              color: localAnswers[i] !== null ? '#fff' : 'var(--text2)',
              fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Current question */}
      <div className="card" style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600, textAlign: 'center' }}>
        {q.text}
      </div>

      <div className="answer-grid" style={{ marginBottom: '1.5rem' }}>
        {q.options.map((opt, i) => (
          <button
            key={i}
            className={`answer-btn${localAnswers[currentQ] === i ? ' selected' : ''}`}
            onClick={() => selectAnswer(i)}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          className="btn btn-secondary"
          style={{ flex: 1 }}
          onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
          disabled={currentQ === 0}
        >
          ← Zurück
        </button>
        {currentQ < session.questions.length - 1 ? (
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => setCurrentQ(q => q + 1)}
          >
            Weiter →
          </button>
        ) : (
          <button
            className="btn btn-green"
            style={{ flex: 1 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Abgeben…' : '✓ Test abgeben'}
          </button>
        )}
      </div>

      {currentQ === session.questions.length - 1 && answeredCount < session.questions.length && (
        <p style={{ color: 'var(--amber)', fontSize: '0.875rem', textAlign: 'center', marginTop: '0.75rem' }}>
          ⚠ Noch {session.questions.length - answeredCount} Frage(n) unbeantwortet
        </p>
      )}
    </div>
  )
}
