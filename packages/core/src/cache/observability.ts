// ─── Cache Observability & Metrics ──────────────────────────────────
// Provides cache hit/miss statistics, key listing, and tag inspection
// by reading from Redis INFO + custom counters.

import { redis } from '../redis.js';

// ─── Types ──────────────────────────────────────────────────────────

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

export interface CacheTagInfo {
  tag: string;
  keyCount: number;
}

// ─── Counter Keys ───────────────────────────────────────────────────

const COUNTER_HITS = 'cache-stats:hits';
const COUNTER_MISSES = 'cache-stats:misses';

// ─── Tracking ───────────────────────────────────────────────────────

/**
 * Record a cache hit. Call this from the CDA response flow
 * when a Redis cache lookup succeeds.
 */
export async function trackCacheHit(): Promise<void> {
  try {
    await redis.incr(COUNTER_HITS);
  } catch {
    // Non-critical — swallow Redis errors
  }
}

/**
 * Record a cache miss. Call this from the CDA response flow
 * when a Redis cache lookup returns null.
 */
export async function trackCacheMiss(): Promise<void> {
  try {
    await redis.incr(COUNTER_MISSES);
  } catch {
    // Non-critical — swallow Redis errors
  }
}

// ─── Stats ──────────────────────────────────────────────────────────

/**
 * Retrieve aggregated cache statistics from Redis INFO and custom counters.
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const [hitsStr, missesStr, infoRaw] = await Promise.all([
      redis.get(COUNTER_HITS),
      redis.get(COUNTER_MISSES),
      redis.info('stats'),
    ]);

    const hits = parseInt(hitsStr ?? '0', 10);
    const misses = parseInt(missesStr ?? '0', 10);
    const total = hits + misses;
    const hitRate = total > 0 ? hits / total : 0;

    // Parse evictions from Redis INFO stats section
    const evictedMatch = infoRaw.match(/evicted_keys:(\d+)/);
    const evictions = evictedMatch ? parseInt(evictedMatch[1], 10) : 0;

    // Parse dbsize for total key count
    const dbSize = await redis.dbsize();

    return {
      hits,
      misses,
      evictions,
      size: dbSize,
      hitRate: Math.round(hitRate * 10000) / 10000, // 4 decimal places
    };
  } catch {
    return { hits: 0, misses: 0, evictions: 0, size: 0, hitRate: 0 };
  }
}

// ─── Key Inspection ─────────────────────────────────────────────────

/**
 * List cache keys matching a glob pattern using SCAN (non-blocking).
 * Limits results to 1000 keys to prevent unbounded responses.
 */
export async function getCacheKeys(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  const MAX_KEYS = 1000;

  try {
    let cursor = '0';
    do {
      const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = nextCursor;
      keys.push(...batch);
      if (keys.length >= MAX_KEYS) break;
    } while (cursor !== '0');
  } catch {
    // Swallow — return whatever we collected
  }

  return keys.slice(0, MAX_KEYS);
}

// ─── Tag Inspection ─────────────────────────────────────────────────

/**
 * List all Surrogate-Key / cache tags for a space with key counts.
 * Tags are stored in Redis sets with the pattern `cache-tag:{tag}`.
 */
export async function getCacheTags(spaceId: string): Promise<CacheTagInfo[]> {
  const tagKeys = await getCacheKeys(`cache-tag:${spaceId}:*`);
  const tags: CacheTagInfo[] = [];

  for (const tagKey of tagKeys) {
    try {
      const keyCount = await redis.scard(tagKey);
      // Extract the tag name from the Redis key: "cache-tag:spaceId:tagName" -> "tagName"
      const parts = tagKey.split(':');
      const tag = parts.slice(2).join(':');
      tags.push({ tag, keyCount });
    } catch {
      // Skip broken tags
    }
  }

  return tags.sort((a, b) => b.keyCount - a.keyCount);
}
