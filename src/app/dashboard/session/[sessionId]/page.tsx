'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  supabase,
  sendEvent,
  updateSessionStatus,
  sessionCodeFromId,
  type Session,
  type Participant,
} from '@/lib/supabase'

export default function SessionControl() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const { data: s } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
      if (s) setSession(s)
      const { data: psRaw } = await supabase.from('participants').select('*').eq('session_id', sessionId).order('score', { ascending: false })
      const ps = psRaw as Participant[] | null
      if (ps) {
        setParticipants(ps)
        const n: Record<string, string> = {}
        ps.forEach(p => { if (p.note) n[p.id] = p.note })
        setNotes(n)
      }
    }
    load()

    const channel = supabase.channel(`ctrl-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, payload => {
        setSession(payload.new as Session)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` }, () => {
        supabase.from('participants').select('*').eq('session_id', sessionId).order('score', { ascending: false })
          .then(({ data }) => { if (data) setParticipants(data) })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  async function handleStart() {
    await updateSessionStatus(sessionId, 'active', { current_q: 0 })
  }

  async function handleReveal() {
    if (!session) return
    await sendEvent(sessionId, 'reveal', { q: session.current_q })
  }

  async function handleNext() {
    if (!session) return
    const nextQ = session.current_q + 1
    if (nextQ >= session.questions.length) {
      await updateSessionStatus(sessionId, 'finished')
    } else {
      await supabase.from('sessions').update({ current_q: nextQ }).eq('id', sessionId)
    }
  }

  async function handleFinish() {
    await updateSessionStatus(sessionId, 'finished')
  }

  async function saveNote(participantId: string, note: string) {
    await supabase.from('participants').update({ note }).eq('id', participantId)
  }

  function copyForClaude() {
    if (!session) return
    const lines = participants.map(p => {
      const answers = (p.answers ?? []) as Array<{ questionIndex: number; selectedOption: number | null; correct: boolean }>
      const correct = answers.filter(a => a.correct).length
      const total = session.questions.length
      return `${p.name} (${p.klasse}): ${correct}/${total} richtig, ${p.score} Punkte`
    })
    const text = `Test: ${session.title}\n\n${lines.join('\n')}`
    navigator.clipboard.writeText(text)
  }

  if (!session) return <div className="center"><p style={{ color: 'var(--text2)' }}>Laden…</p></div>

  const code = sessionCodeFromId(session.id)
  const sorted = [...participants].sort((a, b) => b.score - a.score)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href="/dashboard" style={{ color: 'var(--text2)', fontSize: '0.875rem', textDecoration: 'none' }}>← Dashboard</Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{session.title}</h1>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge">{session.type === 'quiz' ? '🎮 Quiz' : '📝 Test'}</span>
            <span className="badge badge-accent" style={{ fontSize: '1.1rem', letterSpacing: '0.1em' }}>Code: {code}</span>
            <span className={`badge ${session.status === 'active' ? 'badge-green' : session.status === 'waiting' ? 'badge-amber' : ''}`}>
              {session.status === 'waiting' ? 'Wartend' : session.status === 'active' ? 'Aktiv' : 'Beendet'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {session.status === 'waiting' && (
            <button className="btn btn-green" onClick={handleStart}>▶ Starten</button>
          )}
          {session.status === 'active' && session.type === 'quiz' && (
            <>
              <button className="btn btn-primary" onClick={handleReveal}>💡 Auflösen</button>
              <button className="btn btn-secondary" onClick={handleNext}>
                {session.current_q + 1 >= session.questions.length ? '🏁 Beenden' : `Nächste Frage (${session.current_q + 2}/${session.questions.length})`}
              </button>
            </>
          )}
          {session.status === 'active' && session.type === 'test' && (
            <button className="btn btn-secondary" onClick={handleFinish}>🏁 Test beenden</button>
          )}
          {session.status === 'finished' && (
            <button className="btn btn-secondary" onClick={copyForClaude}>📋 Kopieren</button>
          )}
        </div>
      </div>

      {/* Quiz: current question info */}
      {session.status === 'active' && session.type === 'quiz' && (
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <div style={{ color: 'var(--text2)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Frage {session.current_q + 1} / {session.questions.length}
          </div>
          <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
            {session.questions[session.current_q]?.text}
          </div>
        </div>
      )}

      {/* Participants */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
        Teilnehmer ({participants.length})
      </h2>

      {participants.length === 0 && (
        <p style={{ color: 'var(--text2)' }}>Noch keine Teilnehmer.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sorted.map((p, i) => {
          const answersArr = (p.answers ?? []) as Array<{ correct: boolean }>
          const correct = answersArr.filter(a => a.correct).length
          const total = session.questions.length
          return (
            <div key={p.id} className="rank-row">
              <div className={`rank-num ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>
                  {p.klasse}
                  {answersArr.length > 0 && ` • ${correct}/${total} richtig`}
                </div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--accent2)', marginRight: '0.5rem' }}>
                {p.score} Pkt.
              </div>
              {session.type === 'test' && (
                <input
                  type="text"
                  placeholder="Note"
                  value={notes[p.id] ?? ''}
                  onChange={e => setNotes(prev => ({ ...prev, [p.id]: e.target.value }))}
                  onBlur={() => saveNote(p.id, notes[p.id] ?? '')}
                  style={{ width: 80, textAlign: 'center', padding: '0.4rem 0.5rem', fontSize: '0.9rem' }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
