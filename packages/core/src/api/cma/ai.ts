// ─── AI Endpoints (CMA) ───

import { Router } from 'express';
import type { Router as IRouter, Request, Response } from 'express';
import express from 'express';
import { nanoid } from 'nanoid';
import { prisma } from '../../db.js';
import { generateSchemaFromPrompt } from '../../ai/schema-generator.js';
import type { GeneratedSchema, FieldSpec } from '../../ai/schema-generator.js';
import { analyzeJson } from '../../ai/json-to-schema.js';
import { analyzeLayoutImage } from '../../ai/image-analyzer.js';
import {
  fetchSheetAsCsv,
  sheetToEntries,
  inferFieldsFromCsv,
} from '../../integrations/sheets.js';
import {
  generateSummary,
  generateAltText,
  generateMetadata,
} from '../../ai/content-operations.js';

const router: IRouter = Router();

// ─── Helpers ───────────────────────────────────────────────────────────

function getSpaceId(req: Request): string | undefined {
  return (req.params as Record<string, string>).spaceId ?? (req.headers['x-space-id'] as string | undefined);
}

function generateEtag(): string {
  return nanoid(16);
}

/**
 * Materialize a GeneratedSchema into the database: create content types,
 * fields, and optionally taxonomies.  Returns the IDs of everything created.
 */
