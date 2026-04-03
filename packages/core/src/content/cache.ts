// ─── Redis CDA Response Cache ───────────────────────────────────────

import { redis } from '../redis.js';

const KEY_PREFIX = 'cda';

/**
 * Build a cache key following the format:
 *   cda:${spaceId}:${contentTypeKey}:${slug || 'list'}:${queryHash}
 */
export function buildCacheKey(
  spaceId: string,
  contentTypeKey: string,
  slugOrList: string,
  queryHash: string,
): string {
  return `${KEY_PREFIX}:${spaceId}:${contentTypeKey}:${slugOrList}:${queryHash}`;
}

/**
 * Get a cached response string from Redis.
 */
export async function getCachedResponse(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch {
    // Redis failure should never break the read path
    return null;
  }
}

/**
 * Set a cached response string in Redis with a TTL.
 */
export async function setCachedResponse(
  key: string,
  data: string,
  ttlSeconds: number,
): Promise<void> {
  try {
    await redis.set(key, data, 'EX', ttlSeconds);
  } catch {
    // Swallow — cache miss is acceptable
  }
}

/**
 * Invalidate all cache keys that match a specific entry.
 * Uses SCAN to avoid blocking Redis on large key spaces.
 */
export async function invalidateByEntry(spaceId: string, entryId: string): Promise<void> {
  // Entry-level keys are hard to track exactly, so we scan for the entry in
  // pattern-matched keys. Since the entry ID isn't embedded in the cache key
  // format, we invalidate the whole space's CDA cache to be safe.
  // For entry-level precision, we would need a secondary index mapping
  // entryId → cache keys. The space-level sweep is acceptable for now.
  await invalidateByPattern(`${KEY_PREFIX}:${spaceId}:*`);
  // Also clean up any per-entry cached single-item responses
  void purgeKeysByTag(spaceId, entryId);
}

/**
 * Invalidate all cache keys for a content type within a space.
 */
export async function invalidateByType(
  spaceId: string,
  contentTypeKey: string,
): Promise<void> {
  await invalidateByPattern(`${KEY_PREFIX}:${spaceId}:${contentTypeKey}:*`);
}

/**
 * Nuclear option: invalidate every CDA cache key for a space.
 */
export async function invalidateBySpace(spaceId: string): Promise<void> {
  await invalidateByPattern(`${KEY_PREFIX}:${spaceId}:*`);
}

// ── Internal helpers ────────────────────────────────────────────────

/**
 * SCAN + DEL for keys matching a glob pattern.
 * Uses SCAN to avoid blocking.
 */
async function invalidateByPattern(pattern: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch {
    // Redis failure should not propagate to callers
  }
}

/**
 * Best-effort tag-based purge. We maintain a Redis set per entry that
 * records which cache keys reference it. On invalidation we delete those
 * keys and the set itself.
 */
async function purgeKeysByTag(spaceId: string, entryId: string): Promise<void> {
  const tagKey = `cda-tag:${spaceId}:entry:${entryId}`;
  try {
    const keys = await redis.smembers(tagKey);
    if (keys.length > 0) {
      await redis.del(...keys, tagKey);
    } else {
      await redis.del(tagKey);
    }
  } catch {
    // non-critical
  }
}
