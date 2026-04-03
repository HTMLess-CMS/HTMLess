// ─── Asset Usage Tracker ─────────────────────────────────────────────

import { prisma } from '../db.js';

export interface AssetUsageEntry {
  entryId: string;
  entrySlug: string;
  fieldKey: string;
  contentTypeKey: string;
}

export interface AssetDeletableResult {
  usedBy: number;
  safe: boolean;
}

/**
 * Scans published_documents for entries that reference the given asset ID
 * in their data. Returns details about each usage.
 */
export async function getAssetUsage(
  assetId: string,
  spaceId: string,
): Promise<AssetUsageEntry[]> {
  // Load all published docs in this space
  const docs = await prisma.publishedDocument.findMany({
    where: { spaceId },
    select: {
      entryId: true,
      contentTypeKey: true,
      slug: true,
      data: true,
    },
  });

  // Load content type field definitions for media fields
  const contentTypes = await prisma.contentType.findMany({
    where: { spaceId },
    include: { fields: { where: { type: 'media' } } },
  });

  const mediaFieldsByType = new Map<string, { key: string }[]>();
  for (const ct of contentTypes) {
    mediaFieldsByType.set(ct.key, ct.fields);
  }

  const results: AssetUsageEntry[] = [];

  for (const doc of docs) {
    const data = (doc.data ?? {}) as Record<string, unknown>;
    const jsonStr = JSON.stringify(data);

    // Quick check: skip if assetId doesn't appear anywhere in the JSON
    if (!jsonStr.includes(assetId)) continue;

    const mediaFields = mediaFieldsByType.get(doc.contentTypeKey) ?? [];
    let found = false;

    // Check known media fields first
    for (const field of mediaFields) {
      const value = data[field.key];
      if (value == null) continue;

      const ids: string[] = [];
      if (typeof value === 'string') {
        ids.push(value);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') {
            ids.push(item);
          } else if (typeof item === 'object' && item !== null && 'id' in item) {
            ids.push((item as { id: string }).id);
          }
        }
      } else if (typeof value === 'object' && value !== null && 'id' in value) {
        ids.push((value as { id: string }).id);
      }

      if (ids.includes(assetId)) {
        results.push({
          entryId: doc.entryId,
          entrySlug: doc.slug,
          fieldKey: field.key,
          contentTypeKey: doc.contentTypeKey,
        });
        found = true;
      }
    }

    // Fallback: scan all data keys for the asset ID (catches non-media fields
    // that might store an asset reference)
    if (!found) {
      for (const [key, val] of Object.entries(data)) {
        if (val == null) continue;

        const matchesId =
          (typeof val === 'string' && val === assetId) ||
          (Array.isArray(val) && val.includes(assetId)) ||
          (typeof val === 'object' &&
            val !== null &&
            'id' in val &&
            (val as { id: string }).id === assetId);

        if (matchesId) {
          results.push({
            entryId: doc.entryId,
            entrySlug: doc.slug,
            fieldKey: key,
            contentTypeKey: doc.contentTypeKey,
          });
          break;
        }
      }
    }
  }

  return results;
}

/**
 * Returns whether the asset can be safely deleted (not used by any
 * published entry).
 */
export async function checkAssetDeletable(
  assetId: string,
  spaceId: string,
): Promise<AssetDeletableResult> {
  const usage = await getAssetUsage(assetId, spaceId);
  return {
    usedBy: usage.length,
    safe: usage.length === 0,
  };
}
