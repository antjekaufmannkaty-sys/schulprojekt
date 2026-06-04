'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, createSession, deleteSession, sessionCodeFromId, type Session, type Question } from '@/lib/supabase'

function parseQuestionsFromHTML(html: string): Question[] {
  const match = html.match(/<script[^>]+id=["']questions["'][^>]*>([\s\S]*?)<\/script>/)
  if (!match) return []
  try {
    return JSON.parse(match[1].trim())
  } catch {
    return []
  }
}

function PinScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/dashboard-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    setLoading(false)
    if (res.ok) {
      sessionStorage.setItem('dashboard_authed', 'true')
      onSuccess()
    } else {
      setError('Falscher PIN.')
      setPin('')
    }
  }

  return (
    <div className="center" style={{ minHeight: '100vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>
          Dashboard – PIN eingeben
        </h1>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            autoFocus
            style={{ marginBottom: '1rem', textAlign: 'center', letterSpacing: '0.25em', fontSize: '1.25rem' }}
          />
          {error && <p style={{ color: 'var(--red)', fontSize: '0.875rem', marginBottom: '0.75rem', textAlign: 'center' }}>{error}</p>}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading || !pin}>
            {loading ? 'Prüfen…' : 'Weiter'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'quiz' | 'test'>('quiz')
  const [timer, setTimer] = useState(30)
  const [questions, setQuestions] = useState<Question[]>([])
  const [fileError, setFileError] = useState('')
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const ok = sessionStorage.getItem('dashboard_authed') === 'true'
    setAuthed(ok)
  }, [])

  useEffect(() => {
    if (!authed) return
    async function load() {
      const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: false })
      setSessions(data ?? [])
      setLoading(false)
    }
    load()

    const channel = supabase.channel('dashboard-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [authed])

  if (authed === null) return null
  if (!authed) return <PinScreen onSuccess={() => setAuthed(true)} />

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError('')
    setQuestions([])
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const html = ev.target?.result as string
      const qs = parseQuestionsFromHTML(html)
      if (!qs.length) { setFileError('Keine Fragen in der HTML-Datei gefunden.'); return }
      setQuestions(qs)
    }
    reader.readAsText(file)
  }

  async function handleCreate() {
    if (!title.trim() || !questions.length) return
    setCreating(true)
    try {
      await createSession(title.trim(), type, questions, type === 'quiz' ? timer : 0)
      setTitle('')
      setQuestions([])
    } catch {
      // ignore
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault()
    if (!confirm('Session wirklich löschen? Alle Teilnehmerdaten gehen verloren.')) return
    setDeletingId(id)
    try {
      await deleteSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
    } catch {
      alert('Löschen fehlgeschlagen.')
    } finally {
      setDeletingId(null)
    }
  }

  const statusLabel = (s: string) => {
    if (s === 'waiting') return <span className="badge badge-amber">Wartend</span>
    if (s === 'active') return <span className="badge badge-green">Aktiv</span>
    return <span className="badge">Beendet</span>
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Dashboard</h1>
        <Link href="/" style={{ color: 'var(--text2)', fontSize: '0.875rem', textDecoration: 'none' }}>← Startseite</Link>
      </div>

      {/* New session form */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Neue Session</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label>Titel</label>
            <input type="text" placeholder="z.B. Mathe Kapitel 3" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label>Typ</label>
            <select value={type} onChange={e => setType(e.target.value as 'quiz' | 'test')}>
              <option value="quiz">Quiz (Echtzeit)</option>
              <option value="test">Test (Klassenarbeit)</option>
            </select>
          </div>
        </div>
        {type === 'quiz' && (
          <div style={{ marginBottom: '1rem' }}>
            <label>Timer pro Frage (Sekunden)</label>
            <input type="number" value={timer} min={5} max={120} onChange={e => setTimer(Number(e.target.value))} style={{ maxWidth: 120 }} />
          </div>
        )}
        <div style={{ marginBottom: '1rem' }}>
          <label>Fragen-HTML hochladen</label>
          <input type="file" accept=".html,.htm" onChange={handleFile} style={{ background: 'transparent', border: 'none', padding: 0, color: 'var(--text2)' }} />
          {fileError && <p style={{ color: 'var(--red)', fontSize: '0.875rem', marginTop: '0.4rem' }}>{fileError}</p>}
          {questions.length > 0 && (
            <p style={{ color: 'var(--green)', fontSize: '0.875rem', marginTop: '0.4rem' }}>
              ✓ {questions.length} Fragen geladen
            </p>
          )}
        </div>
        <button
          className="btn btn-primary"
          onClick={handleCreate}
          disabled={creating || !title.trim() || !questions.length}
        >
          {creating ? 'Erstelle…' : '+ Session erstellen'}
        </button>
      </div>

      {/* Sessions list */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Sessions</h2>
      {loading && <p style={{ color: 'var(--text2)' }}>Laden…</p>}
      {!loading && sessions.length === 0 && (
        <p style={{ color: 'var(--text2)' }}>Noch keine Sessions. Erstelle eine oben.</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {sessions.map(s => (
          <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{s.title}</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {statusLabel(s.status)}
                <span className="badge">{s.type === 'quiz' ? '🎮 Quiz' : '📝 Test'}</span>
                <span className="badge badge-accent">Code: {sessionCodeFromId(s.id)}</span>
                <span style={{ color: 'var(--text2)', fontSize: '0.75rem' }}>{s.questions.length} Fragen</span>
              </div>
            </div>
            <Link
              href={`/dashboard/session/${s.id}`}
              className="btn btn-secondary"
              style={{ textDecoration: 'none', flexShrink: 0 }}
            >
              {s.status === 'waiting' ? '▶ Steuern' : s.status === 'active' ? '→ Live' : '→ Ergebnisse'}
            </Link>
            <button
              className="btn"
              onClick={e => handleDelete(s.id, e)}
              disabled={deletingId === s.id}
              style={{ flexShrink: 0, background: 'var(--red, #e55)', color: '#fff', border: 'none', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              title="Session löschen"
            >
              {deletingId === s.id ? '…' : '🗑'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
