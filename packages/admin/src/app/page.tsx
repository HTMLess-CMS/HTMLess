import Link from 'next/link';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '2rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          HTML<span style={{ color: 'var(--accent)' }}>ess</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1.1rem' }}>
          Headless CMS Admin
        </p>
      </div>
      <Link href="/login" style={{
        background: 'var(--accent)',
        color: 'var(--text)',
        padding: '0.75rem 2rem',
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '0.95rem',
        textDecoration: 'none',
      }}>
        Sign In
      </Link>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>v0.1.0</p>
    </div>
  );
}
