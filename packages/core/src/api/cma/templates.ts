/**
 * Template marketplace CMA endpoints.
 *
 * GET    /templates             — list all templates (free + premium)
 * GET    /templates/:key        — single template details with field/type preview
 * GET    /templates/:key/preview — dry-run: what the template would create
 * POST   /templates/:key/apply  — apply template to the current space
 * POST   /templates/:key/purchase — purchase stub (logs + returns success)
 */

import { Router } from 'express';
import type { Router as IRouter, Request, Response } from 'express';
import { prisma } from '../../db.js';
import {
  listAllTemplates,
  getTemplate,
  isPremiumTemplate,
  getPremiumTemplate,
} from '../../spaces/template-registry.js';
import type { PremiumTemplate } from '../../spaces/template-registry.js';
import type { SampleEntry } from '../../spaces/premium-templates.js';

const router: IRouter = Router();

// ─── Helpers ────────────────────────────────────────────────────────

function getSpaceId(req: Request): string | undefined {
  return (req.headers['x-space-id'] as string | undefined);
}

// ─── GET /templates ─────────────────────────────────────────────────
// List all templates with lightweight metadata.
router.get('/', async (_req: Request, res: Response) => {
  const items = listAllTemplates();
  res.json({ items, total: items.length });
});

// ─── GET /templates/:key ────────────────────────────────────────────
// Full template details including content types, fields, and sample entry count.
router.get('/:key', async (req: Request, res: Response) => {
  const template = getTemplate(req.params.key as string);

  if (!template) {
    res.status(404).json({ error: 'not_found', message: `Template "${req.params.key}" not found` });
    return;
  }

  const premium = isPremiumTemplate(template.key);
  const detail: Record<string, unknown> = {
    key: template.key,
    name: template.name,
    description: template.description,
    premium,
    contentTypes: template.contentTypes.map((ct) => ({
      key: ct.key,
      name: ct.name,
      description: ct.description,
      fields: ct.fields.map((f) => ({
        key: f.key,
        name: f.name,
        type: f.type,
        required: f.required ?? false,
        localized: f.localized ?? false,
      })),
    })),
    taxonomies: template.taxonomies,
    locales: template.locales,
  };

  if (premium) {
    const p = template as PremiumTemplate;
    detail.price = p.price;
    detail.currency = p.currency;
    detail.features = p.features;
    detail.previewUrl = p.previewUrl;
    detail.sampleEntryCount = p.sampleEntries.length;
    detail.readme = p.readme;
  }

  res.json(detail);
});

// ─── GET /templates/:key/preview ────────────────────────────────────
// Dry-run: returns everything the template would create, without touching the DB.
router.get('/:key/preview', async (req: Request, res: Response) => {
  const template = getTemplate(req.params.key as string);

  if (!template) {
    res.status(404).json({ error: 'not_found', message: `Template "${req.params.key}" not found` });
    return;
  }

  const premium = isPremiumTemplate(template.key);

  const preview: Record<string, unknown> = {
    key: template.key,
    name: template.name,
    wouldCreate: {
      contentTypes: template.contentTypes.map((ct) => ({
        key: ct.key,
        name: ct.name,
        fieldCount: ct.fields.length,
        fields: ct.fields.map((f) => ({ key: f.key, type: f.type })),
      })),
      taxonomies: template.taxonomies.map((tx) => ({
        key: tx.key,
        name: tx.name,
        hierarchical: tx.hierarchical ?? false,
      })),
      locales: template.locales.map((l) => ({
        code: l.code,
        name: l.name,
        isDefault: l.isDefault ?? false,
      })),
      sampleEntries: [],
    },
  };

  if (premium) {
    const p = template as PremiumTemplate;
    const entries = p.sampleEntries.map((e) => ({
      contentTypeKey: e.contentTypeKey,
      slug: e.slug,
      fieldKeys: Object.keys(e.data),
    }));
    (preview.wouldCreate as Record<string, unknown>).sampleEntries = entries;
  }

  res.json(preview);
});

