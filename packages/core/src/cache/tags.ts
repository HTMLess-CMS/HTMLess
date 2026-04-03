// ─── Cache Tag Management ───────────────────────────────────────────
// Associates cache keys with Surrogate-Key tags stored in Redis sets.
// Supports tag-based invalidation and CDN purge integration.

import { redis } from '../redis.js';
import { getCDNProvider } from './cdn-purge.js';

const TAG_PREFIX = 'cache-tag';

// ─── Tag Registration ───────────────────────────────────────────────

/**
 * Associate a cache key with one or more tags.
 * Tags are stored as Redis sets: `cache-tag:{tag}` -> set of cache keys.
 * Each association is given the same TTL as the cache key itself (or 1 hour
 * as a fallback) so that stale tag associations self-clean.
 */
export async function addCacheTag(key: string, tags: string[]): Promise<void> {
  if (tags.length === 0) return;

  try {
    const pipeline = redis.pipeline();
    for (const tag of tags) {
      const tagKey = `${TAG_PREFIX}:${tag}`;
      pipeline.sadd(tagKey, key);
      // Set a TTL on the tag set as a safety net for cleanup.
      // Renew to 1 hour on each write so active tags stay alive.
      pipeline.expire(tagKey, 3600);
    }
    await pipeline.exec();
  } catch {
    // Non-critical — cache tags are best-effort
  }
}

// ─── Tag Invalidation ───────────────────────────────────────────────

/**
 * Delete all cache keys associated with a tag, then remove the tag set itself.
 * Returns the number of cache keys that were deleted.
 */
export async function invalidateByTag(tag: string): Promise<number> {
  const tagKey = `${TAG_PREFIX}:${tag}`;

  try {
    const keys = await redis.smembers(tagKey);

    if (keys.length === 0) {
      await redis.del(tagKey);
      return 0;
    }

    // Delete all cache keys + the tag set in one pipeline
    const pipeline = redis.pipeline();
    pipeline.del(...keys);
    pipeline.del(tagKey);
    await pipeline.exec();

    return keys.length;
  } catch {
    return 0;
  }
}

/**
 * Invalidate multiple tags at once. Returns total number of cache keys deleted.
 */
export async function invalidateByTags(tags: string[]): Promise<number> {
  let total = 0;
  for (const tag of tags) {
    total += await invalidateByTag(tag);
  }
  return total;
}

// ─── CDN Purge ──────────────────────────────────────────────────────

/**
 * Purge both Redis cache and CDN edge caches for the given tags.
 * Calls invalidateByTag for each tag, then delegates to the configured
 * CDN provider to purge edge caches.
 */
export async function purgeCDN(tags: string[]): Promise<void> {
  // Invalidate Redis first
  await invalidateByTags(tags);

  // Purge CDN edge
  const provider = getCDNProvider();
  await provider.purgeByTags(tags);
}

// ─── Helpers for CDA Integration ────────────────────────────────────

/**
 * Build standard Surrogate-Key tags for a CDA response.
 * Used by the CDA content endpoints to register tags after caching.
 */
export function buildSurrogateKeyTags(
  spaceId: string,
  contentTypeKey: string,
  entryId?: string,
): string[] {
  const tags = [
    `space:${spaceId}`,
    `type:${contentTypeKey}`,
  ];

  if (entryId) {
    tags.push(`entry:${entryId}`);
  }

  return tags;
}
