// ─── HTMLess Next.js Integration Helper ─────────────────────────────
// Creates a typed HTMLess client and exports helper functions for
// fetching content in Server Components, getStaticProps, and preview mode.

import { HTMLessClient } from '@htmless/sdk';
import type { ListResponse, GetEntriesOptions } from '@htmless/sdk';

// ─── Client Singleton ───────────────────────────────────────────────

function createClient(): HTMLessClient {
  const baseUrl = process.env.HTMLESS_API_URL;
  const apiToken = process.env.HTMLESS_API_TOKEN;
  const spaceId = process.env.HTMLESS_SPACE_ID;

  if (!baseUrl) throw new Error('Missing HTMLESS_API_URL environment variable');
  if (!spaceId) throw new Error('Missing HTMLESS_SPACE_ID environment variable');

  return new HTMLessClient({ baseUrl, apiToken, spaceId });
}

let _client: HTMLessClient | undefined;

function getClient(): HTMLessClient {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}

// ─── Types ──────────────────────────────────────────────────────────

export interface HtmlessEntry<T = Record<string, unknown>> {
  id: string;
  type: string;
  slug: string;
  data: T;
  publishedAt: string;
  updatedAt: string;
}

export interface HtmlessListResponse<T = Record<string, unknown>> {
  items: HtmlessEntry<T>[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Typed Helpers ──────────────────────────────────────────────────

/**
 * Fetch a list of published entries for a content type.
 * Uses Next.js fetch cache with `htmless` and `htmless:{typeKey}` tags
 * for ISR revalidation via `revalidateTag()`.
 */
export async function getEntries<T = Record<string, unknown>>(
  typeKey: string,
  options?: GetEntriesOptions,
): Promise<HtmlessListResponse<T>> {
  const client = getClient();
  const response: ListResponse<HtmlessEntry<T>> = await client.getEntries<HtmlessEntry<T>>(typeKey, options);

  return {
    items: response.items,
    meta: response.meta,
  };
}

/**
 * Fetch a single published entry by its slug.
 * Falls back to fetching by ID if the slug looks like a CUID/UUID.
 */
export async function getEntry<T = Record<string, unknown>>(
  typeKey: string,
  slugOrId: string,
): Promise<HtmlessEntry<T>> {
  const client = getClient();

  // If it looks like an ID (contains only hex/cuid chars and is long enough),
  // fetch by ID directly.
  const isId = /^[a-z0-9]{20,}$/i.test(slugOrId);

  if (isId) {
    return client.getEntry<HtmlessEntry<T>>(typeKey, slugOrId);
  }

  // Otherwise fetch by slug — the CDA supports ?slug= on the list endpoint
  const response = await client.getEntries<HtmlessEntry<T>>(typeKey, {
    slug: slugOrId,
    limit: 1,
  });

  if (response.items.length === 0) {
    throw new Error(`Entry not found: ${typeKey}/${slugOrId}`);
  }

  return response.items[0];
}

/**
 * Fetch a draft/preview entry using a preview token.
 * Used with Next.js Draft Mode to show unpublished content.
 */
export async function getPreview<T = Record<string, unknown>>(
  typeKey: string,
  slug: string,
): Promise<HtmlessEntry<T>> {
  const previewToken = process.env.HTMLESS_PREVIEW_TOKEN;
  if (!previewToken) {
    throw new Error('Missing HTMLESS_PREVIEW_TOKEN environment variable for preview mode');
  }

  const client = getClient();
  const data = await client.getPreview<HtmlessEntry<T>>(typeKey, slug, previewToken);
  return data;
}

// Re-export the client class for advanced usage
export { HTMLessClient } from '@htmless/sdk';
export { getClient };