async function materializeSchema(
  spaceId: string,
  schema: GeneratedSchema,
  userId: string,
): Promise<{
  contentTypeIds: Record<string, string>;
  fieldIds: Record<string, string[]>;
  taxonomyIds: Record<string, string>;
}> {
  const contentTypeIds: Record<string, string> = {};
  const fieldIds: Record<string, string[]> = {};

  for (const ct of schema.contentTypes) {
    // Upsert content type (skip if already exists)
    let contentType = await prisma.contentType.findUnique({
      where: { spaceId_key: { spaceId, key: ct.key } },
    });

    if (!contentType) {
      contentType = await prisma.contentType.create({
        data: {
          spaceId,
          key: ct.key,
          name: ct.name,
          description: ct.description,
        },
      });
    }

    contentTypeIds[ct.key] = contentType.id;
    fieldIds[ct.key] = [];

    // Create fields that don't already exist
    for (const field of ct.fields) {
      const existing = await prisma.field.findUnique({
        where: { contentTypeId_key: { contentTypeId: contentType.id, key: field.key } },
      });

      if (!existing) {
        const created = await prisma.field.create({
          data: {
            contentTypeId: contentType.id,
            key: field.key,
            name: field.name,
            type: field.type,
            required: field.required,
            unique: field.unique,
            localized: field.localized,
            sortOrder: field.sortOrder,
            ...(field.enumValues && { enumValues: field.enumValues }),
            ...(field.referenceTarget && { referenceTarget: field.referenceTarget }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(field.validations && { validations: field.validations as any }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(field.defaultValue !== undefined && { defaultValue: field.defaultValue as any }),
          },
        });
        fieldIds[ct.key].push(created.id);
      } else {
        fieldIds[ct.key].push(existing.id);
      }
    }

    // Bump content type version
    await prisma.contentType.update({
      where: { id: contentType.id },
      data: { version: { increment: 1 } },
    });
  }

  // Create taxonomies
  const taxonomyIds: Record<string, string> = {};
  if (schema.taxonomies) {
    for (const tax of schema.taxonomies) {
      const existing = await prisma.taxonomy.findUnique({
        where: { spaceId_key: { spaceId, key: tax.key } },
      });

      if (!existing) {
        const created = await prisma.taxonomy.create({
          data: {
            spaceId,
            key: tax.key,
            name: tax.name,
            hierarchical: tax.hierarchical,
          },
        });
        taxonomyIds[tax.key] = created.id;

        // Seed suggested terms
        if (tax.suggestedTerms) {
          for (let i = 0; i < tax.suggestedTerms.length; i++) {
            const termName = tax.suggestedTerms[i];
            const termSlug = termName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');
            await prisma.taxonomyTerm.create({
              data: {
                taxonomyId: created.id,
                name: termName,
                slug: termSlug,
                sortOrder: i,
              },
            }).catch(() => {
              // Ignore duplicate slug conflicts
            });
          }
        }
      } else {
        taxonomyIds[tax.key] = existing.id;
      }
    }
  }

  return { contentTypeIds, fieldIds, taxonomyIds };
}

/**
 * Create entries from an array of data objects.
 */
async function createEntries(
  spaceId: string,
  contentTypeKey: string,
  items: Record<string, unknown>[],
  userId: string,
): Promise<{ created: string[]; skipped: number }> {
  const contentType = await prisma.contentType.findUnique({
    where: { spaceId_key: { spaceId, key: contentTypeKey } },
  });

  if (!contentType) {
    throw new Error(`Content type "${contentTypeKey}" not found`);
  }

  const created: string[] = [];
  let skipped = 0;

  for (const item of items) {
    // Generate a slug from name/title or fallback to nanoid
    const slugSource = (item.slug as string) ??
      (item.title as string) ??
      (item.name as string) ??
      (item.question as string) ??
      nanoid(8);

    const slug = slugSource
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120) || nanoid(8);

    // Check for duplicate slug
    const existing = await prisma.entry.findUnique({
      where: { spaceId_contentTypeId_slug: { spaceId, contentTypeId: contentType.id, slug } },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const etag = generateEtag();

    const entry = await prisma.$transaction(async (tx) => {
      const newEntry = await tx.entry.create({
        data: {
          spaceId,
          contentTypeId: contentType.id,
          slug,
        },
      });

      const version = await tx.entryVersion.create({
        data: {
          entryId: newEntry.id,
          kind: 'draft',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: item as any,
          etag,
          createdById: userId,
        },
      });

      // Auto-publish: create published version and set state to published
      const publishedVersion = await tx.entryVersion.create({
        data: {
          entryId: newEntry.id,
          kind: 'published',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: item as any,
          etag: etag + '_pub',
          createdById: userId,
        },
      });

      await tx.entryState.create({
        data: {
          entryId: newEntry.id,
          status: 'published',
          draftVersionId: version.id,
          publishedVersionId: publishedVersion.id,
        },
      });

      return newEntry;
    });

    created.push(entry.id);
  }

  return { created, skipped };
}

// ════════════════════════════════════════════════════════════════════════
// Feature 1: AI Schema Generation from Natural Language
// ════════════════════════════════════════════════════════════════════════

// ── POST /ai/generate-schema ──
router.post('/generate-schema', async (req: Request, res: Response): Promise<void> => {
  const { prompt, autoCreate, spaceId: bodySpaceId } = req.body as {
    prompt?: string;
    autoCreate?: boolean;
    spaceId?: string;
  };

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'validation_error', message: 'prompt string is required' });
    return;
  }

  try {
    const schema = await generateSchemaFromPrompt(prompt);

    // If autoCreate, materialize the schema into the database
    if (autoCreate) {
      const spaceId = bodySpaceId ?? getSpaceId(req);
      if (!spaceId) {
        res.status(400).json({ error: 'validation_error', message: 'spaceId is required for autoCreate' });
        return;
      }

      const ids = await materializeSchema(spaceId, schema, req.auth!.userId);

      // Also create sample entries for key content types
      const entryResults: Record<string, number> = {};
      const sampleData: Record<string, Record<string, unknown>[]> = {
        homepage: [{ heroTitle: 'We Build What Matters', heroSubtitle: 'Quality service. Real results. No shortcuts.', ctaPrimary: 'Get Started', ctaSecondary: 'Learn More', phone: '(555) 000-0000', email: 'hello@yourbusiness.com', address: '123 Main St', whyChooseUs: [{ label: 'Licensed & Insured' }, { label: 'Fast Response' }, { label: 'Satisfaction Guaranteed' }, { label: 'Free Estimates' }, { label: '24/7 Support' }, { label: 'Trusted Since 2010' }], businessName: 'Your Business', stats: [{ value: '500+', label: 'Projects' }, { value: '99%', label: 'Satisfaction' }, { value: '15+', label: 'Years' }, { value: '24/7', label: 'Support' }] }],
        service: [
          { title: 'Consultation', description: 'Free initial consultation to understand your needs and goals.', icon: '💬', sortOrder: 1 },
          { title: 'Custom Solutions', description: 'Tailored strategies designed specifically for your business.', icon: '⚡', sortOrder: 2 },
          { title: 'Implementation', description: 'Expert execution with clear timelines and milestones.', icon: '🚀', sortOrder: 3 },
          { title: 'Quality Assurance', description: 'Rigorous testing and review before delivery.', icon: '✅', sortOrder: 4 },
          { title: 'Ongoing Support', description: 'Dedicated support team available when you need us.', icon: '🛟', sortOrder: 5 },
          { title: 'Growth Strategy', description: 'Data-driven planning to scale your success.', icon: '📈', sortOrder: 6 },
        ],
        testimonial: [
          { author: 'Alex M.', company: 'CEO, TechCorp', quote: 'Outstanding work. They delivered exactly what we needed, on time.', rating: 5 },
          { author: 'Sarah K.', company: 'Director, StartupXYZ', quote: 'Professional, responsive, and easy to work with. Highly recommend.', rating: 5 },
          { author: 'David R.', company: 'Founder, GrowthCo', quote: 'The best investment we made this year. Results speak for themselves.', rating: 5 },
        ],
        faq: [
          { question: 'How do I get started?', answer: 'Contact us for a free consultation. We will discuss your needs and create a plan.' },
          { question: 'What is included?', answer: 'Every project includes planning, implementation, testing, and ongoing support.' },
          { question: 'How long does it take?', answer: 'Timelines vary by project. Most are completed within 2-6 weeks.' },
          { question: 'Do you offer guarantees?', answer: 'Yes, we stand behind our work with a satisfaction guarantee on every project.' },
        ],
      };

      for (const [typeKey, items] of Object.entries(sampleData)) {
        if (ids.contentTypeIds[typeKey]) {
          try {
            const result = await createEntries(spaceId, typeKey, items, req.auth!.userId);
            entryResults[typeKey] = result.created.length;
          } catch {
            // Type might not match exactly, skip silently
          }
        }
      }

      res.status(201).json({ ...schema, created: ids, entries: entryResults });
      return;
    }

    res.json(schema);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Schema generation failed';
    res.status(500).json({ error: 'ai_error', message });
  }
});

