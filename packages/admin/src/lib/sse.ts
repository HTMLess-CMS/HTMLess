const API_BASE = '/api';
const SPACE_ID = 'cmnibacxs0005crr6jxgrt3e8';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('htmless_token');
}

/**
 * Subscribe to real-time CMA events via Server-Sent Events.
 *
 * @param events  - Array of event types, e.g. `['entry.published', 'asset.created']`
 * @param onEvent - Callback invoked for each event with its type and parsed payload
 * @returns A cleanup function that closes the EventSource connection
 *
 * @example
 * ```ts
 * const unsub = subscribeToEvents(
 *   ['entry.published', 'entry.draftSaved'],
 *   (type, data) => console.log('Got', type, data),
 * );
 * // later…
 * unsub();
 * ```
 */
export function subscribeToEvents(
  events: string[],
  onEvent: (type: string, data: unknown) => void,
): () => void {
  const token = getToken();
  if (!token) {
    console.warn('[sse] No auth token — cannot open SSE stream');
    return () => {};
  }

  const params = new URLSearchParams({
    events: events.join(','),
    token,
    spaceId: SPACE_ID,
  });

  const url = `${API_BASE}/cma/v1/live?${params.toString()}`;
  const es = new EventSource(url);

  for (const event of events) {
    es.addEventListener(event, (msg: MessageEvent) => {
      try {
        const data: unknown = JSON.parse(msg.data as string);
        onEvent(event, data);
      } catch {
        console.error('[sse] Failed to parse event data', msg.data);
      }
    });
  }

  es.onerror = () => {
    // EventSource reconnects automatically; just log for debugging
    console.warn('[sse] Connection error — will retry automatically');
  };

  return () => {
    es.close();
  };
}
