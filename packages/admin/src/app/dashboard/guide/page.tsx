'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiGet, getSpaceId } from '@/lib/api';
import TemplatesPanel from './templates-panel';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ContentType {
  key: string;
  name: string;
  fields?: { key: string }[];
}

interface Entry {
  id: string;
  typeKey: string;
}

interface StepState {
  hasTypes: boolean;
  typeCount: number;
  types: ContentType[];
  entryCount: number;
  entriesByType: Record<string, number>;
  hasTokens: boolean;
  tokenCount: number;
  hasPublished: boolean;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getActiveSpaceId(): string {
  return getSpaceId() || 'unknown';
}

function Badge({ n, status }: { n: number; status: 'done' | 'current' | 'future' }) {
  const bg =
    status === 'done'
      ? 'var(--green)'
      : status === 'current'
        ? 'var(--accent)'
        : 'var(--bg-elevated)';
  const color = status === 'future' ? 'var(--text-dim)' : '#fff';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: bg,
        color,
        fontWeight: 700,
        fontSize: '0.85rem',
        flexShrink: 0,
      }}
    >
      {status === 'done' ? '\u2713' : n}
    </span>
  );
}

function StepCard({
  number,
  title,
  subtitle,
  status,
  expanded,
  onToggle,
  children,
}: {
  number: number;
  title: string;
  subtitle: string;
  status: 'done' | 'current' | 'future';
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: status === 'current' ? '1px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: '14px',
        overflow: 'hidden',
        opacity: status === 'future' ? 0.55 : 1,
        transition: 'opacity 0.3s, border-color 0.3s',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--text)',
        }}
      >
        <Badge n={number} status={status} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{title}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            {subtitle}
          </div>
        </div>
        <span
          style={{
            fontSize: '1.1rem',
            color: 'var(--text-dim)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          {'\u25B6'}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: '1.25rem' }}>{children}</div>
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        padding: '0.25rem 0.5rem',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        color: copied ? 'var(--green)' : 'var(--text-muted)',
        fontSize: '0.7rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'color 0.2s',
      }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && (
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <pre
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            fontSize: '0.8rem',
            lineHeight: 1.6,
            overflowX: 'auto',
            color: 'var(--text-muted)',
            margin: 0,
          }}
        >
          <code>{code}</code>
        </pre>
        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
          <CopyButton text={code} />
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  href,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <div
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '1.25rem',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.background = 'var(--bg-elevated)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.background = 'var(--bg)';
      }}
      onClick={onClick}
    >
      <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.3rem', color: 'var(--text)' }}>{title}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>{description}</div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
        {inner}
      </Link>
    );
  }
  return inner;
}

/* ------------------------------------------------------------------ */
/* Progress bar                                                        */
/* ------------------------------------------------------------------ */

function ProgressBar({ steps }: { steps: ('done' | 'current' | 'future')[] }) {
  const done = steps.filter((s) => s === 'done').length;
  const pct = Math.round((done / steps.length) * 100);
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Setup Progress</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: pct === 100 ? 'var(--green)' : 'var(--accent)' }}>{pct}%</span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: '3px',
            background: pct === 100 ? 'var(--green)' : 'var(--accent)',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

