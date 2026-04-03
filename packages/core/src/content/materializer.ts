// ─── Publish-Time Document Materializer ─────────────────────────────

import { createHash } from 'crypto';
import { prisma } from '../db.js';
import type { Field, Prisma } from '@prisma/client';

/**
 * Materialize an entry into the `published_documents` read-model table.
 * Called immediately after a successful publish transaction.
 *
 * Loads the entry with its published version and content type, resolves
 * all reference/media fields by batch-loading referenced entries, then
 * upserts into `published_documents` with the fully resolved JSON.
 */
export async function materializeEntry(entryId: string): Promise<void> {
  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: {
      contentType: {
        include: { fields: true },
      },
      state: {
        include: { publishedVersion: true },
      },
    },
  });

  if (!entry) return;
  if (!entry.state?.publishedVersion) return;

  const rawData = (entry.state.publishedVersion.data ?? {}) as Record<string, unknown>;
  const fields = entry.contentType.fields;

  // Resolve all reference and media fields
  const resolvedData = await batchResolveReferences(rawData, fields, entry.spaceId);

  // Generate etag from the resolved data
  const etag = createHash('md5').update(JSON.stringify(resolvedData)).digest('hex');

  await prisma.publishedDocument.upsert({
    where: { entryId },
    create: {
      spaceId: entry.spaceId,
      entryId,
      contentTypeKey: entry.contentType.key,
      slug: entry.slug,
      data: JSON.parse(JSON.stringify(resolvedData)),
      publishedAt: new Date(),
      etag,
    },
    update: {
      contentTypeKey: entry.contentType.key,
      slug: entry.slug,
      data: JSON.parse(JSON.stringify(resolvedData)),
      publishedAt: new Date(),
      etag,
    },
  });
}

/**
 * Remove an entry from the published_documents table.
 * Called after unpublishing an entry.
 */
export async function dematerializeEntry(entryId: string): Promise<void> {
  await prisma.publishedDocument.deleteMany({
    where: { entryId },
  });
}

/**
 * Batch-resolve reference and media fields in the data object.
 *
 * 1. Scans the field definitions for reference/media types
 * 2. Collects all referenced entry IDs and asset IDs from the data
 * 3. Batch loads referenced entries (from published_documents) in ONE query
 * 4. Batch loads referenced assets in ONE query
 * 5. Replaces IDs with resolved objects and returns the enriched data
 */
export async function batchResolveReferences(
  data: Record<string, unknown>,
  fields: Field[],
  spaceId: string,
): Promise<Record<string, unknown>> {
  const resolved = { ...data };

  // Collect IDs by type
  const referenceIds: string[] = [];
  const assetIds: string[] = [];

  const referenceFieldKeys: string[] = [];
  const mediaFieldKeys: string[] = [];

  for (const field of fields) {
    const value = data[field.key];
    if (value == null) continue;

    if (field.type === 'reference') {
      referenceFieldKeys.push(field.key);
      if (Array.isArray(value)) {
        referenceIds.push(...(value as string[]));
      } else if (typeof value === 'string') {
        referenceIds.push(value);
      }
    } else if (field.type === 'media') {
      mediaFieldKeys.push(field.key);
      if (Array.isArray(value)) {
        assetIds.push(...(value as string[]));
      } else if (typeof value === 'string') {
        assetIds.push(value);
      }
    }
  }

  // Nothing to resolve
  if (referenceIds.length === 0 && assetIds.length === 0) {
    return resolved;
  }

  // Batch load referenced entries from published_documents
  const refMap = new Map<string, Record<string, unknown>>();
  if (referenceIds.length > 0) {
    const uniqueRefIds = [...new Set(referenceIds)];
    const refDocs = await prisma.publishedDocument.findMany({
      where: {
        spaceId,
        entryId: { in: uniqueRefIds },
      },
    });

    for (const doc of refDocs) {
      refMap.set(doc.entryId, {
        id: doc.entryId,
        type: doc.contentTypeKey,
        slug: doc.slug,
        data: doc.data as Record<string, unknown>,
        publishedAt: doc.publishedAt.toISOString(),
      });
    }
  }

  // Batch load referenced assets
  const assetMap = new Map<string, Record<string, unknown>>();
  if (assetIds.length > 0) {
    const uniqueAssetIds = [...new Set(assetIds)];
    const assets = await prisma.asset.findMany({
      where: {
        spaceId,
        id: { in: uniqueAssetIds },
      },
    });

    for (const asset of assets) {
      assetMap.set(asset.id, {
        id: asset.id,
        filename: asset.filename,
        mimeType: asset.mimeType,
        bytes: asset.bytes,
        width: asset.width,
        height: asset.height,
        alt: asset.alt,
        caption: asset.caption,
        storageKey: asset.storageKey,
      });
    }
  }

  // Replace IDs with resolved objects in data
  for (const key of referenceFieldKeys) {
    const value = data[key];
    if (value == null) continue;

    if (Array.isArray(value)) {
      resolved[key] = (value as string[]).map((id) => refMap.get(id) ?? { id, _missing: true });
    } else if (typeof value === 'string') {
      resolved[key] = refMap.get(value) ?? { id: value, _missing: true };
    }
  }

  for (const key of mediaFieldKeys) {
    const value = data[key];
    if (value == null) continue;

    if (Array.isArray(value)) {
      resolved[key] = (value as string[]).map((id) => assetMap.get(id) ?? { id, _missing: true });
    } else if (typeof value === 'string') {
      resolved[key] = assetMap.get(value) ?? { id: value, _missing: true };
    }
  }

  return resolved;
}