// ════════════════════════════════════════════════════════════════════════
// Feature 2: Paste JSON → Full Backend Instantly
// ════════════════════════════════════════════════════════════════════════

// ── POST /ai/from-json ──
router.post('/from-json', async (req: Request, res: Response): Promise<void> => {
  const { json, typeName, autoCreate } = req.body as {
    json?: unknown;
    typeName?: string;
    autoCreate?: boolean;
  };

  if (json === undefined || json === null) {
    res.status(400).json({ error: 'validation_error', message: 'json field is required' });
    return;
  }

  try {
    const result = analyzeJson(json, typeName);

    if (autoCreate) {
      const spaceId = getSpaceId(req);
      if (!spaceId) {
        res.status(400).json({ error: 'validation_error', message: 'spaceId is required for autoCreate' });
        return;
      }

      // Create the schema
      const ids = await materializeSchema(spaceId, result, req.auth!.userId);

      // Import entries
      const primaryKey = result.contentTypes[0]?.key;
      let importResult: { created: string[]; skipped: number } = { created: [], skipped: 0 };

      if (primaryKey && result.sampleEntries.length > 0) {
        importResult = await createEntries(
          spaceId,
          primaryKey,
          result.sampleEntries,
          req.auth!.userId,
        );
      }

      res.status(201).json({
        ...result,
        created: ids,
        imported: importResult,
      });
      return;
    }

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'JSON analysis failed';
    res.status(500).json({ error: 'ai_error', message });
  }
});

