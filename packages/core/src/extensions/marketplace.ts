// ─── Marketplace Extension Model ────────────────────────────────────
// Types, registry, and lifecycle for discoverable/installable extensions.

import type { ExtensionManifest } from './manifest.js';
import { loadExtension, removeExtension, getExtension } from './manifest.js';

// ─── Types ──────────────────────────────────────────────────────────

export type MarketplaceCategory =
  | 'ai'
  | 'analytics'
  | 'commerce'
  | 'media'
  | 'seo'
  | 'notifications'
  | 'integration'
  | 'utility';

export interface MarketplaceExtension {
  key: string;
  name: string;
  version: string;
  author: string;
  description: string;
  repository?: string;
  homepage?: string;
  license: string;
  pricing: 'free' | 'paid';
  price?: number;
  category: MarketplaceCategory;
  permissions: string[];
  manifest: ExtensionManifest;
}

// ─── In-memory Catalog ──────────────────────────────────────────────

const catalog = new Map<string, MarketplaceExtension>();

// Track which extensions are installed per space
const installations = new Map<string, Set<string>>();

// ─── Built-in Sample Extensions ─────────────────────────────────────

const builtInExtensions: MarketplaceExtension[] = [
  {
    key: 'seo-meta',
    name: 'SEO Meta Fields',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Adds SEO fields (meta title, meta description, og:image) to any content type. ' +
      'Automatically generates Open Graph and Twitter Card metadata for published entries.',
    repository: 'https://github.com/htmless/ext-seo-meta',
    homepage: 'https://htmless.io/marketplace/seo-meta',
    license: 'MIT',
    pricing: 'free',
    category: 'seo',
    permissions: ['schema.admin', 'entry.read'],
    manifest: {
      key: 'seo-meta',
      name: 'SEO Meta Fields',
      version: '1.0.0',
      description: 'Adds SEO fields to content types',
      fields: [
        {
          contentTypeKey: '*',
          fieldKey: 'seo_title',
          type: 'text',
          config: { maxLength: 60, helpText: 'SEO title (max 60 characters)' },
        },
        {
          contentTypeKey: '*',
          fieldKey: 'seo_description',
          type: 'text',
          config: { maxLength: 160, helpText: 'Meta description (max 160 characters)' },
        },
        {
          contentTypeKey: '*',
          fieldKey: 'seo_og_image',
          type: 'media',
          config: { accept: 'image/*', helpText: 'Open Graph image (1200x630 recommended)' },
        },
      ],
      hooks: [
        {
          event: 'entry.published',
          handler: 'seo-meta:validate-seo',
        },
      ],
    },
  },
  {
    key: 'analytics-tracker',
    name: 'Analytics Tracker',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Subscribes to content lifecycle webhooks and logs content views, publishes, and ' +
      'engagement metrics. Provides a simple analytics dashboard overlay in the admin.',
    repository: 'https://github.com/htmless/ext-analytics-tracker',
    homepage: 'https://htmless.io/marketplace/analytics-tracker',
    license: 'MIT',
    pricing: 'free',
    category: 'analytics',
    permissions: ['entry.read', 'webhook.manage'],
    manifest: {
      key: 'analytics-tracker',
      name: 'Analytics Tracker',
      version: '1.0.0',
      description: 'Webhook subscriber that logs content views and engagement',
      hooks: [
        {
          event: 'entry.published',
          handler: 'analytics-tracker:log-publish',
        },
        {
          event: 'entry.unpublished',
          handler: 'analytics-tracker:log-unpublish',
        },
      ],
      routes: [
        {
          method: 'GET',
          path: '/analytics/views',
          handler: 'analytics-tracker:get-views',
        },
        {
          method: 'POST',
          path: '/analytics/track',
          handler: 'analytics-tracker:track-view',
        },
      ],
    },
  },
  {
    key: 'ai-alt-text',
    name: 'AI Alt Text Generator',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Automatically generates descriptive alt text for uploaded images using AI vision models. ' +
      'Runs on asset.created events and populates the alt field when empty.',
    repository: 'https://github.com/htmless/ext-ai-alt-text',
    homepage: 'https://htmless.io/marketplace/ai-alt-text',
    license: 'MIT',
    pricing: 'free',
    category: 'ai',
    permissions: ['asset.upload', 'entry.read'],
    manifest: {
      key: 'ai-alt-text',
      name: 'AI Alt Text Generator',
      version: '1.0.0',
      description: 'Auto-generates alt text for uploaded images using AI',
      hooks: [
        {
          event: 'asset.created',
          handler: 'ai-alt-text:generate-alt',
        },
        {
          event: 'asset.updated',
          handler: 'ai-alt-text:regenerate-alt',
        },
      ],
      routes: [
        {
          method: 'POST',
          path: '/ai-alt-text/generate',
          handler: 'ai-alt-text:manual-generate',
        },
      ],
    },
  },
];

