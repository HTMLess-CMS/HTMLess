// ─── HTMLess Nuxt Composable ────────────────────────────────────────
// Provides reactive, typed access to HTMLess content inside Nuxt 3.
// Uses useRuntimeConfig() for environment values and auto-detects
// preview mode from a cookie.

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

// ─── Composable ─────────────────────────────────────────────────────

export function useHtmless() {
  const config = useRuntimeConfig();

  const baseUrl = (config.public.htmlessApiUrl as string) || process.env.HTMLESS_API_URL || '';
  const apiToken = (process.env.HTMLESS_API_TOKEN as string) || '';
  const spaceId = (config.public.htmlessSpaceId as string) || process.env.HTMLESS_SPACE_ID || '';

  const client = new HTMLessClient({ baseUrl, apiToken, spaceId });

  // Detect preview mode from cookie (set via /api/preview endpoint)
  const previewCookie = useCookie('htmless-preview');
  const isPreview = computed(() => previewCookie.value === 'true');

  /**
   * Fetch a list of published entries for a content type.
   */
  async function getEntries<T = Record<string, unknown>>(
    typeKey: string,
    options?: GetEntriesOptions,
  ): Promise<HtmlessListResponse<T>> {
    const response: ListResponse<HtmlessEntry<T>> = await client.getEntries<HtmlessEntry<T>>(
      typeKey,
      options,
    );
    return { items: response.items, meta: response.meta };
  }

  /**
   * Fetch a single published entry by slug or ID.
   */
  async function getEntry<T = Record<string, unknown>>(
    typeKey: string,
    slugOrId: string,
  ): Promise<HtmlessEntry<T>> {
    const isId = /^[a-z0-9]{20,}$/i.test(slugOrId);

    if (isId) {
      return client.getEntry<HtmlessEntry<T>>(typeKey, slugOrId);
    }

    const response = await client.getEntries<HtmlessEntry<T>>(typeKey, {
      slug: slugOrId,
      limit: 1,
    });

    if (response.items.length === 0) {
      throw createError({
        statusCode: 404,
        message: `Entry not found: ${typeKey}/${slugOrId}`,
      });
    }

    return response.items[0];
  }

  /**
   * Fetch a draft/preview entry. Requires HTMLESS_PREVIEW_TOKEN in env.
   */
  async function getPreview<T = Record<string, unknown>>(
    typeKey: string,
    slug: string,
  ): Promise<HtmlessEntry<T>> {
    const previewToken = process.env.HTMLESS_PREVIEW_TOKEN;
    if (!previewToken) {
      throw createError({
        statusCode: 500,
        message: 'Missing HTMLESS_PREVIEW_TOKEN for preview mode',
      });
    }

    return client.getPreview<HtmlessEntry<T>>(typeKey, slug, previewToken);
  }

  /**
   * Smart fetch: returns preview content when preview mode is active,
   * otherwise returns published content.
   */
  async function getContent<T = Record<string, unknown>>(
    typeKey: string,
    slug: string,
  ): Promise<HtmlessEntry<T>> {
    if (isPreview.value) {
      return getPreview<T>(typeKey, slug);
    }
    return getEntry<T>(typeKey, slug);
  }

  return {
    client,
    isPreview,
    getEntries,
    getEntry,
    getPreview,
    getContent,
  };
}