// ════════════════════════════════════════════════════════════════════════
// Feature 3: Google Sheets → CMS Sync
// ════════════════════════════════════════════════════════════════════════

// ── POST /ai/from-sheet ──
router.post('/from-sheet', async (req: Request, res: Response): Promise<void> => {
  const { url, contentTypeKey, autoCreate, fieldMapping } = req.body as {
    url?: string;
    contentTypeKey?: string;
    autoCreate?: boolean;
    fieldMapping?: Record<string, string>;
  };

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'validation_error', message: 'url string is required' });
    return;
  }

  try {
    // Fetch the CSV data
    const csv = await fetchSheetAsCsv(url);

    // Infer field types from the data
    const inferredFields = inferFieldsFromCsv(csv);

    // Build a content type key
    const typeKey = contentTypeKey ??
      url
        .match(/\/spreadsheets\/d\/[^/]+/)?.[0]
        ?.split('/')
        .pop()
        ?.slice(0, 20)
        ?.toLowerCase() ??
      'sheet-import';

    // Convert rows to entries
    const { entries, unmappedColumns, headers } = sheetToEntries(
      csv,
      typeKey,
      fieldMapping,
    );

    // Build schema from inferred fields
    const fields: FieldSpec[] = inferredFields.map((f, i) => ({
      key: f.key,
      name: f.name,
      type: f.type,
      required: i === 0,
      localized: false,
      unique: f.key === 'slug',
      sortOrder: i,
    }));

    const schema: GeneratedSchema = {
      contentTypes: [
        {
          key: typeKey,
          name: typeKey
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          description: `Imported from Google Sheets (${entries.length} rows)`,
          fields,
        },
      ],
      suggestedTemplateName: `${typeKey}-template`,
    };

    if (autoCreate) {
      const spaceId = getSpaceId(req);
      if (!spaceId) {
        res.status(400).json({ error: 'validation_error', message: 'spaceId is required for autoCreate' });
        return;
      }

      const ids = await materializeSchema(spaceId, schema, req.auth!.userId);

      let importResult: { created: string[]; skipped: number } = { created: [], skipped: 0 };
      if (entries.length > 0) {
        importResult = await createEntries(
          spaceId,
          typeKey,
          entries,
          req.auth!.userId,
        );
      }

      res.status(201).json({
        schema,
        headers,
        unmappedColumns,
        inferredFields,
        entryCount: entries.length,
        created: ids,
        imported: importResult,
      });
      return;
    }

    res.json({
      schema,
      headers,
      unmappedColumns,
      inferredFields,
      entries,
      entryCount: entries.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sheet import failed';
    res.status(500).json({ error: 'ai_error', message });
  }
});

// ════════════════════════════════════════════════════════════════════════
// Feature 4: Image Layout → Schema/Website Generation
// ════════════════════════════════════════════════════════════════════════