// Seed the catalog with built-in extensions
for (const ext of builtInExtensions) {
  catalog.set(ext.key, ext);
}

// ─── Catalog API ────────────────────────────────────────────────────

/**
 * List all available marketplace extensions, optionally filtered by category.
 */
export function listAvailable(category?: MarketplaceCategory): MarketplaceExtension[] {
  const all = Array.from(catalog.values());
  if (!category) return all;
  return all.filter((ext) => ext.category === category);
}

/**
 * Get a single marketplace extension by key.
 */
export function getMarketplaceExtension(key: string): MarketplaceExtension | undefined {
  return catalog.get(key);
}

/**
 * Register a new extension in the marketplace catalog.
 */
export function registerMarketplaceExtension(extension: MarketplaceExtension): void {
  catalog.set(extension.key, extension);
}

// ─── Installation Lifecycle ─────────────────────────────────────────

/**
 * Get the set of installed extension keys for a space.
 */
function getSpaceInstallations(spaceId: string): Set<string> {
  let set = installations.get(spaceId);
  if (!set) {
    set = new Set();
    installations.set(spaceId, set);
  }
  return set;
}

/**
 * Check if an extension is installed for a space.
 */
export function isInstalled(spaceId: string, extensionKey: string): boolean {
  return getSpaceInstallations(spaceId).has(extensionKey);
}

/**
 * List installed extension keys for a space.
 */
export function listInstalled(spaceId: string): string[] {
  return Array.from(getSpaceInstallations(spaceId));
}

/**
 * Install a marketplace extension into a space.
 * Validates the extension exists in the catalog, checks permissions,
 * and loads its manifest into the extension runtime.
 */
export async function installExtension(
  spaceId: string,
  extensionKey: string,
): Promise<void> {
  const extension = catalog.get(extensionKey);
  if (!extension) {
    throw new Error(`Extension "${extensionKey}" not found in the marketplace`);
  }

  const installed = getSpaceInstallations(spaceId);
  if (installed.has(extensionKey)) {
    throw new Error(`Extension "${extensionKey}" is already installed in space "${spaceId}"`);
  }

  // Load the extension manifest into the runtime registry
  // (only if not already registered globally — multiple spaces can share one manifest)
  if (!getExtension(extensionKey)) {
    loadExtension(extension.manifest);
  }

  installed.add(extensionKey);
}

/**
 * Uninstall a marketplace extension from a space.
 * Removes the extension from the space's installation set and, if no
 * other spaces are using it, removes from the runtime registry.
 */
export async function uninstallExtension(
  spaceId: string,
  extensionKey: string,
): Promise<void> {
  const installed = getSpaceInstallations(spaceId);
  if (!installed.has(extensionKey)) {
    throw new Error(`Extension "${extensionKey}" is not installed in space "${spaceId}"`);
  }

  installed.delete(extensionKey);

  // Check if any other space still uses this extension
  let stillUsed = false;
  for (const [, set] of installations) {
    if (set.has(extensionKey)) {
      stillUsed = true;
      break;
    }
  }

  // If no space is using it, remove from the runtime registry
  if (!stillUsed) {
    removeExtension(extensionKey);
  }
}
