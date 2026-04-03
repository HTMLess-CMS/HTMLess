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

// ── Block type icons and colors ──

const blockIconMap: Record<string, string> = {
  paragraph: '\u00B6',    // pilcrow
  heading: 'H',
  image: '\u25A3',        // square with pattern
  callout: '\u26A0',      // warning sign
  embed: '\u29C9',        // link
  list: '\u2630',         // trigram
  code: '</>',
};

const blockColorMap: Record<string, string> = {
  paragraph: '#a1a1aa',
  heading: '#3b82f6',
  image: '#22c55e',
  callout: '#f59e0b',
  embed: '#06b6d4',
  list: '#8b5cf6',
  code: '#ec4899',
};

const blockCategoryMap: Record<string, string> = {
  paragraph: 'Text',
  heading: 'Text',
  list: 'Text',
  code: 'Text',
  image: 'Media',
  embed: 'Media',
  callout: 'Layout',
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

  // Collapse/expand state
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<number>>(new Set());

  // Drag and drop
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

    // Update collapsed set with new indices
    const newCollapsed = new Set<number>();
    for (const idx of collapsedBlocks) {
      if (idx === index) newCollapsed.add(target);
      else if (idx === target) newCollapsed.add(index);
      else newCollapsed.add(idx);
    }
    setCollapsedBlocks(newCollapsed);
    onChange(next);
  }

  function deleteBlock(index: number) {
    const next = blocks.filter((_, i) => i !== index);
    // Update collapsed set
    const newCollapsed = new Set<number>();
    for (const idx of collapsedBlocks) {
      if (idx < index) newCollapsed.add(idx);
      else if (idx > index) newCollapsed.add(idx - 1);
    }
    setCollapsedBlocks(newCollapsed);
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

  function toggleCollapse(index: number) {
    const next = new Set(collapsedBlocks);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setCollapsedBlocks(next);
  }

  function getDefTitle(typeKey: string): string {
    const def = definitions.find((d) => d.key === typeKey);
    return def?.title ?? typeKey;
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

  function handleDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const next = [...blocks];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);

    // Update collapsed set with new indices
    const newCollapsed = new Set<number>();
    for (const idx of collapsedBlocks) {
      if (idx === dragIndex) {
        newCollapsed.add(targetIndex);
      } else {
        let newIdx = idx;
        if (dragIndex < targetIndex) {
          // Moved down: items between shift up
          if (idx > dragIndex && idx <= targetIndex) newIdx = idx - 1;
        } else {
          // Moved up: items between shift down
          if (idx >= targetIndex && idx < dragIndex) newIdx = idx + 1;
        }
        newCollapsed.add(newIdx);
      }
    }
    setCollapsedBlocks(newCollapsed);
    setDragIndex(null);
    setDragOverIndex(null);
    onChange(next);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  // ── Get a short summary for collapsed blocks ──

  function getBlockSummary(block: BlockInstance): string {
    const attrs = block.attrs;
    switch (block.typeKey) {
      case 'paragraph':
        return truncate(String(attrs.text ?? ''), 60) || '(empty)';
      case 'heading':
        return `H${attrs.level ?? 2}: ${truncate(String(attrs.text ?? ''), 50) || '(empty)'}`;
      case 'image':
        return attrs.alt ? truncate(String(attrs.alt), 50) : (attrs.assetId ? String(attrs.assetId) : '(no image)');
      case 'callout':
        return `${String(attrs.tone ?? 'info').toUpperCase()}: ${truncate(String(attrs.title ?? ''), 40) || '(empty)'}`;
      case 'embed':
        return truncate(String(attrs.url ?? ''), 60) || '(no URL)';
      case 'list': {
        const items = Array.isArray(attrs.items) ? attrs.items as string[] : [];
        return `${items.length} item${items.length !== 1 ? 's' : ''}`;
      }
      case 'code':
        return attrs.language ? `${attrs.language}` : '(code)';
      default:
        return block.typeKey;
    }
  }

  function truncate(s: string, max: number): string {
    return s.length > max ? s.slice(0, max) + '...' : s;
  }

  // ── Categorized definitions for dropdown ──

  function getCategorizedDefinitions(): Record<string, BlockDefinition[]> {
    const cats: Record<string, BlockDefinition[]> = {};
    for (const def of definitions) {
      const cat = blockCategoryMap[def.key] ?? 'Other';
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(def);
    }
    return cats;
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
    return blockColorMap[block.typeKey] ?? 'var(--border)';
  }

  if (loadingDefs) {
    return <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', padding: '0.5rem 0' }}>Loading block definitions...</p>;
  }

  const categorized = getCategorizedDefinitions();

  return (
    <div>
      {blocks.length === 0 && (
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', padding: '1rem 0' }}>
          No blocks yet. Add your first block below.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {blocks.map((block, index) => {
          const isCollapsed = collapsedBlocks.has(index);
          const isDragging = dragIndex === index;
          const isDragOver = dragOverIndex === index;
          const color = blockColorMap[block.typeKey] ?? '#6366f1';

          return (
            <div
              key={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                background: isDragOver ? 'color-mix(in srgb, var(--accent) 6%, var(--bg))' : 'var(--bg)',
                border: isDragOver ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderLeft: `3px solid ${blockAccentColor(block)}`,
                borderRadius: '8px',
                padding: isCollapsed ? '0' : '1rem',
                opacity: isDragging ? 0.5 : 1,
                transition: 'border-color 0.15s, background 0.15s, opacity 0.15s',
              }}
            >
              {/* Block header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: isCollapsed ? '0.6rem 1rem' : '0',
                marginBottom: isCollapsed ? '0' : '0.75rem',
                cursor: 'grab',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                  {/* Drag handle */}
                  <span style={{
                    color: 'var(--text-dim)',
                    fontSize: '0.75rem',
                    cursor: 'grab',
                    userSelect: 'none',
                    flexShrink: 0,
                  }}>
                    &#x2630;
                  </span>

                  {/* Block type icon badge */}
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    background: `color-mix(in srgb, ${color} 18%, transparent)`,
                    color: color,
                    flexShrink: 0,
                    lineHeight: 1,
                  }}>
                    {blockIconMap[block.typeKey] ?? '?'}
                  </span>

                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    flexShrink: 0,
                  }}>
                    {getDefTitle(block.typeKey)}
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-dim)',
                    background: 'var(--bg-elevated)',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '3px',
                    flexShrink: 0,
                  }}>
                    #{index + 1}
                  </span>

                  {/* Collapsed summary */}
                  {isCollapsed && (
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-dim)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      fontStyle: 'italic',
                    }}>
                      {getBlockSummary(block)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                  {/* Collapse/expand toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapse(index);
                    }}
                    style={{
                      ...smallBtnStyle,
                      fontSize: '0.65rem',
                      padding: '0.2rem 0.4rem',
                      color: 'var(--text-muted)',
                    }}
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                  >
                    {isCollapsed ? '\u25BC' : '\u25B2'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveBlock(index, -1);
                    }}
                    disabled={index === 0}
                    style={{ ...smallBtnStyle, opacity: index === 0 ? 0.3 : 1 }}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveBlock(index, 1);
                    }}
                    disabled={index === blocks.length - 1}
                    style={{ ...smallBtnStyle, opacity: index === blocks.length - 1 ? 0.3 : 1 }}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBlock(index);
                    }}
                    style={{ ...smallBtnStyle, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }}
                    title="Delete block"
                  >
                    x
                  </button>
                </div>
              </div>

              {/* Block-specific editor (hidden when collapsed) */}
              {!isCollapsed && renderBlockEditor(block, index)}
            </div>
          );
        })}
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
              padding: '0.5rem',
              zIndex: 100,
              maxHeight: '360px',
              overflowY: 'auto',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
            }}>
              {Object.entries(categorized).map(([category, defs]) => (
                <div key={category} style={{ marginBottom: '0.25rem' }}>
                  <div style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-dim)',
                    padding: '0.4rem 0.75rem 0.2rem',
                    userSelect: 'none',
                  }}>
                    {category}
                  </div>
                  {defs.map((def) => {
                    const defColor = blockColorMap[def.key] ?? '#6366f1';
                    const defIcon = blockIconMap[def.key] ?? '?';
                    return (
                      <button
                        key={def.key}
                        onClick={() => addBlock(def.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.45rem 0.75rem',
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
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          background: `color-mix(in srgb, ${defColor} 18%, transparent)`,
                          color: defColor,
                          flexShrink: 0,
                        }}>
                          {defIcon}
                        </span>
                        <div>
                          <span style={{ fontWeight: 500 }}>{def.title}</span>
                          {def.description && (
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', marginLeft: '0.5rem' }}>
                              {def.description}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
