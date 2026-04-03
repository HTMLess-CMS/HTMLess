import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { nanoid } from 'nanoid';
import { prisma } from '../../db.js';
import { requireScope } from '../../auth/middleware.js';

const router: IRouter = Router();

// ─── Helpers ───

function getSpaceId(req: import('express').Request): string | undefined {
  return (req.params as Record<string, string>).spaceId ?? (req.headers['x-space-id'] as string | undefined);
}

function generateEtag(): string {
  return nanoid(16);
}

// ─── GET /export ───
router.get('/export', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  // Export content types with fields
  const contentTypes = await prisma.contentType.findMany({
    where: { spaceId },
    include: { fields: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });

  // Export entries with latest version data and state
  const entries = await prisma.entry.findMany({
    where: { spaceId },
    include: {
      contentType: { select: { key: true } },
      state: true,
      versions: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  // Export assets metadata
  const assets = await prisma.asset.findMany({
    where: { spaceId },
  });

  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    spaceId,
    contentTypes: contentTypes.map((ct) => ({
      key: ct.key,
      name: ct.name,
      description: ct.description,
      fields: ct.fields.map((f) => ({
        key: f.key,
        name: f.name,
        type: f.type,
        required: f.required,
        unique: f.unique,
        localized: f.localized,
        validations: f.validations,
        defaultValue: f.defaultValue,
        enumValues: f.enumValues,
        referenceTarget: f.referenceTarget,
        sortOrder: f.sortOrder,
      })),
    })),
    entries: entries.map((e) => ({
      id: e.id,
      contentTypeKey: e.contentType.key,
      slug: e.slug,
      status: e.state?.status ?? 'draft',
      data: e.versions[0]?.data ?? {},
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
    assets: assets.map((a) => ({
      id: a.id,
      filename: a.filename,
      mimeType: a.mimeType,
      bytes: a.bytes,
      width: a.width,
      height: a.height,
      alt: a.alt,
      caption: a.caption,
      storageKey: a.storageKey,
      checksum: a.checksum,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  res.set('Content-Disposition', `attachment; filename="htmless-export-${spaceId}-${Date.now()}.json"`);
  res.json(exportData);
});

// ─── POST /import ───
router.post('/import', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const importData = req.body;
  if (!importData || !importData.contentTypes) {
    res.status(400).json({ error: 'validation_error', message: 'Invalid import data — expected export JSON format' });
    return;
  }

  const stats = {
    contentTypes: { created: 0, updated: 0 },
    entries: { created: 0, updated: 0 },
    assets: { created: 0, updated: 0 },
  };

  try {
    // Upsert content types with fields
    for (const ct of (importData.contentTypes as Array<Record<string, unknown>>)) {
      const key = ct.key as string;
      const name = ct.name as string;
      const description = (ct.description as string | null) ?? null;
      const fields = (ct.fields as Array<Record<string, unknown>>) ?? [];

      const existing = await prisma.contentType.findUnique({
        where: { spaceId_key: { spaceId, key } },
      });

      let contentTypeId: string;

      if (existing) {
        await prisma.contentType.update({
          where: { id: existing.id },
          data: { name, description, version: { increment: 1 } },
        });
        contentTypeId = existing.id;
        stats.contentTypes.updated++;
      } else {
        const created = await prisma.contentType.create({
          data: { spaceId, key, name, description },
        });
        contentTypeId = created.id;
        stats.contentTypes.created++;
      }

      // Upsert fields
      for (const f of fields) {
        const fieldKey = f.key as string;
        const existingField = await prisma.field.findUnique({
          where: { contentTypeId_key: { contentTypeId, key: fieldKey } },
        });

        const fieldData = {
          name: f.name as string,
          type: f.type as string,
          required: (f.required as boolean) ?? false,
          unique: (f.unique as boolean) ?? false,
          localized: (f.localized as boolean) ?? false,
          validations: f.validations ?? undefined,
          defaultValue: f.defaultValue ?? undefined,
          enumValues: f.enumValues ?? undefined,
          referenceTarget: (f.referenceTarget as string | undefined) ?? undefined,
          sortOrder: (f.sortOrder as number) ?? 0,
        };

        if (existingField) {
          await prisma.field.update({
            where: { id: existingField.id },
            data: fieldData,
          });
        } else {
          await prisma.field.create({
            data: { contentTypeId, key: fieldKey, ...fieldData },
          });
        }
      }
    }

    // Upsert entries
    if (importData.entries && Array.isArray(importData.entries)) {
      for (const e of (importData.entries as Array<Record<string, unknown>>)) {
        const contentTypeKey = e.contentTypeKey as string;
        const slug = e.slug as string;
        const data = (e.data as object) ?? {};

        const contentType = await prisma.contentType.findUnique({
          where: { spaceId_key: { spaceId, key: contentTypeKey } },
        });

        if (!contentType) continue;

        const existing = await prisma.entry.findUnique({
          where: { spaceId_contentTypeId_slug: { spaceId, contentTypeId: contentType.id, slug } },
          include: { state: true },
        });

        const etag = generateEtag();

        if (existing) {
          // Update existing entry with new draft version
          await prisma.$transaction(async (tx) => {
            const version = await tx.entryVersion.create({
              data: {
                entryId: existing.id,
                kind: 'draft',
                data,
                etag,
                createdById: req.auth!.userId,
              },
            });

            await tx.entryState.upsert({
              where: { entryId: existing.id },
              update: { draftVersionId: version.id },
              create: {
                entryId: existing.id,
                status: 'draft',
                draftVersionId: version.id,
              },
            });

            await tx.entry.update({ where: { id: existing.id }, data: {} });
          });

          stats.entries.updated++;
        } else {
          // Create new entry
          await prisma.$transaction(async (tx) => {
            const newEntry = await tx.entry.create({
              data: { spaceId, contentTypeId: contentType.id, slug },
            });

            const version = await tx.entryVersion.create({
              data: {
                entryId: newEntry.id,
                kind: 'draft',
                data,
                etag,
                createdById: req.auth!.userId,
              },
            });

            await tx.entryState.create({
              data: {
                entryId: newEntry.id,
                status: 'draft',
                draftVersionId: version.id,
              },
            });
          });

          stats.entries.created++;
        }
      }
    }

    // Upsert assets metadata
    if (importData.assets && Array.isArray(importData.assets)) {
      for (const a of (importData.assets as Array<Record<string, unknown>>)) {
        const existingAsset = a.id
          ? await prisma.asset.findFirst({ where: { id: a.id as string, spaceId } })
          : null;

        if (existingAsset) {
          await prisma.asset.update({
            where: { id: existingAsset.id },
            data: {
              filename: a.filename as string,
              mimeType: a.mimeType as string,
              bytes: a.bytes as number,
              width: (a.width as number | null) ?? null,
              height: (a.height as number | null) ?? null,
              alt: (a.alt as string | null) ?? null,
              caption: (a.caption as string | null) ?? null,
              storageKey: a.storageKey as string,
              checksum: (a.checksum as string | null) ?? null,
            },
          });
          stats.assets.updated++;
        } else {
          await prisma.asset.create({
            data: {
              spaceId,
              filename: a.filename as string,
              mimeType: a.mimeType as string,
              bytes: a.bytes as number,
              width: (a.width as number | null) ?? null,
              height: (a.height as number | null) ?? null,
              alt: (a.alt as string | null) ?? null,
              caption: (a.caption as string | null) ?? null,
              storageKey: a.storageKey as string,
              checksum: (a.checksum as string | null) ?? null,
              createdById: req.auth!.userId,
            },
          });
          stats.assets.created++;
        }
      }
    }

    res.json({ message: 'Import completed successfully', stats });
  } catch (err) {
    res.status(500).json({ error: 'import_failed', message: (err as Error).message });
  }
});

// ─── POST /import/csv ───
router.post('/import/csv', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const { contentTypeKey, csv } = req.body as { contentTypeKey?: string; csv?: string };

  if (!contentTypeKey || !csv) {
    res.status(400).json({ error: 'validation_error', message: 'contentTypeKey and csv (string) are required' });
    return;
  }

  const contentType = await prisma.contentType.findUnique({
    where: { spaceId_key: { spaceId, key: contentTypeKey } },
    include: { fields: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!contentType) {
    res.status(404).json({ error: 'not_found', message: `Content type "${contentTypeKey}" not found` });
    return;
  }

  // Parse CSV
  const lines = csv.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length < 2) {
    res.status(400).json({ error: 'validation_error', message: 'CSV must have a header row and at least one data row' });
    return;
  }

  const headers = parseCSVLine(lines[0]);
  const fieldKeySet = new Set(contentType.fields.map((f) => f.key));
  const validHeaders = headers.filter((h) => fieldKeySet.has(h) || h === 'slug');

  if (validHeaders.length === 0) {
    res.status(400).json({
      error: 'validation_error',
      message: `No CSV headers match content type fields. Available fields: ${contentType.fields.map((f) => f.key).join(', ')}`,
    });
    return;
  }

  const created: string[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, unknown> = {};
      let slug = '';

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const value = values[j] ?? '';

        if (header === 'slug') {
          slug = value;
        } else if (fieldKeySet.has(header)) {
          row[header] = coerceValue(value, contentType.fields.find((f) => f.key === header)?.type ?? 'text');
        }
      }

      if (!slug) {
        slug = `import-${Date.now()}-${i}`;
      }

      const etag = generateEtag();

      await prisma.$transaction(async (tx) => {
        const newEntry = await tx.entry.create({
          data: { spaceId, contentTypeId: contentType.id, slug },
        });

        const version = await tx.entryVersion.create({
          data: {
            entryId: newEntry.id,
            kind: 'draft',
            data: row as object,
            etag,
            createdById: req.auth!.userId,
          },
        });

        await tx.entryState.create({
          data: {
            entryId: newEntry.id,
            status: 'draft',
            draftVersionId: version.id,
          },
        });

        created.push(newEntry.id);
      });
    } catch (err) {
      errors.push({ row: i + 1, error: (err as Error).message });
    }
  }

  res.json({
    message: `CSV import completed`,
    created: created.length,
    errors,
  });
});

// ─── POST /import/json ───
router.post('/import/json', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const { contentTypeKey, items } = req.body as { contentTypeKey?: string; items?: unknown[] };

  if (!contentTypeKey || !items || !Array.isArray(items)) {
    res.status(400).json({ error: 'validation_error', message: 'contentTypeKey and items (array) are required' });
    return;
  }

  const contentType = await prisma.contentType.findUnique({
    where: { spaceId_key: { spaceId, key: contentTypeKey } },
    include: { fields: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!contentType) {
    res.status(404).json({ error: 'not_found', message: `Content type "${contentTypeKey}" not found` });
    return;
  }

  const fieldKeySet = new Set(contentType.fields.map((f) => f.key));
  const created: string[] = [];
  const errors: { index: number; error: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const item = items[i] as Record<string, unknown>;
      const slug = (item.slug as string) ?? `import-${Date.now()}-${i}`;
      const data: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(item)) {
        if (key === 'slug') continue;
        if (fieldKeySet.has(key)) {
          data[key] = value;
        }
      }

      const etag = generateEtag();

      await prisma.$transaction(async (tx) => {
        const newEntry = await tx.entry.create({
          data: { spaceId, contentTypeId: contentType.id, slug },
        });

        const version = await tx.entryVersion.create({
          data: {
            entryId: newEntry.id,
            kind: 'draft',
            data: JSON.parse(JSON.stringify(data)),
            etag,
            createdById: req.auth!.userId,
          },
        });

        await tx.entryState.create({
          data: {
            entryId: newEntry.id,
            status: 'draft',
            draftVersionId: version.id,
          },
        });

        created.push(newEntry.id);
      });
    } catch (err) {
      errors.push({ index: i, error: (err as Error).message });
    }
  }

  res.json({
    message: `JSON import completed`,
    created: created.length,
    errors,
  });
});

// ─── CSV Helpers ───

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

function coerceValue(value: string, fieldType: string): unknown {
  if (value === '') return null;

  switch (fieldType) {
    case 'number':
      return parseFloat(value) || 0;
    case 'boolean':
      return value.toLowerCase() === 'true' || value === '1';
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    case 'date':
      return value;
    default:
      return value;
  }
}

export default router;
