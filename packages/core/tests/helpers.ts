/**
 * HTTP helper utilities for HTMLess API integration tests.
 *
 * Provides a thin wrapper around fetch that handles base URL resolution,
 * auth headers, JSON body serialisation, and response parsing.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const API_URL = (process.env.API_URL || 'http://localhost:3100').replace(/\/$/, '');

// Default seed credentials
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@htmless.com';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  status: number;
  headers: Headers;
  body: T;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
  spaceId?: string;
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, token, spaceId } = opts;

  const url = `${API_URL}${path}`;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (spaceId) {
    reqHeaders['X-Space-Id'] = spaceId;
  }

  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let resBody: T;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    resBody = (await res.json()) as T;
  } else {
    // 204 No Content or non-JSON
    resBody = (await res.text()) as unknown as T;
  }

  return { status: res.status, headers: res.headers, body: resBody };
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

let _cachedToken: string | null = null;
let _cachedSpaceId: string | null = null;

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface SpacesListResponse {
  items: Array<{
    id: string;
    slug: string;
    name: string;
  }>;
  total: number;
}

/**
 * Login with default admin credentials. Caches the JWT for the lifetime of
 * the test run so we don't hit /login on every single test.
 */
export async function getAdminToken(): Promise<string> {
  if (_cachedToken) return _cachedToken;

  const res = await api<LoginResponse>('/cma/v1/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  if (res.status !== 200) {
    throw new Error(`Login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  _cachedToken = res.body.token;
  return _cachedToken;
}

/**
 * Resolve the default space ID from the authenticated spaces list.
 *
 * The seed creates a space with slug `default`, and `/cma/v1/spaces`
 * is intentionally mounted before space-scoped permission checks, so
 * tests can discover the usable space id without manual setup.
 */
export async function getSpaceId(): Promise<string> {
  if (_cachedSpaceId) return _cachedSpaceId;

  if (process.env.SPACE_ID) {
    _cachedSpaceId = process.env.SPACE_ID;
    return _cachedSpaceId;
  }

  const token = await getAdminToken();
  const res = await api<SpacesListResponse>('/cma/v1/spaces', { token });

  if (res.status !== 200) {
    throw new Error(`Failed to resolve space id (${res.status}): ${JSON.stringify(res.body)}`);
  }

  const defaultSpace = res.body.items.find((space) => space.slug === 'default');
  const selectedSpace = defaultSpace ?? res.body.items[0];

  if (!selectedSpace) {
    throw new Error('No accessible spaces were returned by /cma/v1/spaces. Run the seed first.');
  }

  _cachedSpaceId = selectedSpace.id;
  return _cachedSpaceId;
}

/**
 * Reset the cached token (useful when testing login failures that might
 * pollute the cache).
 */
export function resetTokenCache(): void {
  _cachedToken = null;
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

/** Authenticated GET */
export async function authGet<T = unknown>(path: string, spaceId?: string, extraHeaders?: Record<string, string>): Promise<ApiResponse<T>> {
  const token = await getAdminToken();
  return api<T>(path, { method: 'GET', token, spaceId: spaceId ?? await getSpaceId(), headers: extraHeaders });
}

/** Authenticated POST */
export async function authPost<T = unknown>(path: string, body: unknown, spaceId?: string, extraHeaders?: Record<string, string>): Promise<ApiResponse<T>> {
  const token = await getAdminToken();
  return api<T>(path, { method: 'POST', token, spaceId: spaceId ?? await getSpaceId(), body, headers: extraHeaders });
}

/** Authenticated PATCH */
export async function authPatch<T = unknown>(path: string, body: unknown, spaceId?: string, extraHeaders?: Record<string, string>): Promise<ApiResponse<T>> {
  const token = await getAdminToken();
  return api<T>(path, { method: 'PATCH', token, spaceId: spaceId ?? await getSpaceId(), body, headers: extraHeaders });
}

/** Authenticated DELETE */
export async function authDelete<T = unknown>(path: string, spaceId?: string): Promise<ApiResponse<T>> {
  const token = await getAdminToken();
  return api<T>(path, { method: 'DELETE', token, spaceId: spaceId ?? await getSpaceId() });
}

// ---------------------------------------------------------------------------
// Unique slug generator
// ---------------------------------------------------------------------------

let _counter = 0;

export function uniqueSlug(prefix = 'test'): string {
  _counter++;
  return `${prefix}-${Date.now()}-${_counter}`;
}
