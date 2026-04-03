'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';

interface ContentType {
  key: string;
  name: string;
  version: number;
  fields: { key: string }[];
  createdAt: string;
  updatedAt: string;
}

export default function SchemaListPage() {
  const router = useRouter();
  const [types, setTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTypes();
  }, []);

  async function loadTypes() {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<{ data: ContentType[] }>('/cma/v1/schemas/types');
      setTypes(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content types');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const result = await apiPost<ContentType>('/cma/v1/schemas/types', {
        name: newName,
        key: newKey,
      });
      setShowCreate(false);
      setNewName('');
      setNewKey('');
      router.push(`/dashboard/schema/${result.key}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create content type');
    } finally {
      setCreating(false);
    }
  }

  // Auto-generate key from name
  function handleNameChange(name: string) {
    setNewName(name);
    if (!newKey || newKey === slugify(newName)) {
      setNewKey(slugify(name));
    }
  }

  function slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
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

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '1.25rem',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Schema</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Define content types and their fields
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={btnPrimary}>
          New Type
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Create Content Type</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Name *
              </label>
              <input
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Blog Post"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Key *
              </label>
              <input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="blog_post"
                required
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                Unique identifier used in API calls. Cannot be changed later.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCreate(false)} style={btnSecondary}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                style={{ ...btnPrimary, opacity: creating ? 0.6 : 1, cursor: creating ? 'not-allowed' : 'pointer' }}
              >
                {creating ? 'Creating...' : 'Create Type'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Types Grid */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading content types...</p>
      ) : types.length === 0 ? (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>No content types yet</p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            Create your first content type to define your schema.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {types.map((type) => (
            <div
              key={type.key}
              onClick={() => router.push(`/dashboard/schema/${type.key}`)}
              style={cardStyle}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{type.name}</h3>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  color: 'var(--text-dim)',
                  background: 'var(--bg-elevated)',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                }}>
                  v{type.version}
                </span>
              </div>
              <code style={{
                fontSize: '0.8rem',
                color: 'var(--accent-light)',
                background: 'var(--bg)',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                display: 'inline-block',
                marginBottom: '0.75rem',
              }}>
                {type.key}
              </code>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {type.fields?.length ?? 0} field{(type.fields?.length ?? 0) !== 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
