'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';

// ─── Types matching the API response ──────────────────────────────────

interface LayoutSection {
  type: string;
  confidence: number;
}

interface FieldSpec {
  key: string;
  name: string;
  type: string;
}

interface ContentTypeSpec {
  key: string;
  name: string;
  description: string;
  fields: FieldSpec[];
}

interface CreatedEntryResult {
  created: string[];
  skipped: number;
}

interface AnalysisResult {
  sections: LayoutSection[];
  suggestedSchema: {
    contentTypes: ContentTypeSpec[];
    suggestedTemplateName: string;
  };
  pageStructure: string;
  created: {
    contentTypeIds: Record<string, string>;
    fieldIds: Record<string, string[]>;
  };
  createdEntries: Record<string, CreatedEntryResult>;
}

// ─── Constants ────────────────────────────────────────────────────────

const SPACE_ID = 'cmnibacxs0005crr6jxgrt3e8';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

// ─── Component ────────────────────────────────────────────────────────

export default function CreateFromLayoutPage() {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please upload a PNG, JPEG, WebP, or GIF image.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedFile(file);

    try {
      const token = localStorage.getItem('htmless_token');
      const buffer = await file.arrayBuffer();

      const res = await fetch('/api/cma/v1/ai/from-image?autoCreate=true', {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'X-Filename': file.name,
          'X-Space-Id': SPACE_ID,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: buffer,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ?? `Upload failed with status ${res.status}`,
        );
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  // ─── Styles ───────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '1.5rem',
  };

  const dropZoneStyle: React.CSSProperties = {
    border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '16px',
    padding: '4rem 2rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: dragOver ? 'rgba(99,102,241,0.06)' : 'var(--bg-surface)',
  };

  const btnPrimary: React.CSSProperties = {
    display: 'inline-block',
    padding: '0.6rem 1.25rem',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  };

  const btnSecondary: React.CSSProperties = {
    display: 'inline-block',
    padding: '0.6rem 1.25rem',
    background: 'transparent',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
  };

  const badgeStyle = (confidence: number): React.CSSProperties => ({
    display: 'inline-block',
    padding: '0.15rem 0.5rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    background:
      confidence >= 0.9
        ? 'rgba(34,197,94,0.15)'
        : confidence >= 0.7
          ? 'rgba(234,179,8,0.15)'
          : 'rgba(156,163,175,0.15)',
    color:
      confidence >= 0.9
        ? '#16a34a'
        : confidence >= 0.7
          ? '#ca8a04'
          : '#6b7280',
  });

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          Create Site from Layout
        </h2>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            marginTop: '0.25rem',
          }}
        >
          Upload a website layout image and we will generate your entire site
          structure — content types, fields, and sample content.
        </p>
      </div>

      {/* Upload zone */}
      {!result && (
        <div
          style={dropZoneStyle}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />

          {loading ? (
            <div>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  border: '3px solid var(--border)',
                  borderTopColor: 'var(--accent)',
                  borderRadius: '50%',
                  margin: '0 auto 1rem',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <p
                style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                Analyzing layout and creating site structure...
              </p>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.5rem',
                }}
              >
                This may take a few seconds
              </p>
            </div>
          ) : (
            <div>
              <div
                style={{
                  fontSize: '3rem',
                  marginBottom: '1rem',
                  opacity: 0.5,
                }}
              >
                {/* Simple upload icon using CSS */}
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ margin: '0 auto', display: 'block', color: 'var(--text-muted)' }}
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                Drag and drop your website layout image here
              </p>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.5rem',
                }}
              >
                or click to browse — PNG, JPEG, WebP, GIF up to 20MB
              </p>
              {selectedFile && (
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--accent)',
                    marginTop: '0.75rem',
                  }}
                >
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            ...cardStyle,
            marginTop: '1.5rem',
            borderColor: '#ef4444',
            background: 'rgba(239,68,68,0.06)',
          }}
        >
          <p style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.9rem' }}>
            Error
          </p>
          <p
            style={{
              color: '#ef4444',
              fontSize: '0.85rem',
              marginTop: '0.25rem',
            }}
          >
            {error}
          </p>
          <button
            onClick={() => {
              setError(null);
              setSelectedFile(null);
            }}
            style={{ ...btnSecondary, marginTop: '0.75rem', fontSize: '0.8rem' }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Success banner */}
          <div
            style={{
              ...cardStyle,
              borderColor: '#22c55e',
              background: 'rgba(34,197,94,0.06)',
            }}
          >
            <p
              style={{ color: '#16a34a', fontWeight: 700, fontSize: '1.1rem' }}
            >
              Your site structure is ready!
            </p>
            <p
              style={{
                color: '#16a34a',
                fontSize: '0.9rem',
                marginTop: '0.25rem',
              }}
            >
              Edit your content and publish. We created{' '}
              {result.suggestedSchema.contentTypes.length} content types with
              sample data.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                marginTop: '1rem',
              }}
            >
              <Link href="/dashboard/content" style={btnPrimary}>
                View Content
              </Link>
              <Link href="/dashboard/schema" style={btnSecondary}>
                Edit Schema
              </Link>
              <button
                onClick={() => {
                  setResult(null);
                  setSelectedFile(null);
                  setError(null);
                }}
                style={btnSecondary}
              >
                Upload Another
              </button>
            </div>
          </div>

          {/* Detected sections */}
          <div style={cardStyle}>
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                marginBottom: '1rem',
              }}
            >
              Detected Sections
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {result.sections.map((section) => (
                <div
                  key={section.type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.75rem',
                    background: 'var(--bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}
                  >
                    {section.type}
                  </span>
                  <span style={badgeStyle(section.confidence)}>
                    {Math.round(section.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Created content types */}
          <div style={cardStyle}>
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                marginBottom: '1rem',
              }}
            >
              Created Content Types
            </h3>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              {result.suggestedSchema.contentTypes.map((ct) => {
                const entryCount = getEntryCount(result.createdEntries, ct.key);
                return (
                  <div
                    key={ct.key}
                    style={{
                      padding: '1rem',
                      background: 'var(--bg)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {ct.name}
                      </span>
                      {entryCount > 0 && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            background: 'var(--bg-surface)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {entryCount} {entryCount === 1 ? 'entry' : 'entries'}{' '}
                          created
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {ct.description}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.35rem',
                      }}
                    >
                      {ct.fields.map((field) => (
                        <span
                          key={field.key}
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            background: 'rgba(99,102,241,0.1)',
                            color: 'var(--accent)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {field.key}
                          <span
                            style={{
                              opacity: 0.6,
                              marginLeft: '0.25rem',
                            }}
                          >
                            {field.type}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function getEntryCount(
  createdEntries: Record<string, { created: string[]; skipped: number }> | undefined,
  contentTypeKey: string,
): number {
  if (!createdEntries) return 0;

  // Map content type keys to the createdEntries keys
  const mapping: Record<string, string> = {
    homepage: 'homepage',
    service: 'services',
    'gallery-item': 'galleryItems',
    testimonial: 'testimonials',
    'team-member': 'teamMembers',
    faq: 'faqs',
  };

  const entryKey = mapping[contentTypeKey];
  if (!entryKey || !createdEntries[entryKey]) return 0;
  return createdEntries[entryKey].created.length;
}
