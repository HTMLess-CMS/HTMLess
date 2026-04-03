// ─── Content Relationship Utilities ──────────────────────────────────

import { prisma } from '../db.js';

export interface OutboundReference {
  fieldKey: string;
  targetEntryId: string;
  targetType: string;
}

export interface InboundReference {
  sourceEntryId: string;
  sourceType: string;
  fieldKey: string;
}

export interface IntegrityCheckResult {
  referencedBy: number;
  safe: boolean;
}

/**
 * Scans an entry's published data for reference fields and returns all
 * outbound references (i.e. entries this entry points to).
 */
export async function getReferencesFrom(
  entryId: string,
  spaceId: string,
): Promise<OutboundReference[]> {
  const entry = await prisma.entry.findFirst({
    where: { id: entryId, spaceId },
    include: {
      contentType: { include: { fields: true } },
      state: { include: { publishedVersion: true } },
      versions: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!entry) return [];

  // Prefer published data, fall back to latest draft
  const data = (
    entry.state?.publishedVersion?.data ??
    entry.versions[0]?.data ??
    {}
  ) as Record<string, unknown>;

  const referenceFields = entry.contentType.fields.filter(
    (f) => f.type === 'reference',
  );

  const results: OutboundReference[] = [];

  for (const field of referenceFields) {
    const value = data[field.key];
    if (value == null) continue;

    const targetType = field.referenceTarget ?? 'unknown';
    const ids = Array.isArray(value) ? (value as string[]) : [value as string];

    for (const targetEntryId of ids) {
      if (typeof targetEntryId === 'string') {
        results.push({ fieldKey: field.key, targetEntryId, targetType });
      }
    }
  }

  return results;
}

/**
 * Finds all entries that reference the given entry (reverse lookup).
 * Scans published_documents JSON data for the entry ID.
 */
export async function getReferencesTo(
  entryId: string,
  spaceId: string,
): Promise<InboundReference[]> {
  // Load all published docs in this space — we scan their JSON data for
  // references to the target entryId.
  const docs = await prisma.publishedDocument.findMany({
    where: { spaceId },
    select: {
      entryId: true,
      contentTypeKey: true,
      data: true,
    },
  });

  // Load content type field definitions for reference fields
  const contentTypes = await prisma.contentType.findMany({
    where: { spaceId },
    include: { fields: { where: { type: 'reference' } } },
  });

  const fieldsByType = new Map<string, { key: string }[]>();
  for (const ct of contentTypes) {
    fieldsByType.set(ct.key, ct.fields);
  }

  const results: InboundReference[] = [];

  for (const doc of docs) {
    // Skip the entry itself
    if (doc.entryId === entryId) continue;

    const data = (doc.data ?? {}) as Record<string, unknown>;
    const refFields = fieldsByType.get(doc.contentTypeKey) ?? [];

    for (const field of refFields) {
      const value = data[field.key];
      if (value == null) continue;

      const ids = Array.isArray(value) ? (value as string[]) : [value as string];

      if (ids.includes(entryId)) {
        results.push({
          sourceEntryId: doc.entryId,
          sourceType: doc.contentTypeKey,
          fieldKey: field.key,
        });
      }
    }

    // Also scan raw data values for the entryId (catch resolved objects)
    const jsonStr = JSON.stringify(data);
    if (!jsonStr.includes(entryId)) continue;

    // Check if we already found it via field definitions — avoid duplicates
    const alreadyFound = results.some(
      (r) => r.sourceEntryId === doc.entryId,
    );
    if (alreadyFound) continue;

    // Fallback: scan all string values in data
    for (const [key, val] of Object.entries(data)) {
      if (val == null) continue;

      if (typeof val === 'string' && val === entryId) {
        results.push({
          sourceEntryId: doc.entryId,
          sourceType: doc.contentTypeKey,
          fieldKey: key,
        });
      } else if (Array.isArray(val) && val.includes(entryId)) {
        results.push({
          sourceEntryId: doc.entryId,
          sourceType: doc.contentTypeKey,
          fieldKey: key,
        });
      }
    }
  }

  return results;
}

/**
 * Checks if any entries reference this one before delete.
 * Returns the count and whether it's safe to delete.
 */
export async function checkReferentialIntegrity(
  entryId: string,
  spaceId: string,
): Promise<IntegrityCheckResult> {
  const refs = await getReferencesTo(entryId, spaceId);
  return {
    referencedBy: refs.length,
    safe: refs.length === 0,
  };
}
