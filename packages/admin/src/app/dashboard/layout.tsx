'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { WhiteLabelConfig } from '../../lib/white-label';
import { getWhiteLabelConfig } from '../../lib/white-label';
import { getSpaceId, setSpaceId } from '../../lib/api';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Setup Guide', href: '/dashboard/guide' },
  { label: 'Create from Layout', href: '/dashboard/create-from-layout' },
  { label: 'Content', href: '/dashboard/content' },
  { label: 'Schema', href: '/dashboard/schema' },
  { label: 'Blocks', href: '/dashboard/blocks' },
  { label: 'Patterns', href: '/dashboard/patterns' },
  { label: 'Media', href: '/dashboard/media' },
  { label: 'Webhooks', href: '/dashboard/webhooks' },
  { label: 'Extensions', href: '/dashboard/extensions' },
  { label: 'API Tokens', href: '/dashboard/tokens' },
  { label: 'Settings', href: '/dashboard/settings' },
];

interface SpaceInfo { id: string; name: string; slug: string; }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [whiteLabel, setWhiteLabel] = useState<WhiteLabelConfig | null>(null);
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [currentSpaceId, setCurrentSpaceId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('htmless_token');
    if (!token) {
      router.replace('/login');
    } else {
      setAuthed(true);
      // Always fetch spaces and set the active one
      fetch('/api/cma/v1/spaces', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => {
          const spaceList: SpaceInfo[] = (d.items || d.data || []).map((s: Record<string, string>) => ({ id: s.id, name: s.name, slug: s.slug }));
          setSpaces(spaceList);
          const saved = getSpaceId();
          const match = spaceList.find(s => s.id === saved);
          if (match && match.slug !== 'default') {
            // Use saved space if it's not the system default
            setCurrentSpaceId(match.id);
          } else if (spaceList.length > 0) {
            // Prefer a non-default space, otherwise fall back to last
            const nonDefault = spaceList.find(s => s.slug !== 'default');
            const pick = nonDefault || spaceList[spaceList.length - 1];
            setSpaceId(pick.id);
            setCurrentSpaceId(pick.id);
          }
        })
        .catch(() => {});
      // Load white-label config once authenticated
      getWhiteLabelConfig().then((config) => {
        if (config) setWhiteLabel(config);
      });
    }
  }, [router]);

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading...</p>
      </div>
    );
  }

  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  function handleLogout() {
    localStorage.removeItem('htmless_token');
    localStorage.removeItem('htmless_user');
    router.replace('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: '240px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        padding: '1.5rem 0',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '0 1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            {whiteLabel?.brandName ? (
              <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.03em', color: whiteLabel.primaryColor ?? 'var(--text)' }}>
                {whiteLabel.logoUrl ? (
                  <img src={whiteLabel.logoUrl} alt={whiteLabel.brandName} style={{ height: '28px', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                ) : null}
                {whiteLabel.brandName}
              </h1>
            ) : (
              <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>
                HTML<span style={{ color: 'var(--accent)' }}>ess</span>
              </h1>
            )}
          </Link>
          <Link
            href="/dashboard/guide"
            title="Setup Guide"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            ?
          </Link>
        </div>
        {spaces.length > 1 && (
          <div style={{ padding: '0 1.25rem', marginBottom: '1rem' }}>
            <select
              value={currentSpaceId}
              onChange={(e) => {
                const newId = e.target.value;
                setSpaceId(newId);
                setCurrentSpaceId(newId);
                window.location.reload();
              }}
              style={{
                width: '100%',
                padding: '0.4rem 0.6rem',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {spaces.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        <nav style={{ flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'block',
                padding: '0.6rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--text)' : 'var(--text-muted)',
                background: active ? (whiteLabel?.primaryColor ? `${whiteLabel.primaryColor}1a` : 'rgba(99,102,241,0.1)') : 'transparent',
                borderLeft: active ? `2px solid ${whiteLabel?.primaryColor ?? 'var(--accent)'}` : '2px solid transparent',
                textDecoration: 'none',
              }}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: '0 1.25rem' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
