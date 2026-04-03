'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPost, apiDelete } from '@/lib/api';

interface Field {
  key: string;
  name: string;
  type: string;
  required: boolean;
}

interface ContentType {
  key: string;
  name: string;
  version: number;
  fields: Field[];
  createdAt: string;
  updatedAt: string;
}

const FIELD_TYPES = [
  'text',
  'richtext',
  'number',
  'boolean',
  'date',
  'media',
  'reference',
  'json',
  'slug',
  'enum',
];

export default function SchemaEditorPage() {
  const params = useParams();
  const router = useRouter();
  const typeKey = params.typeKey as string;

  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add field form
  const [fieldKey, setFieldKey] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingField, setDeletingField] = useState<string | null>(null);

  const loadType = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<ContentType>(`/cma/v1/schemas/types/${typeKey}`);
      setContentType(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content type');
    } finally {
      setLoading(false);
    }
  }, [typeKey]);

  useEffect(() => {
    loadType();
  }, [loadType]);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  function handleFieldNameChange(name: string) {
    setFieldName(name);
    if (!fieldKey || fieldKey === slugify(fieldName)) {
      setFieldKey(slugify(name));
    }
  }

  function slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  async function handleAddField(e: React.FormEvent) {
    e.preventDefault();
    if (!fieldKey || !fieldName) return;
    setAdding(true);
    setError('');
    try {
      await apiPost(`/cma/v1/schemas/types/${typeKey}/fields`, {
        key: fieldKey,
        name: fieldName,
        type: fieldType,
        required: fieldRequired,
      });
      setFieldKey('');
      setFieldName('');
      setFieldType('text');
      setFieldRequired(false);
      showSuccess(`Field "${fieldName}" added`);
      await loadType();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add field');
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteField(key: string) {
    setDeletingField(key);
    setError('');
    try {
      await apiDelete(`/cma/v1/schemas/types/${typeKey}/fields/${key}`);
      showSuccess(`Field "${key}" removed`);
      await loadType();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete field');
    } finally {
      setDeletingField(null);
    }
  }

  const typeColorMap: Record<string, string> = {
    text: '#6366f1',
    richtext: '#8b5cf6',
    number: '#06b6d4',
    boolean: '#f59e0b',
    date: '#ec4899',
    media: '#10b981',
    reference: '#f97316',
    json: '#64748b',
    slug: '#22d3ee',
    enum: '#a78bfa',
  };

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
    padding: '0.5rem 1rem',
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontWeight: 500,
    fontSize: '0.8rem',
    cursor: 'pointer',
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '1.25rem',
  };

  if (loading) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading schema...</p>;
  }

  if (!contentType) {
    return (
      <div>
        <p style={{ color: 'var(--red)', fontSize: '0.9rem', marginBottom: '1rem' }}>{error || 'Content type not found'}</p>
        <button onClick={() => router.push('/dashboard/schema')} style={btnSecondary}>Back to Schema</button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.push('/dashboard/schema')}
          style={{ ...btnSecondary, padding: '0.3rem 0.6rem', fontSize: '0.75rem', marginBottom: '0.75rem' }}
        >
          &larr; Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{contentType.name}</h2>
          <code style={{
            fontSize: '0.8rem',
            color: 'var(--accent-light)',
            background: 'var(--bg-elevated)',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
          }}>
            {contentType.key}
          </code>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 500,
            color: 'var(--text-dim)',
            background: 'var(--bg-elevated)',
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
          }}>
            v{contentType.version}
          </span>
        </div>
      </div>

      {/* Messages */}
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
      {successMsg && (
        <div style={{
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          color: 'var(--green)',
          fontSize: '0.85rem',
          marginBottom: '1rem',
        }}>
          {successMsg}
        </div>
      )}

      {/* Fields List */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Fields ({contentType.fields?.length ?? 0})
        </h3>
        {!contentType.fields || contentType.fields.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            No fields defined. Add your first field below.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {contentType.fields.map((field) => (
              <div
                key={field.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.7rem 0.85rem',
                  background: 'var(--bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    background: `color-mix(in srgb, ${typeColorMap[field.type] ?? '#6366f1'} 18%, transparent)`,
                    color: typeColorMap[field.type] ?? '#6366f1',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}>
                    {field.type}
                  </span>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{field.name}</span>
                    <code style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-dim)',
                    }}>
                      {field.key}
                    </code>
                  </div>
                  {field.required && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      padding: '0.1rem 0.35rem',
                      borderRadius: '3px',
                      background: 'rgba(239,68,68,0.15)',
                      color: 'var(--red)',
                      textTransform: 'uppercase',
                    }}>
                      Required
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteField(field.key)}
                  disabled={deletingField === field.key}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '4px',
                    color: 'var(--red)',
                    cursor: deletingField === field.key ? 'not-allowed' : 'pointer',
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    opacity: deletingField === field.key ? 0.5 : 1,
                  }}
                >
                  {deletingField === field.key ? '...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Field Form */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Add Field</h3>
        <form onSubmit={handleAddField}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Name *
              </label>
              <input
                value={fieldName}
                onChange={(e) => handleFieldNameChange(e.target.value)}
                placeholder="Title"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Key *
              </label>
              <input
                value={fieldKey}
                onChange={(e) => setFieldKey(e.target.value)}
                placeholder="title"
                required
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Type
              </label>
              <select
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div style={{ paddingBottom: '0.1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={fieldRequired}
                  onChange={(e) => setFieldRequired(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                />
                Required
              </label>
            </div>
            <button
              type="submit"
              disabled={adding}
              style={{ ...btnPrimary, opacity: adding ? 0.6 : 1, cursor: adding ? 'not-allowed' : 'pointer' }}
            >
              {adding ? 'Adding...' : 'Add Field'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
