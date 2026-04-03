'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '@/lib/api';

export interface BlockInstance {
  typeKey: string;
  attrs: Record<string, unknown>;
  children?: BlockInstance[];
}

interface BlockDefinition {
  id: string;
  key: string;
  title: string;
  description?: string;
  icon?: string;
  version: string;
  builtIn: boolean;
  attributesSchema: Record<string, unknown>;
}

interface BlocksEditorProps {
  blocks: BlockInstance[];
  onChange: (blocks: BlockInstance[]) => void;
  spaceId: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  color: 'var(--text)',
  fontSize: '0.8rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  fontFamily: 'monospace',
  fontSize: '0.78rem',
  lineHeight: '1.5',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 500,
  color: 'var(--text-dim)',
  marginBottom: '0.3rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const smallBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  color: 'var(--text-dim)',
  cursor: 'pointer',
  fontSize: '0.7rem',
  padding: '0.2rem 0.45rem',
  lineHeight: 1,
};

function defaultAttrsForType(typeKey: string): Record<string, unknown> {
  switch (typeKey) {
    case 'paragraph': return { text: '' };
    case 'heading': return { level: 2, text: '' };
    case 'image': return { assetId: '', alt: '', caption: '' };
    case 'callout': return { tone: 'info', title: '', body: '' };
    case 'embed': return { url: '' };
    case 'list': return { ordered: false, items: [''] };
    case 'code': return { language: '', code: '' };
    default: return {};
  }
}

