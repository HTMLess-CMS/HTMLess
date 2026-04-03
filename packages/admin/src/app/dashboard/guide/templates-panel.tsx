'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, ApiError } from '@/lib/api';

interface Template {
  key: string;
  name: string;
  description: string;
  contentTypeCount?: number;
}

const FALLBACK_TEMPLATES: Template[] = [
  { key: 'blog', name: 'Blog', description: 'Posts, authors, categories, and tags for a content-driven blog.', contentTypeCount: 4 },
  { key: 'saas', name: 'SaaS', description: 'Landing pages, pricing plans, feature lists, and testimonials.', contentTypeCount: 5 },
  { key: 'agency', name: 'Agency', description: 'Projects, team members, services, and case studies.', contentTypeCount: 4 },
  { key: 'ecommerce', name: 'E-commerce', description: 'Products, collections, reviews, and store pages.', contentTypeCount: 5 },
  { key: 'docs', name: 'Docs', description: 'Documentation sections, articles, code examples, and changelogs.', contentTypeCount: 4 },
];

const TEMPLATE_ICONS: Record<string, string> = {
  blog: '\u270D\uFE0F',
  saas: '\u26A1',
  agency: '\uD83C\uDFE2',
  ecommerce: '\uD83D\uDED2',
  docs: '\uD83D\uDCDA',
};

interface TemplatesPanelProps {
  onApplied: () => void;
}

export default function TemplatesPanel({ onApplied }: TemplatesPanelProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await apiGet<{ data: Template[] }>('/cma/v1/templates');
        if (res.data && res.data.length > 0) {
          setTemplates(res.data);
        } else {
          setTemplates(FALLBACK_TEMPLATES);
        }
      } catch {
        setTemplates(FALLBACK_TEMPLATES);
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  async function handleApply(key: string) {
    setApplyingKey(key);
    setError(null);
    try {
      await apiPost(`/cma/v1/templates/${key}/apply`);
      setAppliedKey(key);
      setApplyingKey(null);
      onApplied();
    } catch (err) {
      setApplyingKey(null);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to apply template. Please try again.');
      }
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        Loading templates...
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          fontSize: '0.85rem',
          color: 'var(--red)',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
        {templates.map((tpl) => {
          const isApplying = applyingKey === tpl.key;
          const isApplied = appliedKey === tpl.key;
          const icon = TEMPLATE_ICONS[tpl.key] ?? '\u2B50';

          return (
            <div
              key={tpl.key}
              style={{
                background: isApplied ? 'rgba(34,197,94,0.08)' : 'var(--bg)',
                border: isApplied ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border)',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>{tpl.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45, flex: 1 }}>{tpl.description}</div>
              {tpl.contentTypeCount != null && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {tpl.contentTypeCount} content types
                </div>
              )}
              <button
                onClick={() => handleApply(tpl.key)}
                disabled={isApplying || isApplied}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.45rem 0.75rem',
                  background: isApplied ? 'var(--green)' : 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: isApplying || isApplied ? 'default' : 'pointer',
                  opacity: isApplying ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {isApplied ? '\u2713 Applied' : isApplying ? 'Applying...' : 'Apply'}
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