// ─── POST /templates/:key/apply ─────────────────────────────────────
// Apply a template to an existing space (identified by X-Space-Id header).
// Creates content types, fields, taxonomies, locales, and sample entries.
router.post('/:key/apply', async (req: Request, res: Response) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'X-Space-Id header is required' });
    return;
  }

  const space = await prisma.space.findUnique({ where: { id: spaceId } });
  if (!space) {
    res.status(404).json({ error: 'not_found', message: 'Space not found' });
    return;
  }

  const template = getTemplate(req.params.key as string);
  if (!template) {
    res.status(404).json({ error: 'not_found', message: `Template "${req.params.key}" not found` });
    return;
  }

  const created = {
    contentTypes: 0,
    fields: 0,
    taxonomies: 0,
    locales: 0,
    entries: 0,
  };

  // ── Locales ──
  for (const locale of template.locales) {
    const exists = await prisma.locale.findUnique({
      where: { spaceId_code: { spaceId, code: locale.code } },
    });
    if (!exists) {
      await prisma.locale.create({
        data: {
          spaceId,
          code: locale.code,
          name: locale.name,
          isDefault: locale.isDefault ?? false,
        },
      });
      created.locales++;
    }
  }

  // ── Content types + fields ──
  const contentTypeIdMap: Record<string, string> = {};

  for (const ct of template.contentTypes) {
    let contentType = await prisma.contentType.findUnique({
      where: { spaceId_key: { spaceId, key: ct.key } },
    });

    if (!contentType) {
      contentType = await prisma.contentType.create({
        data: {
          spaceId,
          key: ct.key,
          name: ct.name,
          description: ct.description ?? null,
        },
      });
      created.contentTypes++;
    }

    contentTypeIdMap[ct.key] = contentType.id;

    for (const field of ct.fields) {
      const exists = await prisma.field.findUnique({
        where: { contentTypeId_key: { contentTypeId: contentType.id, key: field.key } },
      });
      if (!exists) {
        await prisma.field.create({
          data: {
            contentTypeId: contentType.id,
            key: field.key,
            name: field.name,
            type: field.type,
            required: field.required ?? false,
            unique: field.unique ?? false,
            localized: field.localized ?? false,
            sortOrder: field.sortOrder,
            validations: field.validations ? JSON.parse(JSON.stringify(field.validations)) as object : undefined,
            enumValues: field.enumValues ? JSON.parse(JSON.stringify(field.enumValues)) as object : undefined,
            referenceTarget: field.referenceTarget ?? undefined,
          },
        });
        created.fields++;
      }
    }
  }

  // ── Taxonomies ──
  for (const tax of template.taxonomies) {
    const exists = await prisma.taxonomy.findUnique({
      where: { spaceId_key: { spaceId, key: tax.key } },
    });
    if (!exists) {
      await prisma.taxonomy.create({
        data: {
          spaceId,
          key: tax.key,
          name: tax.name,
          hierarchical: tax.hierarchical ?? false,
        },
      });
      created.taxonomies++;
    }
  }

  // ── Sample entries (premium only) ──
  const premium = isPremiumTemplate(template.key);
  if (premium) {
    const p = template as PremiumTemplate;
    const userId = req.auth?.userId;

    for (const sample of p.sampleEntries) {
      const contentTypeId = contentTypeIdMap[sample.contentTypeKey];
      if (!contentTypeId) continue;

      // Skip if entry with this slug already exists for this content type
      const exists = await prisma.entry.findUnique({
        where: {
          spaceId_contentTypeId_slug: { spaceId, contentTypeId, slug: sample.slug },
        },
      });
      if (exists) continue;

      await createSampleEntry(spaceId, contentTypeId, sample, userId);
      created.entries++;
    }
  }

  res.status(200).json({
    message: `Template "${template.name}" applied successfully`,
    templateKey: template.key,
    premium,
    created,
  });
});

// ─── POST /templates/:key/purchase ──────────────────────────────────
// Stub endpoint for purchasing a premium template.
// In production this would integrate with Stripe or similar.
router.post('/:key/purchase', async (req: Request, res: Response) => {
  if (!req.auth) {
    res.status(401).json({ error: 'authentication_required' });
    return;
  }

  const template = getTemplate(req.params.key as string);
  if (!template) {
    res.status(404).json({ error: 'not_found', message: `Template "${req.params.key}" not found` });
    return;
  }

  if (!isPremiumTemplate(template.key)) {
    res.status(400).json({
      error: 'validation_error',
      message: `Template "${template.key}" is free and does not require purchase`,
    });
    return;
  }

  const p = template as PremiumTemplate;

  // Log the purchase (in production: create a Stripe checkout session)
  console.log(
    `[templates] Purchase: user=${req.auth.userId} template=${p.key} price=$${p.price} ${p.currency}`,
  );

  res.status(200).json({
    message: 'Purchase successful',
    templateKey: p.key,
    price: p.price,
    currency: p.currency,
    purchasedAt: new Date().toISOString(),
    userId: req.auth.userId,
  });
});

// ─── Internal: create a sample entry with its first version ─────────

async function createSampleEntry(
  spaceId: string,
  contentTypeId: string,
  sample: SampleEntry,
  userId?: string,
): Promise<void> {
  const entry = await prisma.entry.create({
    data: {
      spaceId,
      contentTypeId,
      slug: sample.slug,
    },
  });

  // Compute a simple etag
  const dataStr = JSON.stringify(sample.data);
  const { createHash } = await import('crypto');
  const etag = createHash('md5').update(dataStr).digest('hex');

  // We need a user ID for the version. Use the requesting user if available,
  // otherwise look up or skip.
  let creatorId = userId;
  if (!creatorId) {
    // Fallback: find any user (system seeder scenario)
    const anyUser = await prisma.user.findFirst();
    creatorId = anyUser?.id;
  }

  if (!creatorId) {
    // No users in the system — skip version creation
    return;
  }

  const version = await prisma.entryVersion.create({
    data: {
      entryId: entry.id,
      kind: 'draft',
      data: sample.data as object,
      etag,
      createdById: creatorId,
    },
  });

  await prisma.entryState.create({
    data: {
      entryId: entry.id,
      status: 'draft',
      draftVersionId: version.id,
    },
  });
}

export default router;