export default function BlocksEditor({ blocks, onChange, spaceId }: BlocksEditorProps) {
  const [definitions, setDefinitions] = useState<BlockDefinition[]>([]);
  const [loadingDefs, setLoadingDefs] = useState(true);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const loadDefinitions = useCallback(async () => {
    setLoadingDefs(true);
    try {
      const res = await apiGet<{ items?: BlockDefinition[]; data?: BlockDefinition[] }>('/cda/v1/blocks/definitions');
      setDefinitions(res.items ?? res.data ?? []);
    } catch {
      // If the CDA endpoint doesn't exist yet, fall back to hardcoded core block keys
      setDefinitions([
        { id: '1', key: 'paragraph', title: 'Paragraph', icon: 'pilcrow', version: '1.0.0', builtIn: true, attributesSchema: {} },
        { id: '2', key: 'heading', title: 'Heading', icon: 'heading', version: '1.0.0', builtIn: true, attributesSchema: {} },
        { id: '3', key: 'image', title: 'Image', icon: 'image', version: '1.0.0', builtIn: true, attributesSchema: {} },
        { id: '4', key: 'callout', title: 'Callout', icon: 'megaphone', version: '1.0.0', builtIn: true, attributesSchema: {} },
        { id: '5', key: 'embed', title: 'Embed', icon: 'link', version: '1.0.0', builtIn: true, attributesSchema: {} },
        { id: '6', key: 'list', title: 'List', icon: 'list', version: '1.0.0', builtIn: true, attributesSchema: {} },
        { id: '7', key: 'code', title: 'Code', icon: 'code', version: '1.0.0', builtIn: true, attributesSchema: {} },
      ]);
    } finally {
      setLoadingDefs(false);
    }
  }, [spaceId]);

  useEffect(() => {
    loadDefinitions();
  }, [loadDefinitions]);

  function updateBlock(index: number, updated: BlockInstance) {
    const next = [...blocks];
    next[index] = updated;
    onChange(next);
  }

  function updateAttrs(index: number, key: string, value: unknown) {
    const block = blocks[index];
    updateBlock(index, { ...block, attrs: { ...block.attrs, [key]: value } });
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function deleteBlock(index: number) {
    const next = blocks.filter((_, i) => i !== index);
    onChange(next);
  }

  function addBlock(typeKey: string) {
    const newBlock: BlockInstance = {
      typeKey,
      attrs: defaultAttrsForType(typeKey),
    };
    onChange([...blocks, newBlock]);
    setShowAddDropdown(false);
  }

  function getDefTitle(typeKey: string): string {
    const def = definitions.find((d) => d.key === typeKey);
    return def?.title ?? typeKey;
  }

  function renderBlockEditor(block: BlockInstance, index: number) {
    const attrs = block.attrs;

    switch (block.typeKey) {
      case 'paragraph':
        return (
          <div>
            <label style={labelStyle}>Text</label>
            <textarea
              value={String(attrs.text ?? '')}
              onChange={(e) => updateAttrs(index, 'text', e.target.value)}
              rows={3}
              style={textareaStyle}
              placeholder="Enter paragraph text..."
            />
          </div>
        );

      case 'heading':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ width: '100px' }}>
                <label style={labelStyle}>Level</label>
                <select
                  value={Number(attrs.level ?? 2)}
                  onChange={(e) => updateAttrs(index, 'level', parseInt(e.target.value, 10))}
                  style={selectStyle}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>H{n}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Text</label>
                <input
                  value={String(attrs.text ?? '')}
                  onChange={(e) => updateAttrs(index, 'text', e.target.value)}
                  style={inputStyle}
                  placeholder="Heading text..."
                />
              </div>
            </div>
          </div>
        );

      case 'image':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div>
              <label style={labelStyle}>Asset ID</label>
              <input
                value={String(attrs.assetId ?? '')}
                onChange={(e) => updateAttrs(index, 'assetId', e.target.value)}
                style={inputStyle}
                placeholder="Asset ID..."
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Alt Text</label>
                <input
                  value={String(attrs.alt ?? '')}
                  onChange={(e) => updateAttrs(index, 'alt', e.target.value)}
                  style={inputStyle}
                  placeholder="Descriptive alt text..."
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Caption</label>
                <input
                  value={String(attrs.caption ?? '')}
                  onChange={(e) => updateAttrs(index, 'caption', e.target.value)}
                  style={inputStyle}
                  placeholder="Optional caption..."
                />
              </div>
            </div>
          </div>
        );

      case 'callout':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ width: '140px' }}>
                <label style={labelStyle}>Tone</label>
                <select
                  value={String(attrs.tone ?? 'info')}
                  onChange={(e) => updateAttrs(index, 'tone', e.target.value)}
                  style={selectStyle}
                >
                  {['info', 'warning', 'success', 'danger'].map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Title</label>
                <input
                  value={String(attrs.title ?? '')}
                  onChange={(e) => updateAttrs(index, 'title', e.target.value)}
                  style={inputStyle}
                  placeholder="Callout title..."
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Body</label>
              <textarea
                value={String(attrs.body ?? '')}
                onChange={(e) => updateAttrs(index, 'body', e.target.value)}
                rows={3}
                style={textareaStyle}
                placeholder="Callout body text..."
              />
            </div>
          </div>
        );

      case 'embed':
        return (
          <div>
            <label style={labelStyle}>URL</label>
            <input
              value={String(attrs.url ?? '')}
              onChange={(e) => updateAttrs(index, 'url', e.target.value)}
              style={inputStyle}
              placeholder="https://..."
            />
          </div>
        );

      case 'list':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={Boolean(attrs.ordered)}
                  onChange={(e) => updateAttrs(index, 'ordered', e.target.checked)}
                  style={{ marginRight: '0.4rem' }}
                />
                Ordered
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={labelStyle}>Items</label>
              {(Array.isArray(attrs.items) ? attrs.items as string[] : ['']).map((item, itemIdx) => (
                <div key={itemIdx} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', width: '20px', textAlign: 'right', flexShrink: 0 }}>
                    {Boolean(attrs.ordered) ? `${itemIdx + 1}.` : '-'}
                  </span>
                  <input
                    value={String(item)}
                    onChange={(e) => {
                      const items = [...(attrs.items as string[])];
                      items[itemIdx] = e.target.value;
                      updateAttrs(index, 'items', items);
                    }}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder={`Item ${itemIdx + 1}...`}
                  />
                  <button
                    onClick={() => {
                      const items = (attrs.items as string[]).filter((_, i) => i !== itemIdx);
                      updateAttrs(index, 'items', items.length === 0 ? [''] : items);
                    }}
                    style={{ ...smallBtnStyle, color: 'var(--red)' }}
                    title="Remove item"
                  >
                    x
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const items = [...(Array.isArray(attrs.items) ? attrs.items as string[] : []), ''];
                  updateAttrs(index, 'items', items);
                }}
                style={{ ...smallBtnStyle, alignSelf: 'flex-start', marginTop: '0.2rem' }}
              >
                + Add Item
              </button>
            </div>
          </div>
        );

      case 'code':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div>
              <label style={labelStyle}>Language</label>
              <input
                value={String(attrs.language ?? '')}
                onChange={(e) => updateAttrs(index, 'language', e.target.value)}
                style={{ ...inputStyle, width: '200px' }}
                placeholder="e.g. javascript, python..."
              />
            </div>
            <div>
              <label style={labelStyle}>Code</label>
              <textarea
                value={String(attrs.code ?? '')}
                onChange={(e) => updateAttrs(index, 'code', e.target.value)}
                rows={8}
                style={{ ...textareaStyle, fontFamily: 'monospace' }}
                placeholder="// Your code here..."
              />
            </div>
          </div>
        );

      default:
        return (
          <div>
            <label style={labelStyle}>Attributes (JSON)</label>
            <textarea
              value={JSON.stringify(attrs, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  updateBlock(index, { ...block, attrs: parsed });
                } catch {
                  // Keep the raw text in the textarea without updating parsed attrs
                }
              }}
              rows={6}
              style={textareaStyle}
              placeholder='{ "key": "value" }'
            />
          </div>
        );
    }
  }

  const toneColors: Record<string, string> = {
    info: 'var(--accent)',
    warning: 'var(--amber)',
    success: 'var(--green)',
    danger: 'var(--red)',
  };

  function blockAccentColor(block: BlockInstance): string {
    if (block.typeKey === 'callout') {
      return toneColors[String(block.attrs.tone)] ?? 'var(--border)';
    }
    return 'var(--border)';
  }

  if (loadingDefs) {
    return <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', padding: '0.5rem 0' }}>Loading block definitions...</p>;
  }

  return (
    <div>
      {blocks.length === 0 && (
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', padding: '1rem 0' }}>
          No blocks yet. Add your first block below.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {blocks.map((block, index) => (
          <div
            key={index}
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${blockAccentColor(block)}`,
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            {/* Block header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'var(--accent-light)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {getDefTitle(block.typeKey)}
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-dim)',
                  background: 'var(--bg-elevated)',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '3px',
                }}>
                  #{index + 1}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={() => moveBlock(index, -1)}
                  disabled={index === 0}
                  style={{ ...smallBtnStyle, opacity: index === 0 ? 0.3 : 1 }}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveBlock(index, 1)}
                  disabled={index === blocks.length - 1}
                  style={{ ...smallBtnStyle, opacity: index === blocks.length - 1 ? 0.3 : 1 }}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => deleteBlock(index)}
                  style={{ ...smallBtnStyle, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }}
                  title="Delete block"
                >
                  x
                </button>
              </div>
            </div>

            {/* Block-specific editor */}
            {renderBlockEditor(block, index)}
          </div>
        ))}
      </div>

      {/* Add Block button */}
      <div style={{ marginTop: '0.75rem', position: 'relative' }}>
        <button
          onClick={() => setShowAddDropdown(!showAddDropdown)}
          style={{
            width: '100%',
            padding: '0.6rem',
            background: 'transparent',
            border: '2px dashed var(--border)',
            borderRadius: '8px',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--text)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          + Add Block
        </button>

        {showAddDropdown && (
          <>
            {/* Backdrop to close dropdown */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 99 }}
              onClick={() => setShowAddDropdown(false)}
            />
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: '4px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.35rem',
              zIndex: 100,
              maxHeight: '300px',
              overflowY: 'auto',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
            }}>
              {definitions.map((def) => (
                <button
                  key={def.key}
                  onClick={() => addBlock(def.key)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'var(--text)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontWeight: 500 }}>{def.title}</span>
                  {def.description && (
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                      {def.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
