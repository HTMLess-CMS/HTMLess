import { prisma } from '../db.js';

/**
 * White-label configuration for a space.
 * Stored as JSON in the Space.whiteLabelConfig column.
 */
export interface WhiteLabelConfig {
  brandName: string;
  logoUrl?: string;
  primaryColor?: string;
  favicon?: string;
  customDomain?: string;
}

/**
 * Retrieve the white-label config for a space. Returns null if none is set.
 */
export async function getWhiteLabelConfig(spaceId: string): Promise<WhiteLabelConfig | null> {
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { whiteLabelConfig: true },
  });

  if (!space?.whiteLabelConfig) return null;

  return space.whiteLabelConfig as unknown as WhiteLabelConfig;
}

/**
 * Update (or set) the white-label config for a space.
 */
export async function updateWhiteLabelConfig(
  spaceId: string,
  config: Partial<WhiteLabelConfig>,
): Promise<WhiteLabelConfig> {
  const existing = await getWhiteLabelConfig(spaceId);

  const merged: WhiteLabelConfig = {
    brandName: config.brandName ?? existing?.brandName ?? 'HTMLess',
    logoUrl: config.logoUrl !== undefined ? config.logoUrl : existing?.logoUrl,
    primaryColor: config.primaryColor !== undefined ? config.primaryColor : existing?.primaryColor,
    favicon: config.favicon !== undefined ? config.favicon : existing?.favicon,
    customDomain: config.customDomain !== undefined ? config.customDomain : existing?.customDomain,
  };

  await prisma.space.update({
    where: { id: spaceId },
    data: { whiteLabelConfig: JSON.parse(JSON.stringify(merged)) as any },
  });

  return merged;
}
