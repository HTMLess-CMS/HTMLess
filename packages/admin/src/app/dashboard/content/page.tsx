'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';

interface Entry {
  id: string;
  slug: string;
  contentTypeKey: string;
  status: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface ContentType {
  key: string;
  name: string;
}

const statusColors: Record<string, string> = {
  draft: 'var(--text-dim)',
  published: 'var(--green)',
  scheduled: 'var(--amber)',
  archived: 'var(--red)',
};

export default function ContentListPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [types, setTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [createType, setCreateType] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [entriesRes, typesRes] = await Promise.all([
        apiGet<{ data: Entry[] }>('/cma/v1/entries'),
        apiGet<{ data: ContentType[] }>('/cma/v1/schemas/types'),
      ]);
      setEntries(entriesRes.data ?? []);
      setTypes(typesRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createType) return;
    setCreating(true);
    setError('');
    try {
      const entry = await apiPost<Entry>('/cma/v1/entries', {
        contentTypeKey: createType,
        slug: createSlug || undefined,
        data: createTitle ? { title: createTitle } : {},
      });
      setShowCreate(false);
      setCreateType('');
      setCreateSlug('');
      setCreateTitle('');
      router.push(`/dashboard/content/${entry.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entry');
    } finally {
      setCreating(false);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function getTitle(entry: Entry): string {
    const d = entry.data;
    if (d && typeof d === 'object') {
      if (typeof d.title === 'string') return d.title;
      if (typeof d.name === 'string') return d.name;
      if (typeof d.heading === 'string') return d.heading;
    }
    return entry.slug || 'Untitled';
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.85rem',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
    fontSize: '0.85rem',
    outline: 'none',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '0.55rem 1.1rem',
    background: 'var(--accent)',
    color: 'var(--text)',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
  };

  const btnSecondary: React.CSSProperties = {
    padding: '0.55rem 1.1rem',
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontWeight: 500,
    fontSize: '0.85rem',
    cursor: 'pointer',
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Content</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage your content entries
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={btnPrimary}>
          New Entry
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          color: 'var(--red)',
          fontSize: '0.85rem',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <form onSubmit={handleCreate} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '2rem',
            width: '100%',
            maxWidth: '440px',
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Create New Entry</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Content Type *
              </label>
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value)}
                required
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Select a content type...</option>
                {types.map((t) => (
                  <option key={t.key} value={t.key}>{t.name} ({t.key})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Slug
              </label>
              <input
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value)}
                placeholder="my-entry-slug"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Title
              </label>
              <input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Entry title"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                style={btnSecondary}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                style={{ ...btnPrimary, opacity: creating ? 0.6 : 1, cursor: creating ? 'not-allowed' : 'pointer' }}
              >
                {creating ? 'Creating...' : 'Create Entry'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Entries Table */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading entries...</p>
      ) : entries.length === 0 ? (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>No entries yet</p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            Create your first entry to get started.
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Title', 'Slug', 'Type', 'Status', 'Updated'].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-dim)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => router.push(`/dashboard/content/${entry.id}`)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>
                    {getTitle(entry)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <code style={{ background: 'var(--bg-elevated)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                      {entry.slug || '--'}
                    </code>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {entry.contentTypeKey}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.15rem 0.55rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: statusColors[entry.status] ?? 'var(--text-dim)',
                      background: `color-mix(in srgb, ${statusColors[entry.status] ?? 'var(--text-dim)'} 15%, transparent)`,
                    }}>
                      {entry.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {formatDate(entry.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
