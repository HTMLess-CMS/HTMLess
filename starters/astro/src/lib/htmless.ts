// ─── HTMLess Astro Integration Helper ───────────────────────────────
// Creates a typed HTMLess client and exports helper functions for
// fetching content in Astro pages and components.

import { HTMLessClient } from '@htmless/sdk';
import type { ListResponse, GetEntriesOptions } from '@htmless/sdk';

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

// ─── Client ─────────────────────────────────────────────────────────

function createClient(): HTMLessClient {
  const baseUrl = import.meta.env.HTMLESS_API_URL as string;
  const apiToken = import.meta.env.HTMLESS_API_TOKEN as string | undefined;
  const spaceId = import.meta.env.HTMLESS_SPACE_ID as string;

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

// ─── Typed Helpers ──────────────────────────────────────────────────

/**
 * Fetch a list of published entries for a content type.
 */
export async function getEntries<T = Record<string, unknown>>(
  typeKey: string,
  options?: GetEntriesOptions,
): Promise<HtmlessListResponse<T>> {
  const client = getClient();
  const response: ListResponse<HtmlessEntry<T>> = await client.getEntries<HtmlessEntry<T>>(
    typeKey,
    options,
  );
  return { items: response.items, meta: response.meta };
}

/**
 * Fetch a single published entry by slug or ID.
 */
export async function getEntry<T = Record<string, unknown>>(
  typeKey: string,
  slugOrId: string,
): Promise<HtmlessEntry<T>> {
  const client = getClient();
  const isId = /^[a-z0-9]{20,}$/i.test(slugOrId);

  if (isId) {
    return client.getEntry<HtmlessEntry<T>>(typeKey, slugOrId);
  }

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
 */
export async function getPreview<T = Record<string, unknown>>(
  typeKey: string,
  slug: string,
): Promise<HtmlessEntry<T>> {
  const previewToken = import.meta.env.HTMLESS_PREVIEW_TOKEN as string;
  if (!previewToken) {
    throw new Error('Missing HTMLESS_PREVIEW_TOKEN for preview mode');
  }

  const client = getClient();
  return client.getPreview<HtmlessEntry<T>>(typeKey, slug, previewToken);
}

// Re-export for advanced usage
export { HTMLessClient } from '@htmless/sdk';
export { getClient };
