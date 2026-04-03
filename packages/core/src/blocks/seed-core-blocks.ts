import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { coreBlocks } from './core-blocks.js';

/**
 * Upserts all 7 core block definitions into a space.
 * Marks them builtIn=true so they cannot be accidentally deleted via the API.
 */
export async function seedCoreBlocks(spaceId: string): Promise<void> {
  for (const block of coreBlocks) {
    await prisma.blockDefinition.upsert({
      where: {
        spaceId_key_version: {
          spaceId,
          key: block.key,
          version: '1.0.0',
        },
      },
      update: {
        title: block.title,
        description: block.description,
        icon: block.icon,
        attributesSchema: JSON.parse(JSON.stringify(block.attributesSchema)),
        builtIn: true,
      },
      create: {
        spaceId,
        key: block.key,
        version: '1.0.0',
        title: block.title,
        description: block.description,
        icon: block.icon,
        attributesSchema: JSON.parse(JSON.stringify(block.attributesSchema)),
        builtIn: true,
      },
    });
  }
}
