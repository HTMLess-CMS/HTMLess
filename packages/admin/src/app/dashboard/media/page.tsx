'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

interface Asset {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadAssets();
  }, []);

  async function loadAssets() {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<{ data: Asset[] }>('/cma/v1/assets');
      setAssets(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setUploading(true);
      setError('');

      try {
        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('htmless_token');
        const res = await fetch('/api/cma/v1/assets', {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Space-Id': 'cmnibacxs0005crr6jxgrt3e8',
          },
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { message?: string }).message || `Upload failed (${res.status})`);
        }

        await loadAssets();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  function isImage(mime: string): boolean {
    return mime.startsWith('image/');
  }

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

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Media</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage your media assets
          </p>
        </div>
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{ ...btnPrimary, opacity: uploading ? 0.6 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}
        >
          {uploading ? 'Uploading...' : 'Upload'}
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

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading assets...</p>
      ) : assets.length === 0 ? (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '4rem 2rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.3 }}>
            &#128444;
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>No media assets yet</p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Upload images, documents, and other files to use in your content.
          </p>
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{ ...btnPrimary, opacity: uploading ? 0.6 : 1 }}
          >
            {uploading ? 'Uploading...' : 'Upload First Asset'}
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
        }}>
          {assets.map((asset) => (
            <div
              key={asset.id}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {/* Preview area */}
              <div style={{
                height: '140px',
                background: 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {isImage(asset.mimeType) ? (
                  <img
                    src={asset.url}
                    alt={asset.fileName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '2rem', opacity: 0.3 }}>&#128196;</span>
                )}
              </div>
              {/* Info */}
              <div style={{ padding: '0.75rem' }}>
                <p style={{
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginBottom: '0.35rem',
                }}>
                  {asset.fileName}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {formatSize(asset.size)}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {formatDate(asset.createdAt)}
                  </span>
                </div>
                {asset.width && asset.height && (
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    {asset.width} x {asset.height}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
