import { prisma } from '../db.js';
import { getTemplate, isPremiumTemplate, getPremiumTemplate } from './template-registry.js';
import { seedCoreBlocks } from '../blocks/seed-core-blocks.js';
import type { Space } from '@prisma/client';
import { createHash } from 'crypto';

/**
 * Provisions a new space with an optional template.
 *
 * Creates:
 *  - The Space row
 *  - A default locale (en)
 *  - An admin role binding for the calling user (if userId is provided)
 *  - If a templateKey is specified, the full template (content types, fields, taxonomies, locales)
 *  - Core block definitions
 */
export async function provisionSpace(
  name: string,
  slug: string,
  options?: { templateKey?: string; userId?: string },
): Promise<Space> {
  const { templateKey, userId } = options ?? {};

  // Create the space
  const space = await prisma.space.create({
    data: { name, slug },
  });

  const template = templateKey ? getTemplate(templateKey) : undefined;

  // Locales — use template locales or default to English
  const locales = template?.locales ?? [{ code: 'en', name: 'English', isDefault: true }];
  for (const locale of locales) {
    await prisma.locale.create({
      data: {
        spaceId: space.id,
        code: locale.code,
        name: locale.name,
        isDefault: locale.isDefault ?? false,
      },
    });
  }

  // Bind calling user as admin (if provided)
  if (userId) {
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    if (adminRole) {
      await prisma.roleBinding.create({
        data: {
          userId,
          roleId: adminRole.id,
          spaceId: space.id,
        },
      });
    }
  }

  // Create default environment
  await prisma.environment.create({
    data: {
      spaceId: space.id,
      name: 'Production',
      slug: 'production',
      isDefault: true,
    },
  });

  // Apply template content types, fields, and taxonomies
  if (template) {
    for (const ct of template.contentTypes) {
      const contentType = await prisma.contentType.create({
        data: {
          spaceId: space.id,
          key: ct.key,
          name: ct.name,
          description: ct.description ?? null,
        },
      });

      for (const field of ct.fields) {
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
            validations: field.validations ? JSON.parse(JSON.stringify(field.validations)) as any : undefined,
            enumValues: field.enumValues ? JSON.parse(JSON.stringify(field.enumValues)) as any : undefined,
            referenceTarget: field.referenceTarget ?? undefined,
          },
        });
      }
    }

    for (const tax of template.taxonomies) {
      await prisma.taxonomy.create({
        data: {
          spaceId: space.id,
          key: tax.key,
          name: tax.name,
          hierarchical: tax.hierarchical ?? false,
        },
      });
    }

    // Seed sample entries for premium templates
    if (templateKey && isPremiumTemplate(templateKey)) {
      const premiumTpl = getPremiumTemplate(templateKey);
      if (premiumTpl) {
        // Build a map from content type key -> database id
        const ctMap: Record<string, string> = {};
        for (const ct of template.contentTypes) {
          const row = await prisma.contentType.findUnique({
            where: { spaceId_key: { spaceId: space.id, key: ct.key } },
          });
          if (row) ctMap[ct.key] = row.id;
        }

        for (const sample of premiumTpl.sampleEntries) {
          const contentTypeId = ctMap[sample.contentTypeKey];
          if (!contentTypeId) continue;

          const entry = await prisma.entry.create({
            data: { spaceId: space.id, contentTypeId, slug: sample.slug },
          });

          if (userId) {
            const dataStr = JSON.stringify(sample.data);
            const etag = createHash('md5').update(dataStr).digest('hex');

            const version = await prisma.entryVersion.create({
              data: {
                entryId: entry.id,
                kind: 'draft',
                data: sample.data as object,
                etag,
                createdById: userId,
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
        }
      }
    }
  }

  // Seed core block definitions
  await seedCoreBlocks(space.id);

  return space;
}