export default function GuidePage() {
  const [state, setState] = useState<StepState | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const loadState = useCallback(async () => {
    try {
      const [typesRes, entriesRes, tokensRes] = await Promise.allSettled([
        apiGet<{ data: ContentType[] }>('/cma/v1/schemas/types'),
        apiGet<{ data: Entry[] }>('/cma/v1/entries'),
        apiGet<{ data: { id: string }[] }>('/cma/v1/tokens'),
      ]);

      const typesVal = typesRes.status === 'fulfilled' ? typesRes.value : {} as Record<string, unknown>;
      const entriesVal = entriesRes.status === 'fulfilled' ? entriesRes.value : {} as Record<string, unknown>;
      const tokensVal = tokensRes.status === 'fulfilled' ? tokensRes.value : {} as Record<string, unknown>;
      const types = ((typesVal as Record<string, unknown>).items ?? (typesVal as Record<string, unknown>).data ?? []) as ContentType[];
      const entries = ((entriesVal as Record<string, unknown>).items ?? (entriesVal as Record<string, unknown>).data ?? []) as Entry[];
      const tokens = ((tokensVal as Record<string, unknown>).items ?? (tokensVal as Record<string, unknown>).data ?? []) as { id: string }[];

      const entriesByType: Record<string, number> = {};
      for (const e of entries) {
        entriesByType[e.typeKey] = (entriesByType[e.typeKey] ?? 0) + 1;
      }

      // Consider entries "published" if any exist (no draft/publish distinction API visible)
      const hasPublished = entries.length > 0;

      const s: StepState = {
        hasTypes: types.length > 0,
        typeCount: types.length,
        types,
        entryCount: entries.length,
        entriesByType,
        hasTokens: tokens.length > 0,
        tokenCount: tokens.length,
        hasPublished,
      };

      setState(s);

      // Auto-expand the first incomplete step
      if (!types.length) setExpandedStep(1);
      else if (!entries.length) setExpandedStep(2);
      else if (!tokens.length) setExpandedStep(3);
      else setExpandedStep(4);
    } catch {
      setState({
        hasTypes: false,
        typeCount: 0,
        types: [],
        entryCount: 0,
        entriesByType: {},
        hasTokens: false,
        tokenCount: 0,
        hasPublished: false,
      });
      setExpandedStep(1);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  if (!state) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading guide...</p>
      </div>
    );
  }

  function stepStatus(n: number): 'done' | 'current' | 'future' {
    if (!state) return 'future';
    switch (n) {
      case 1:
        return state.hasTypes ? 'done' : 'current';
      case 2:
        if (!state.hasTypes) return 'future';
        return state.entryCount > 0 ? 'done' : 'current';
      case 3:
        if (state.entryCount === 0) return 'future';
        return state.hasTokens ? 'done' : 'current';
      case 4:
        if (!state.hasTokens) return 'future';
        return state.hasPublished ? 'done' : 'current';
      default:
        return 'future';
    }
  }

  const statuses = [1, 2, 3, 4].map(stepStatus);

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '1.6rem' }}>{'\u2728'}</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Setup Guide</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '600px', lineHeight: 1.5 }}>
          Get your site up and running in four simple steps. We will track your progress automatically.
        </p>
      </div>

      {/* Progress */}
      <ProgressBar steps={statuses} />

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* ---- Step 1: Choose Your Method ---- */}
        <StepCard
          number={1}
          title="Choose Your Method"
          subtitle={state.hasTypes ? `${state.typeCount} content type${state.typeCount !== 1 ? 's' : ''} created` : 'Set up your site structure'}
          status={statuses[0]}
          expanded={expandedStep === 1}
          onToggle={() => setExpandedStep(expandedStep === 1 ? null : 1)}
        >
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Pick how you want to get started. You can always adjust your schema later.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <ActionCard
              icon={'\uD83D\uDCC4'}
              title="Upload a Layout"
              description="Have a design? Upload it and we'll create your site structure automatically."
              href="/dashboard/create-from-layout"
            />
            <ActionCard
              icon={'\uD83C\uDFA8'}
              title="Start from Template"
              description="Pick from our pre-built templates and customize from there."
              onClick={() => setShowTemplates(!showTemplates)}
            />
            <ActionCard
              icon={'\uD83D\uDD27'}
              title="Build from Scratch"
              description="Create your own content types and fields manually."
              href="/dashboard/schema"
            />
          </div>

          {showTemplates && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>
                Choose a template to apply:
              </div>
              <TemplatesPanel onApplied={loadState} />
            </div>
          )}
        </StepCard>

        {/* ---- Step 2: Add Your Content ---- */}
        <StepCard
          number={2}
          title="Add Your Content"
          subtitle={state.entryCount > 0 ? `${state.entryCount} entr${state.entryCount !== 1 ? 'ies' : 'y'} created` : 'Create entries for your content types'}
          status={statuses[1]}
          expanded={expandedStep === 2}
          onToggle={() => setExpandedStep(expandedStep === 2 ? null : 2)}
        >
          {state.hasTypes ? (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
                Your site structure is ready! Now add your content.
              </p>

              {state.types.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {state.types.map((ct) => (
                    <div
                      key={ct.key}
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '1rem',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.3rem' }}>
                        {ct.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
                        {ct.fields?.length ?? 0} fields {'\u00B7'} {state.entriesByType[ct.key] ?? 0} entries
                      </div>
                      <Link
                        href="/dashboard/content"
                        style={{
                          display: 'inline-block',
                          padding: '0.35rem 0.7rem',
                          background: 'var(--accent)',
                          color: '#fff',
                          borderRadius: '5px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        Add Entry
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              <Link
                href="/dashboard/media"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                {'\uD83D\uDDBC\uFE0F'} Upload Media
              </Link>
            </>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
              Complete Step 1 first to set up your content types.
            </p>
          )}
        </StepCard>

        {/* ---- Step 3: Connect Your Frontend ---- */}
        <StepCard
          number={3}
          title="Connect Your Frontend"
          subtitle={state.hasTokens ? `${state.tokenCount} API token${state.tokenCount !== 1 ? 's' : ''} created` : 'Integrate with your app or website'}
          status={statuses[2]}
          expanded={expandedStep === 3}
          onToggle={() => setExpandedStep(expandedStep === 3 ? null : 3)}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Space ID:</span>
              <code
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '5px',
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.8rem',
                  color: 'var(--text)',
                  fontFamily: 'monospace',
                }}
              >
                {getActiveSpaceId()}
              </code>
              <CopyButton text={getActiveSpaceId()} />
            </div>
            <Link
              href="/dashboard/tokens"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {'\uD83D\uDD11'} Create API Token
            </Link>
          </div>

          {/* Tabs for code examples */}
          <ConnectTabs />
        </StepCard>

        {/* ---- Step 4: Go Live ---- */}
        <StepCard
          number={4}
          title="Go Live"
          subtitle={state.hasPublished ? 'Content is published!' : 'Publish your entries and set up webhooks'}
          status={statuses[3]}
          expanded={expandedStep === 4}
          onToggle={() => setExpandedStep(expandedStep === 4 ? null : 4)}
        >
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Publish your entries to make them visible through the delivery API. Set up webhooks to trigger builds automatically when content changes.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Link
              href="/dashboard/content"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {'\uD83D\uDCDD'} Manage Content
            </Link>
            <Link
              href="/dashboard/webhooks"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {'\uD83D\uDD17'} Setup Webhooks
            </Link>
          </div>

          <div
            style={{
              marginTop: '1.25rem',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1rem',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: 'var(--text)' }}>Preview vs. Published:</strong> Draft entries are only visible through the Content Management API (CMA) with an auth token. Published entries are served through the Content Delivery API (CDA) and are publicly accessible with a delivery token.
          </div>
        </StepCard>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Connect tabs sub-component                                          */
/* ------------------------------------------------------------------ */

function ConnectTabs() {
  const [tab, setTab] = useState<'docker' | 'nextjs' | 'api'>('docker');

  const tabs: { key: typeof tab; label: string; icon: string }[] = [
    { key: 'docker', label: 'Docker', icon: '\uD83D\uDC33' },
    { key: 'nextjs', label: 'Next.js', icon: '\u25B2' },
    { key: 'api', label: 'API', icon: '\u007B\u007D' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.4rem 0.85rem',
              background: tab === t.key ? 'var(--accent)' : 'var(--bg)',
              color: tab === t.key ? '#fff' : 'var(--text-muted)',
              border: tab === t.key ? 'none' : '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'docker' && (
        <CodeBlock
          label="Scaffold a new site"
          code={`npx create-htmless my-site`}
        />
      )}

      {tab === 'nextjs' && (
        <>
          <CodeBlock
            label="Install the SDK"
            code={`npm install @htmless/sdk`}
          />
          <CodeBlock
            label="Fetch content in your page"
            code={`import { createClient } from '@htmless/sdk';

const client = createClient({
  spaceId: '${getActiveSpaceId()}',
  token: 'YOUR_DELIVERY_TOKEN',
});

// Fetch all entries of a content type
const posts = await client.getEntries('post');

// Fetch a single entry by slug
const post = await client.getEntry('post', { slug: 'hello-world' });`}
          />
        </>
      )}

      {tab === 'api' && (
        <CodeBlock
          label="Fetch entries via curl"
          code={`curl -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "X-Space-Id: ${getActiveSpaceId()}" \\
  https://your-domain.com/api/cda/v1/content/post`}
        />
      )}
    </div>
  );
}
