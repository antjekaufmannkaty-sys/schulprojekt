'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@/lib/supabase'

export default function Home() {
  const [activeSessions, setActiveSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchActive() {
    try {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .in('status', ['waiting', 'active'])
        .order('created_at', { ascending: false })
      setActiveSessions((data as Session[]) ?? [])
    } catch {
      setActiveSessions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActive()

    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      channel = supabase
        .channel('home-sessions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchActive)
        .subscribe()
    } catch {
      // Realtime nicht verfügbar, polling reicht
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="center" style={{ flexDirection: 'column', gap: '0' }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2.5rem' }}>
          SchulApp
        </h1>

        {loading ? (
          <div className="card" style={{ padding: '2.5rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '1rem' }}>
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
            <p style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>Verbinde…</p>
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem 1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>😴</div>
            <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.4rem' }}>
              Kein Quiz oder Test aktiv
            </p>
            <p style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>
              Warte, bis die Lehrerin eine Runde startet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {activeSessions.map(session => (
              <Link
                key={session.id}
                href={session.type === 'quiz' ? '/quiz' : '/test'}
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="card"
                  style={{
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '1px solid var(--accent)',
                    background: 'rgba(124, 111, 224, 0.06)',
                    transition: 'background 0.2s',
                    padding: '1.75rem 1.5rem',
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
                    {session.type === 'quiz' ? '🎮' : '📝'}
                  </div>
                  <div
                    className="badge badge-accent"
                    style={{ marginBottom: '0.75rem', fontSize: '0.7rem', letterSpacing: '0.05em' }}
                  >
                    {session.status === 'active' ? '● LÄUFT' : '● WARTET'}
                  </div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    {session.title || (session.type === 'quiz' ? 'Quiz' : 'Test')}
                  </h2>
                  <p style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>
                    {session.type === 'quiz' ? 'Tippe, um mitzumachen' : 'Tippe, um den Test zu starten'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginTop: '2.5rem' }}>
          <Link
            href="/dashboard"
            style={{
              color: 'var(--text2)',
              fontSize: '0.75rem',
              textDecoration: 'none',
              padding: '0.35rem 0.75rem',
              border: '1px solid var(--bg3)',
              borderRadius: '999px',
              transition: 'border-color 0.2s, color 0.2s',
            }}
          >
            Lehrerin-Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
