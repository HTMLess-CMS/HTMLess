'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

interface Field {
  key: string;
  name: string;
  type: string;
  required: boolean;
  sortOrder?: number;
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

  // Drag and drop
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  // Inline editing
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Preview API response
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  // Focus the inline edit input when it appears
  useEffect(() => {
    if (editingFieldKey && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingFieldKey]);

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

  // ── Drag and drop handlers ──

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  async function handleDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex || !contentType) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder fields locally
    const fields = [...contentType.fields];
    const [moved] = fields.splice(dragIndex, 1);
    fields.splice(targetIndex, 0, moved);

    // Optimistic UI update
    setContentType({ ...contentType, fields });
    setDragIndex(null);
    setDragOverIndex(null);

    // Send PATCH to update sortOrder
    setReordering(true);
    try {
      const order = fields.map((f, i) => ({ key: f.key, sortOrder: i }));
      await apiPatch(`/cma/v1/schemas/types/${typeKey}`, { fieldOrder: order });
      showSuccess('Field order updated');
    } catch (err) {
      // Revert on failure
      setError(err instanceof Error ? err.message : 'Failed to reorder fields');
      await loadType();
    } finally {
      setReordering(false);
    }
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  // ── Inline editing handlers ──

  function startEditing(field: Field) {
    setEditingFieldKey(field.key);
    setEditingName(field.name);
  }

  async function saveInlineEdit() {
    if (!editingFieldKey || !editingName.trim() || !contentType) {
      setEditingFieldKey(null);
      return;
    }

    const field = contentType.fields.find((f) => f.key === editingFieldKey);
    if (!field || field.name === editingName.trim()) {
      setEditingFieldKey(null);
      return;
    }

    // Optimistic update
    const updatedFields = contentType.fields.map((f) =>
      f.key === editingFieldKey ? { ...f, name: editingName.trim() } : f,
    );
    setContentType({ ...contentType, fields: updatedFields });
    const savedKey = editingFieldKey;
    setEditingFieldKey(null);

    try {
      await apiPatch(`/cma/v1/schemas/types/${typeKey}/fields/${savedKey}`, {
        name: editingName.trim(),
      });
      showSuccess(`Field renamed to "${editingName.trim()}"`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename field');
      await loadType();
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveInlineEdit();
    } else if (e.key === 'Escape') {
      setEditingFieldKey(null);
    }
  }

  // ── Preview API response ──

  async function handlePreviewResponse() {
    setShowPreview(true);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const data = await apiGet(`/cda/v1/content/${typeKey}?limit=1`);
      setPreviewData(JSON.stringify(data, null, 2));
    } catch (err) {
      setPreviewData(
        JSON.stringify(
          {
            error: true,
            message: err instanceof Error ? err.message : 'Failed to fetch preview',
            hint: 'No published entries found for this type, or the CDA endpoint is not available.',
          },
          null,
          2,
        ),
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  // ── Styles ──

  const typeColorMap: Record<string, string> = {
    text: '#3b82f6',
    richtext: '#8b5cf6',
    number: '#22c55e',
    boolean: '#f59e0b',
    date: '#ec4899',
    media: '#a855f7',
    reference: '#ec4899',
    json: '#64748b',
    slug: '#06b6d4',
    enum: '#a78bfa',
  };

  const typeIconMap: Record<string, string> = {
    text: 'T',
    richtext: 'R',
    number: '#',
    boolean: '?',
    date: 'D',
    media: 'M',
    reference: 'L',
    json: '{}',
    slug: '/',
    enum: 'E',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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
          <button
            onClick={handlePreviewResponse}
            style={{
              ...btnSecondary,
              padding: '0.3rem 0.75rem',
              fontSize: '0.72rem',
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--accent-light)',
              borderColor: 'rgba(99,102,241,0.3)',
            }}
          >
            <span style={{ fontSize: '0.8rem' }}>&#x25B6;</span> Preview API Response
          </button>
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

      {/* Preview API Response Panel */}
      {showPreview && (
        <div style={{
          ...cardStyle,
          marginBottom: '1.5rem',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                background: 'rgba(34,197,94,0.15)',
                color: '#22c55e',
                letterSpacing: '0.04em',
              }}>
                GET
              </span>
              /cda/v1/content/{typeKey}
            </h3>
            <button
              onClick={() => setShowPreview(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '1.1rem',
                padding: '0.15rem 0.35rem',
                lineHeight: 1,
              }}
            >
              x
            </button>
          </div>
          {previewLoading ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Fetching...</p>
          ) : (
            <pre style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1rem',
              overflow: 'auto',
              maxHeight: '400px',
              fontSize: '0.78rem',
              lineHeight: '1.6',
              color: 'var(--text-muted)',
              fontFamily: 'monospace',
            }}>
              {previewData}
            </pre>
          )}
        </div>
      )}

      {/* Fields List */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
            Fields ({contentType.fields?.length ?? 0})
          </h3>
          {reordering && (
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-light)', fontWeight: 500 }}>
              Saving order...
            </span>
          )}
        </div>
        {!contentType.fields || contentType.fields.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            No fields defined. Add your first field below.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {contentType.fields.map((field, index) => (
              <div
                key={field.key}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.7rem 0.85rem',
                  background: dragIndex === index
                    ? 'var(--bg-elevated)'
                    : dragOverIndex === index
                      ? 'color-mix(in srgb, var(--accent) 8%, var(--bg))'
                      : 'var(--bg)',
                  borderRadius: '8px',
                  border: dragOverIndex === index
                    ? '1px solid var(--accent)'
                    : '1px solid var(--border)',
                  opacity: dragIndex === index ? 0.5 : 1,
                  cursor: 'grab',
                  transition: 'border-color 0.15s, background 0.15s',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                  {/* Drag handle */}
                  <span style={{
                    color: 'var(--text-dim)',
                    fontSize: '0.75rem',
                    cursor: 'grab',
                    userSelect: 'none',
                    flexShrink: 0,
                    letterSpacing: '0.05em',
                  }}>
                    &#x2630;
                  </span>

                  {/* Type badge with icon */}
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    background: `color-mix(in srgb, ${typeColorMap[field.type] ?? '#6366f1'} 18%, transparent)`,
                    color: typeColorMap[field.type] ?? '#6366f1',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    flexShrink: 0,
                  }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      opacity: 0.7,
                    }}>
                      {typeIconMap[field.type] ?? '?'}
                    </span>
                    {field.type}
                  </span>

                  {/* Field name (editable) */}
                  <div style={{ minWidth: 0 }}>
                    {editingFieldKey === field.key ? (
                      <input
                        ref={editInputRef}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={saveInlineEdit}
                        onKeyDown={handleEditKeyDown}
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--accent)',
                          borderRadius: '4px',
                          color: 'var(--text)',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          padding: '0.15rem 0.4rem',
                          outline: 'none',
                          width: '200px',
                        }}
                      />
                    ) : (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(field);
                        }}
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          cursor: 'text',
                          padding: '0.1rem 0.25rem',
                          borderRadius: '3px',
                          transition: 'background 0.1s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                        title="Click to edit name"
                      >
                        {field.name}
                      </span>
                    )}
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
                      flexShrink: 0,
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
                    flexShrink: 0,
                    marginLeft: '0.5rem',
                  }}
                >
                  {deletingField === field.key ? '...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
        {contentType.fields && contentType.fields.length > 1 && (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.72rem', marginTop: '0.75rem', fontStyle: 'italic' }}>
            Drag fields to reorder. Click a field name to rename it.
          </p>
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
