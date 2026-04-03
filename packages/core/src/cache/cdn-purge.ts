// ─── CDN Purge Integration ──────────────────────────────────────────
// Provider-based CDN cache purge. Supports Fastly, Cloudflare, or a
// null provider (default when no CDN is configured).

// ─── Provider Interface ─────────────────────────────────────────────

export interface CDNProvider {
  /** Purge edge cache by Surrogate-Key / cache tags. */
  purgeByTags(tags: string[]): Promise<void>;
  /** Purge edge cache by exact URLs. */
  purgeByUrl(urls: string[]): Promise<void>;
  /** Nuclear: purge the entire edge cache. */
  purgeAll(): Promise<void>;
}

// ─── Fastly CDN Provider ────────────────────────────────────────────

export class FastlyCDNProvider implements CDNProvider {
  private readonly apiToken: string;
  private readonly serviceId: string;

  constructor() {
    const apiToken = process.env.FASTLY_API_TOKEN;
    const serviceId = process.env.FASTLY_SERVICE_ID;

    if (!apiToken || !serviceId) {
      throw new Error(
        'FastlyCDNProvider requires FASTLY_API_TOKEN and FASTLY_SERVICE_ID environment variables',
      );
    }

    this.apiToken = apiToken;
    this.serviceId = serviceId;
  }

  async purgeByTags(tags: string[]): Promise<void> {
    if (tags.length === 0) return;

    // Fastly supports purging by Surrogate-Key header (space-separated tags)
    // POST /service/{service_id}/purge
    try {
      await fetch(`https://api.fastly.com/service/${this.serviceId}/purge`, {
        method: 'POST',
        headers: {
          'Fastly-Key': this.apiToken,
          'Surrogate-Key': tags.join(' '),
          'Accept': 'application/json',
        },
      });
    } catch (err) {
      console.error('[CDN:Fastly] purgeByTags failed:', err);
    }
  }

  async purgeByUrl(urls: string[]): Promise<void> {
    if (urls.length === 0) return;

    // Fastly purges individual URLs via PURGE method
    try {
      await Promise.all(
        urls.map((url) =>
          fetch(url, {
            method: 'PURGE',
            headers: {
              'Fastly-Key': this.apiToken,
            },
          }),
        ),
      );
    } catch (err) {
      console.error('[CDN:Fastly] purgeByUrl failed:', err);
    }
  }

  async purgeAll(): Promise<void> {
    try {
      await fetch(`https://api.fastly.com/service/${this.serviceId}/purge_all`, {
        method: 'POST',
        headers: {
          'Fastly-Key': this.apiToken,
          'Accept': 'application/json',
        },
      });
    } catch (err) {
      console.error('[CDN:Fastly] purgeAll failed:', err);
    }
  }
}

// ─── Cloudflare CDN Provider ────────────────────────────────────────

export class CloudflareCDNProvider implements CDNProvider {
  private readonly apiToken: string;
  private readonly zoneId: string;

  constructor() {
    const apiToken = process.env.CF_API_TOKEN;
    const zoneId = process.env.CF_ZONE_ID;

    if (!apiToken || !zoneId) {
      throw new Error(
        'CloudflareCDNProvider requires CF_API_TOKEN and CF_ZONE_ID environment variables',
      );
    }

    this.apiToken = apiToken;
    this.zoneId = zoneId;
  }

  async purgeByTags(tags: string[]): Promise<void> {
    if (tags.length === 0) return;

    // Cloudflare Enterprise supports Cache-Tag purge
    // POST /zones/{zone_id}/purge_cache
    try {
      await fetch(`https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags }),
      });
    } catch (err) {
      console.error('[CDN:Cloudflare] purgeByTags failed:', err);
    }
  }

  async purgeByUrl(urls: string[]): Promise<void> {
    if (urls.length === 0) return;

    try {
      // Cloudflare supports up to 30 URLs per request
      const chunks: string[][] = [];
      for (let i = 0; i < urls.length; i += 30) {
        chunks.push(urls.slice(i, i + 30));
      }

      await Promise.all(
        chunks.map((chunk) =>
          fetch(`https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ files: chunk }),
          }),
        ),
      );
    } catch (err) {
      console.error('[CDN:Cloudflare] purgeByUrl failed:', err);
    }
  }

  async purgeAll(): Promise<void> {
    try {
      await fetch(`https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purge_everything: true }),
      });
    } catch (err) {
      console.error('[CDN:Cloudflare] purgeAll failed:', err);
    }
  }
}

// ─── Null CDN Provider ──────────────────────────────────────────────

export class NullCDNProvider implements CDNProvider {
  async purgeByTags(_tags: string[]): Promise<void> {
    // No CDN configured — nothing to purge
  }

  async purgeByUrl(_urls: string[]): Promise<void> {
    // No CDN configured — nothing to purge
  }

  async purgeAll(): Promise<void> {
    // No CDN configured — nothing to purge
  }
}

// ─── Factory ────────────────────────────────────────────────────────

let _provider: CDNProvider | undefined;

/**
 * Get the configured CDN provider based on the CDN_PROVIDER env var.
 * Defaults to NullCDNProvider when no CDN is configured.
 *
 * Supported values: 'fastly', 'cloudflare'
 */
export function getCDNProvider(): CDNProvider {
  if (_provider) return _provider;

  const providerName = (process.env.CDN_PROVIDER ?? '').toLowerCase();

  switch (providerName) {
    case 'fastly':
      _provider = new FastlyCDNProvider();
      break;
    case 'cloudflare':
      _provider = new CloudflareCDNProvider();
      break;
    default:
      _provider = new NullCDNProvider();
      break;
  }

  return _provider;
}

/**
 * Reset the cached provider (useful for testing or config reload).
 */
export function resetCDNProvider(): void {
  _provider = undefined;
}
