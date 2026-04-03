const API_BASE = '/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('htmless_token');
}

export function getSpaceId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('htmless_space_id') || '';
}

export function setSpaceId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('htmless_space_id', id);
  }
}

function headers(extra?: Record<string, string>): Record<string, string> {
  const spaceId = getSpaceId();
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(spaceId ? { 'X-Space-Id': spaceId } : {}),
    ...extra,
  };
  const token = getToken();
  if (token) {
    h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(typeof body === 'object' && body && 'message' in body ? (body as { message: string }).message : `API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: headers(extraHeaders),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('htmless_token');
      localStorage.removeItem('htmless_user');
      window.location.href = '/login';
    }
    throw new ApiError(401, { message: 'Unauthorized' });
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  // Return ETag alongside data if present
  const etag = res.headers.get('etag');
  if (etag && typeof data === 'object' && data !== null) {
    (data as Record<string, unknown>)._etag = etag;
  }

  return data as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}

export function apiPost<T>(path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  return request<T>('POST', path, body, extraHeaders);
}

export function apiPatch<T>(path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  return request<T>('PATCH', path, body, extraHeaders);
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>('DELETE', path);
}
