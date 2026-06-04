import Link from 'next/link'

export default function Home() {
  return (
    <div className="center">
      <div style={{ width: '100%', maxWidth: 560 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>
          SchulApp
        </h1>
        <p style={{ color: 'var(--text2)', textAlign: 'center', marginBottom: '2.5rem' }}>
          Wähle einen Modus
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <Link href="/quiz" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s', border: '1px solid var(--bg3)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎮</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Quiz</h2>
              <p style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>
                Kahoot-Style, Echtzeit, alle gleichzeitig
              </p>
            </div>
          </Link>

          <Link href="/test" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s', border: '1px solid var(--bg3)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📝</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Test</h2>
              <p style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>
                Klassenarbeit, PIN-Login, eigenes Tempo
              </p>
            </div>
          </Link>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link
            href="/dashboard"
            style={{ color: 'var(--text2)', fontSize: '0.875rem', textDecoration: 'none' }}
          >
            Lehrerin-Dashboard →
          </Link>
        </div>
      </div>
    </div>
  )
}
