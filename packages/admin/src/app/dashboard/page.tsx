'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  contentTypes: number;
  entries: number;
  assets: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    // Placeholder stats until API is wired
    setStats({ contentTypes: 1, entries: 0, assets: 0 });
  }, []);

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '1.5rem',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        padding: '1.5rem 0',
        flexShrink: 0,
      }}>
        <div style={{ padding: '0 1.25rem', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            HTML<span style={{ color: 'var(--accent)' }}>ess</span>
          </h1>
        </div>
        <nav>
          {[
            { label: 'Dashboard', href: '/dashboard', active: true },
            { label: 'Content', href: '/dashboard/content', active: false },
            { label: 'Schema', href: '/dashboard/schema', active: false },
            { label: 'Media', href: '/dashboard/media', active: false },
            { label: 'Webhooks', href: '/dashboard/webhooks', active: false },
            { label: 'API Tokens', href: '/dashboard/tokens', active: false },
            { label: 'Settings', href: '/dashboard/settings', active: false },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{
              display: 'block',
              padding: '0.6rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: item.active ? 600 : 400,
              color: item.active ? 'var(--text)' : 'var(--text-muted)',
              background: item.active ? 'rgba(99,102,241,0.1)' : 'transparent',
              borderLeft: item.active ? '2px solid var(--accent)' : '2px solid transparent',
              textDecoration: 'none',
            }}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '2rem 3rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Welcome to HTMLess
          </p>
        </div>

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={cardStyle}>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Content Types</p>
              <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem' }}>{stats.contentTypes}</p>
            </div>
            <div style={cardStyle}>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entries</p>
              <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem' }}>{stats.entries}</p>
            </div>
            <div style={cardStyle}>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assets</p>
              <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem' }}>{stats.assets}</p>
            </div>
          </div>
        )}

        <div style={cardStyle}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Quick Start</h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              1. <Link href="/dashboard/schema" style={{ color: 'var(--accent-light)' }}>Create a content type</Link> with the schema builder
            </li>
            <li style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              2. <Link href="/dashboard/content" style={{ color: 'var(--accent-light)' }}>Add your first entry</Link> using the content editor
            </li>
            <li style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              3. <Link href="/dashboard/tokens" style={{ color: 'var(--accent-light)' }}>Create an API token</Link> to access the delivery API
            </li>
            <li style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              4. Fetch your content at <code style={{ background: 'var(--bg-elevated)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>/cda/v1/content/article</code>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
