// ─── HTMLess TypeScript SDK ─────────────────────────────────────────
// Zero dependencies beyond globalThis.fetch (Node 18+, all browsers).

export interface HTMLessClientOptions {
  baseUrl: string;
  apiToken?: string;
  spaceId: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ContentType {
  id: string;
  key: string;
  name: string;
  description: string | null;
  version: number;
  fields: ContentTypeField[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentTypeField {
  id: string;
  key: string;
  name: string;
  type: string;
  required: boolean;
  unique: boolean;
  localized: boolean;
  validations: unknown;
  defaultValue: unknown;
  enumValues: unknown;
  referenceTarget: string | null;
  sortOrder: number;
}

export interface Asset {
  id: string;
  filename: string;
  mimeType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  caption: string | null;
  storageKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetEntriesOptions {
  slug?: string;
  locale?: string;
  filters?: Record<string, string>;
  sort?: string;
  fields?: string[];
  include?: string[];
  page?: number;
  limit?: number;
}

export interface GetEntryOptions {
  fields?: string[];
  include?: string[];
  locale?: string;
}

export class HTMLessClient {
  private readonly baseUrl: string;
  private readonly apiToken?: string;
  private readonly spaceId: string;

  constructor(options: HTMLessClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiToken = options.apiToken;
    this.spaceId = options.spaceId;
  }

  // ─── CDA Methods ───

  async getEntries<T = Record<string, unknown>>(
    typeKey: string,
    options?: GetEntriesOptions,
  ): Promise<ListResponse<T>> {
    const params = new URLSearchParams();

    if (options?.slug) params.set('slug', options.slug);
    if (options?.locale) params.set('locale', options.locale);
    if (options?.sort) params.set('sort', options.sort);
    if (options?.fields) params.set('fields', options.fields.join(','));
    if (options?.include) params.set('include', options.include.join(','));
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));

    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        params.set(key, value);
      }
    }

    const qs = params.toString();
    const url = `${this.baseUrl}/api/cda/content/${typeKey}${qs ? `?${qs}` : ''}`;

    const data = await this.request<{
      items: T[];
      pagination: PaginationMeta;
    }>(url);

    return {
      items: data.items,
      meta: data.pagination,
    };
  }

  async getEntry<T = Record<string, unknown>>(
    typeKey: string,
    id: string,
    options?: GetEntryOptions,
  ): Promise<T> {
    const params = new URLSearchParams();

    if (options?.fields) params.set('fields', options.fields.join(','));
    if (options?.include) params.set('include', options.include.join(','));
    if (options?.locale) params.set('locale', options.locale);

    const qs = params.toString();
    const url = `${this.baseUrl}/api/cda/content/${typeKey}/${id}${qs ? `?${qs}` : ''}`;

    return this.request<T>(url);
  }

  async getAsset(id: string): Promise<Asset> {
    const url = `${this.baseUrl}/api/cda/assets/${id}`;
    return this.request<Asset>(url);
  }

  // ─── Schema Methods ───

  async getTypes(): Promise<ContentType[]> {
    const url = `${this.baseUrl}/api/cda/schemas/types`;
    const data = await this.request<{ items: ContentType[] }>(url);
    return data.items;
  }

  async getType(key: string): Promise<ContentType> {
    const url = `${this.baseUrl}/api/cda/schemas/types/${key}`;
    return this.request<ContentType>(url);
  }

  // ─── Preview Methods ───

  async getPreview<T = Record<string, unknown>>(
    typeKey: string,
    slug: string,
    previewToken: string,
  ): Promise<T> {
    const params = new URLSearchParams();
    params.set('slug', slug);

    const url = `${this.baseUrl}/api/preview/content/${typeKey}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${previewToken}`,
        'X-Space-Id': this.spaceId,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new HTMLessError(response.status, body);
    }

    const data = await response.json() as { items: T[] };

    if (data.items && data.items.length > 0) {
      return data.items[0];
    }

    throw new HTMLessError(404, 'Preview entry not found');
  }

  // ─── Internal ───

  private async request<T>(url: string): Promise<T> {
    const headers: Record<string, string> = {
      'X-Space-Id': this.spaceId,
      'Accept': 'application/json',
    };

    if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const body = await response.text();
      throw new HTMLessError(response.status, body);
    }

    return response.json() as Promise<T>;
  }
}

export class HTMLessError extends Error {
  public readonly status: number;
  public readonly body: string;

  constructor(status: number, body: string) {
    super(`HTMLess API error ${status}: ${body}`);
    this.name = 'HTMLessError';
    this.status = status;
    this.body = body;
  }
}
