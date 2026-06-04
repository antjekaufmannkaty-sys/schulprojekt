'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase, saveAnswer, type Session, type Participant, type Answer } from '@/lib/supabase'

export default function QuizSession() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [score, setScore] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = useCallback((secs: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimeLeft(secs)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    const pid = localStorage.getItem(`participant_${sessionId}`)

    async function load() {
      const { data: s } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
      if (s) { setSession(s); if (s.status === 'active') startTimer(s.timer_secs) }

      if (pid) {
        const { data: p } = await supabase.from('participants').select('*').eq('id', pid).single()
        if (p) { setParticipant(p); setScore(p.score); setAnswers(p.answers ?? []) }
      }
    }
    load()

    const channel = supabase.channel(`quiz-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, payload => {
        const s = payload.new as Session
        setSession(s)
        if (s.status === 'active') {
          setSelected(null)
          setRevealed(false)
          startTimer(s.timer_secs)
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events', filter: `session_id=eq.${sessionId}` }, payload => {
        const ev = payload.new as { type: string }
        if (ev.type === 'reveal') setRevealed(true)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel); if (timerRef.current) clearInterval(timerRef.current) }
  }, [sessionId, startTimer])

  async function handleSelect(optionIndex: number) {
    if (selected !== null || !session || !participant) return
    setSelected(optionIndex)
    if (timerRef.current) clearInterval(timerRef.current)

    const q = session.questions[session.current_q]
    const correct = optionIndex === q.correct
    const earnedPoints = correct ? Math.round(q.points * (timeLeft / session.timer_secs)) : 0
    const newScore = score + earnedPoints
    const newAnswer: Answer = {
      questionIndex: session.current_q,
      selectedOption: optionIndex,
      correct,
      points: earnedPoints,
      timeLeft,
    }
    const newAnswers = [...answers, newAnswer]
    setScore(newScore)
    setAnswers(newAnswers)
    await saveAnswer(participant.id, newAnswers, newScore)
  }

  if (!session) return <div className="center"><p style={{ color: 'var(--text2)' }}>Laden…</p></div>

  if (session.status === 'waiting') {
    return (
      <div className="center">
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Warten auf Start</h2>
          <p style={{ color: 'var(--text2)' }}>{participant?.name ?? ''}  •  {session.title}</p>
        </div>
      </div>
    )
  }

  if (session.status === 'finished') {
    return (
      <div className="center">
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏁</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Fertig!</h2>
          <p style={{ color: 'var(--text2)', marginBottom: '1.5rem' }}>{participant?.name}</p>
          <div className="card" style={{ fontSize: '2rem', fontWeight: 700, textAlign: 'center' }}>
            {score} Punkte
          </div>
        </div>
      </div>
    )
  }

  const q = session.questions[session.current_q]
  if (!q) return <div className="center"><p style={{ color: 'var(--text2)' }}>Keine Frage gefunden.</p></div>

  const timerPct = (timeLeft / session.timer_secs) * 100
  const timerClass = timerPct < 25 ? 'danger' : timerPct < 50 ? 'warning' : ''

  return (
    <div style={{ padding: '1.5rem', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>
          Frage {session.current_q + 1} / {session.questions.length}
        </span>
        <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>{score} Pkt.</span>
      </div>

      <div className="timer-bar" style={{ marginBottom: '1.5rem' }}>
        <div className={`timer-bar-fill ${timerClass}`} style={{ width: `${timerPct}%` }} />
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600, textAlign: 'center' }}>
        {q.text}
      </div>

      <div style={{ textAlign: 'right', marginBottom: '0.75rem', color: 'var(--text2)', fontSize: '0.875rem' }}>
        ⏱ {timeLeft}s
      </div>

      <div className="answer-grid">
        {q.options.map((opt, i) => {
          let cls = 'answer-btn'
          if (revealed) {
            if (i === q.correct) cls += ' correct'
            else if (i === selected) cls += ' wrong'
          } else if (i === selected) cls += ' selected'
          return (
            <button key={i} className={cls} onClick={() => handleSelect(i)} disabled={selected !== null}>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
