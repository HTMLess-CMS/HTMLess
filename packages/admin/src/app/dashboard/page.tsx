'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface DashboardStats {
  contentTypes: number;
  entries: number;
  assets: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [types, entries, assets] = await Promise.allSettled([
          apiGet<{ data: unknown[] }>('/cma/v1/schemas/types'),
          apiGet<{ data: unknown[] }>('/cma/v1/entries'),
          apiGet<{ data: unknown[] }>('/cma/v1/assets'),
        ]);
        setStats({
          contentTypes: types.status === 'fulfilled' ? (types.value.data?.length ?? 0) : 0,
          entries: entries.status === 'fulfilled' ? (entries.value.data?.length ?? 0) : 0,
          assets: assets.status === 'fulfilled' ? (assets.value.data?.length ?? 0) : 0,
        });
      } catch {
        setStats({ contentTypes: 0, entries: 0, assets: 0 });
      }
    }
    load();
  }, []);

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '1.5rem',
  };

  return (
    <>
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
    </>
  );
}