// ── POST /ai/from-image ──
router.post(
  '/from-image',
  express.raw({ type: () => true, limit: '20mb' }),
  async (req: Request, res: Response): Promise<void> => {
    const filename = req.headers['x-filename'] as string | undefined;
    const mimeType = req.headers['content-type'] as string | undefined;

    const buffer = req.body as Buffer;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Request body must be a non-empty image buffer. Set Content-Type and X-Filename headers.',
      });
      return;
    }

    try {
      const analysis = await analyzeLayoutImage(
        buffer,
        mimeType ?? 'image/png',
        filename,
      );

      const autoCreate = req.query.autoCreate === 'true' || req.query.autoCreate === '1';

      if (autoCreate) {
        const spaceId = getSpaceId(req);
        if (!spaceId) {
          res.status(400).json({ error: 'validation_error', message: 'spaceId is required for autoCreate' });
          return;
        }

        // 1. Create all content types + fields
        const ids = await materializeSchema(
          spaceId,
          analysis.suggestedSchema,
          req.auth!.userId,
        );

        // 2. Create sample entries for each content type
        const entries = analysis.sampleEntries;
        const createdEntries: Record<string, { created: string[]; skipped: number }> = {};

        // Homepage entry
        try {
          createdEntries.homepage = await createEntries(
            spaceId,
            'homepage',
            [entries.homepage],
            req.auth!.userId,
          );
        } catch {
          createdEntries.homepage = { created: [], skipped: 0 };
        }

        // Service entries
        if (entries.services.length > 0) {
          try {
            createdEntries.services = await createEntries(
              spaceId,
              'service',
              entries.services,
              req.auth!.userId,
            );
          } catch {
            createdEntries.services = { created: [], skipped: 0 };
          }
        }

        // Gallery item entries
        if (entries.galleryItems.length > 0) {
          try {
            createdEntries.galleryItems = await createEntries(
              spaceId,
              'gallery-item',
              entries.galleryItems,
              req.auth!.userId,
            );
          } catch {
            createdEntries.galleryItems = { created: [], skipped: 0 };
          }
        }

        // Testimonial entries
        if (entries.testimonials.length > 0) {
          try {
            createdEntries.testimonials = await createEntries(
              spaceId,
              'testimonial',
              entries.testimonials,
              req.auth!.userId,
            );
          } catch {
            createdEntries.testimonials = { created: [], skipped: 0 };
          }
        }

        // Team member entries
        if (entries.teamMembers.length > 0) {
          try {
            createdEntries.teamMembers = await createEntries(
              spaceId,
              'team-member',
              entries.teamMembers,
              req.auth!.userId,
            );
          } catch {
            createdEntries.teamMembers = { created: [], skipped: 0 };
          }
        }

        // FAQ entries
        if (entries.faqs.length > 0) {
          try {
            createdEntries.faqs = await createEntries(
              spaceId,
              'faq',
              entries.faqs,
              req.auth!.userId,
            );
          } catch {
            createdEntries.faqs = { created: [], skipped: 0 };
          }
        }

        res.status(201).json({
          ...analysis,
          created: ids,
          createdEntries,
        });
        return;
      }

      res.json(analysis);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image analysis failed';
      res.status(500).json({ error: 'ai_error', message });
    }
  },
);

// ════════════════════════════════════════════════════════════════════════
// Existing AI content helpers
// ════════════════════════════════════════════════════════════════════════

// ── POST /ai/summarize ──
router.post('/summarize', async (req: Request, res: Response): Promise<void> => {
  const { text } = req.body as { text?: string };

  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'validation_error', message: 'text string is required' });
    return;
  }

  try {
    const summary = await generateSummary(text);
    res.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Summarization failed';
    res.status(500).json({ error: 'ai_error', message });
  }
});

// ── POST /ai/alt-text ──
router.post('/alt-text', async (req: Request, res: Response): Promise<void> => {
  const { filename, mimeType } = req.body as { filename?: string; mimeType?: string };

  if (!filename || typeof filename !== 'string') {
    res.status(400).json({ error: 'validation_error', message: 'filename string is required' });
    return;
  }

  try {
    const altText = await generateAltText(filename, mimeType ?? 'image/jpeg');
    res.json({ altText });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Alt text generation failed';
    res.status(500).json({ error: 'ai_error', message });
  }
});

// ── POST /ai/metadata ──
router.post('/metadata', async (req: Request, res: Response): Promise<void> => {
  const { data } = req.body as { data?: Record<string, unknown> };

  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'validation_error', message: 'data object is required' });
    return;
  }

  try {
    const metadata = await generateMetadata(data);
    res.json(metadata);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Metadata generation failed';
    res.status(500).json({ error: 'ai_error', message });
  }
});

export default router;
