// ─── Query resolver: maps parsed operations to Prisma queries ───

import { prisma } from '../../db.js';
import type { ParsedOperation, ParsedField } from './parser.js';

/**
 * Project an object to only include the requested field names.
 * Supports nested field selection for sub-objects.
 */
function projectFields<T extends Record<string, unknown>>(
  obj: T,
  fields: ParsedField[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.name in obj) {
      const value = obj[field.name];
      if (field.subFields && value && typeof value === 'object' && !Array.isArray(value)) {
        result[field.name] = projectFields(value as Record<string, unknown>, field.subFields);
      } else if (field.subFields && Array.isArray(value)) {
        result[field.name] = value.map((item) =>
          typeof item === 'object' && item !== null
            ? projectFields(item as Record<string, unknown>, field.subFields!)
            : item,
        );
      } else {
        result[field.name] = value;
      }
    }
  }
  return result;
}

async function resolveEntries(
  spaceId: string,
  op: ParsedOperation,
): Promise<Record<string, unknown>[]> {
  const typeKey = op.args.type as string | undefined;
  const limit = typeof op.args.limit === 'number' ? op.args.limit : 25;
  const offset = typeof op.args.offset === 'number' ? op.args.offset : 0;

  const where: Record<string, unknown> = { spaceId };
  if (typeKey) {
    where.contentTypeKey = typeKey;
  }

  const docs = await prisma.publishedDocument.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: Math.min(limit, 100),
    skip: offset,
  });

  const items = docs.map((doc) => ({
    id: doc.entryId,
    type: doc.contentTypeKey,
    slug: doc.slug,
    data: doc.data,
    publishedAt: doc.publishedAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }));

  return items.map((item) => projectFields(item, op.fields));
}

async function resolveEntry(
  spaceId: string,
  op: ParsedOperation,
): Promise<Record<string, unknown> | null> {
  const typeKey = op.args.type as string | undefined;
  const slug = op.args.slug as string | undefined;
  const id = op.args.id as string | undefined;

  const where: Record<string, unknown> = { spaceId };
  if (typeKey) where.contentTypeKey = typeKey;
  if (slug) where.slug = slug;
  if (id) where.entryId = id;

  const doc = await prisma.publishedDocument.findFirst({ where });
  if (!doc) return null;

  const item = {
    id: doc.entryId,
    type: doc.contentTypeKey,
    slug: doc.slug,
    data: doc.data,
    publishedAt: doc.publishedAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };

  return projectFields(item, op.fields);
}

async function resolveTypes(
  spaceId: string,
  op: ParsedOperation,
): Promise<Record<string, unknown>[]> {
  const types = await prisma.contentType.findMany({
    where: { spaceId },
    include: { fields: { orderBy: { sortOrder: 'asc' } } },
  });

  const items = types.map((ct) => ({
    id: ct.id,
    key: ct.key,
    name: ct.name,
    description: ct.description,
    version: ct.version,
    fields: ct.fields.map((f) => ({
      id: f.id,
      key: f.key,
      name: f.name,
      type: f.type,
      required: f.required,
      localized: f.localized,
      validations: f.validations,
    })),
  }));

  return items.map((item) => projectFields(item, op.fields));
}

async function resolveAssets(
  spaceId: string,
  op: ParsedOperation,
): Promise<Record<string, unknown>[]> {
  const limit = typeof op.args.limit === 'number' ? op.args.limit : 25;
  const offset = typeof op.args.offset === 'number' ? op.args.offset : 0;

  const assets = await prisma.asset.findMany({
    where: { spaceId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
    skip: offset,
  });

  const items = assets.map((a) => ({
    id: a.id,
    filename: a.filename,
    mimeType: a.mimeType,
    bytes: a.bytes,
    width: a.width,
    height: a.height,
    alt: a.alt,
    url: `/media/${a.storageKey}`,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return items.map((item) => projectFields(item, op.fields));
}

const resolvers: Record<
  string,
  (spaceId: string, op: ParsedOperation) => Promise<unknown>
> = {
  entries: resolveEntries,
  entry: resolveEntry,
  types: resolveTypes,
  assets: resolveAssets,
};

export async function resolveQuery(
  spaceId: string,
  operations: ParsedOperation[],
): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  for (const op of operations) {
    const resolver = resolvers[op.name];
    if (!resolver) {
      throw new Error(`Unknown operation: "${op.name}". Available: ${Object.keys(resolvers).join(', ')}`);
    }
    data[op.name] = await resolver(spaceId, op);
  }

  return data;
}
