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
  pricing: 'free' | 'paid' | 'freemium';
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
  // ── SEO (2) ──────────────────────────────────────────────────────

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
    key: 'sitemap-generator',
    name: 'Sitemap Generator',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Automatically generates an XML sitemap from all published entries. Updates on publish/unpublish events and serves at /sitemap.xml via the CDA.',
    repository: 'https://github.com/htmless/ext-sitemap-generator',
    homepage: 'https://htmless.io/marketplace/sitemap-generator',
    license: 'MIT',
    pricing: 'free',
    category: 'seo',
    permissions: ['entry.read'],
    manifest: {
      key: 'sitemap-generator',
      name: 'Sitemap Generator',
      version: '1.0.0',
      description: 'Auto-generates XML sitemap from published content',
      hooks: [
        { event: 'entry.published', handler: 'sitemap-generator:rebuild' },
        { event: 'entry.unpublished', handler: 'sitemap-generator:rebuild' },
      ],
      routes: [
        { method: 'GET', path: '/sitemap.xml', handler: 'sitemap-generator:serve' },
        { method: 'POST', path: '/sitemap/rebuild', handler: 'sitemap-generator:force-rebuild' },
      ],
    },
  },

  {
    key: 'structured-data',
    name: 'Structured Data (JSON-LD)',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Injects Schema.org JSON-LD structured data into published entries. Supports Article, Product, FAQ, and BreadcrumbList schemas. Configurable per content type.',
    repository: 'https://github.com/htmless/ext-structured-data',
    homepage: 'https://htmless.io/marketplace/structured-data',
    license: 'MIT',
    pricing: 'free',
    category: 'seo',
    permissions: ['entry.read', 'schema.admin'],
    manifest: {
      key: 'structured-data',
      name: 'Structured Data (JSON-LD)',
      version: '1.0.0',
      description: 'Adds Schema.org JSON-LD to published entries',
      hooks: [
        { event: 'entry.published', handler: 'structured-data:generate-ld' },
      ],
      routes: [
        { method: 'GET', path: '/structured-data/preview', handler: 'structured-data:preview' },
      ],
      fields: [
        {
          contentTypeKey: '*',
          fieldKey: 'jsonld_type',
          type: 'text',
          config: { helpText: 'Schema.org type: Article, Product, FAQ, etc.' },
        },
      ],
    },
  },

  // ── Analytics (3) ────────────────────────────────────────────────

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
        { event: 'entry.published', handler: 'analytics-tracker:log-publish' },
        { event: 'entry.unpublished', handler: 'analytics-tracker:log-unpublish' },
      ],
      routes: [
        { method: 'GET', path: '/analytics/views', handler: 'analytics-tracker:get-views' },
        { method: 'POST', path: '/analytics/track', handler: 'analytics-tracker:track-view' },
      ],
    },
  },

  {
    key: 'page-views',
    name: 'Page Views Tracker',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Tracks CDA read requests per entry and provides page view counts, trending content, and historical view data. Lightweight alternative to full analytics.',
    repository: 'https://github.com/htmless/ext-page-views',
    homepage: 'https://htmless.io/marketplace/page-views',
    license: 'MIT',
    pricing: 'free',
    category: 'analytics',
    permissions: ['entry.read'],
    manifest: {
      key: 'page-views',
      name: 'Page Views Tracker',
      version: '1.0.0',
      description: 'Tracks CDA read requests and provides page view counts',
      hooks: [
        { event: 'entry.read', handler: 'page-views:increment' },
      ],
      routes: [
        { method: 'GET', path: '/views/top', handler: 'page-views:top-pages' },
        { method: 'GET', path: '/views/entry', handler: 'page-views:entry-views' },
        { method: 'GET', path: '/views/history', handler: 'page-views:history' },
      ],
    },
  },

  {
    key: 'content-performance',
    name: 'Content Performance',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Advanced content engagement metrics: time-on-page estimates, scroll depth, bounce rate, and conversion tracking. Dashboard widget shows top-performing content.',
    repository: 'https://github.com/htmless/ext-content-performance',
    homepage: 'https://htmless.io/marketplace/content-performance',
    license: 'MIT',
    pricing: 'paid',
    price: 999,
    category: 'analytics',
    permissions: ['entry.read', 'webhook.manage'],
    manifest: {
      key: 'content-performance',
      name: 'Content Performance',
      version: '1.0.0',
      description: 'Advanced engagement metrics and content performance dashboard',
      hooks: [
        { event: 'entry.published', handler: 'content-performance:track-publish' },
        { event: 'entry.read', handler: 'content-performance:track-read' },
      ],
      routes: [
        { method: 'GET', path: '/performance/dashboard', handler: 'content-performance:dashboard' },
        { method: 'GET', path: '/performance/report', handler: 'content-performance:report' },
        { method: 'POST', path: '/performance/event', handler: 'content-performance:track-event' },
      ],
    },
  },

  // ── AI (3) ───────────────────────────────────────────────────────

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
        { event: 'asset.created', handler: 'ai-alt-text:generate-alt' },
        { event: 'asset.updated', handler: 'ai-alt-text:regenerate-alt' },
      ],
      routes: [
        { method: 'POST', path: '/ai-alt-text/generate', handler: 'ai-alt-text:manual-generate' },
      ],
    },
  },

  {
    key: 'ai-content-writer',
    name: 'AI Content Writer',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Generates draft content using large language models. Provide a topic, tone, and target length; the extension creates a structured draft with headings, body text, and suggested images.',
    repository: 'https://github.com/htmless/ext-ai-content-writer',
    homepage: 'https://htmless.io/marketplace/ai-content-writer',
    license: 'MIT',
    pricing: 'freemium',
    price: 1499,
    category: 'ai',
    permissions: ['entry.create', 'entry.read'],
    manifest: {
      key: 'ai-content-writer',
      name: 'AI Content Writer',
      version: '1.0.0',
      description: 'Generates draft content using AI language models',
      routes: [
        { method: 'POST', path: '/ai-writer/generate', handler: 'ai-content-writer:generate' },
        { method: 'POST', path: '/ai-writer/outline', handler: 'ai-content-writer:outline' },
        { method: 'POST', path: '/ai-writer/improve', handler: 'ai-content-writer:improve' },
      ],
    },
  },

  {
    key: 'ai-translator',
    name: 'AI Translator',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Automatically translates localized fields into target languages using AI translation. Supports 50+ languages, preserves rich text formatting, and handles pluralization rules.',
    repository: 'https://github.com/htmless/ext-ai-translator',
    homepage: 'https://htmless.io/marketplace/ai-translator',
    license: 'MIT',
    pricing: 'paid',
    price: 1999,
    category: 'ai',
    permissions: ['entry.read', 'entry.create'],
    manifest: {
      key: 'ai-translator',
      name: 'AI Translator',
      version: '1.0.0',
      description: 'Auto-translate localized fields using AI',
      hooks: [
        { event: 'entry.published', handler: 'ai-translator:auto-translate' },
      ],
      routes: [
        { method: 'POST', path: '/translate/entry', handler: 'ai-translator:translate-entry' },
        { method: 'POST', path: '/translate/field', handler: 'ai-translator:translate-field' },
        { method: 'GET', path: '/translate/languages', handler: 'ai-translator:list-languages' },
      ],
    },
  },

  // ── Commerce (2) ─────────────────────────────────────────────────

  {
    key: 'stripe-checkout',
    name: 'Stripe Checkout',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Embeds Stripe payment links in content entries. Create product entries with pricing, generate checkout sessions, and track payments. Supports one-time and recurring billing.',
    repository: 'https://github.com/htmless/ext-stripe-checkout',
    homepage: 'https://htmless.io/marketplace/stripe-checkout',
    license: 'MIT',
    pricing: 'free',
    category: 'commerce',
    permissions: ['entry.read', 'entry.create'],
    manifest: {
      key: 'stripe-checkout',
      name: 'Stripe Checkout',
      version: '1.0.0',
      description: 'Stripe payment links for content entries',
      routes: [
        { method: 'POST', path: '/checkout/create', handler: 'stripe-checkout:create-session' },
        { method: 'GET', path: '/checkout/status', handler: 'stripe-checkout:check-status' },
        { method: 'POST', path: '/checkout/webhook', handler: 'stripe-checkout:handle-webhook' },
      ],
      fields: [
        {
          contentTypeKey: '*',
          fieldKey: 'stripe_price_id',
          type: 'text',
          config: { helpText: 'Stripe Price ID for this entry' },
        },
        {
          contentTypeKey: '*',
          fieldKey: 'stripe_payment_mode',
          type: 'text',
          config: { helpText: 'payment or subscription' },
        },
      ],
    },
  },

  {
    key: 'inventory-sync',
    name: 'Inventory Sync',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Real-time stock tracking for product content types. Syncs inventory levels across channels, sends low-stock alerts, and auto-updates entry status when out of stock.',
    repository: 'https://github.com/htmless/ext-inventory-sync',
    homepage: 'https://htmless.io/marketplace/inventory-sync',
    license: 'MIT',
    pricing: 'paid',
    price: 2499,
    category: 'commerce',
    permissions: ['entry.read', 'entry.create', 'webhook.manage'],
    manifest: {
      key: 'inventory-sync',
      name: 'Inventory Sync',
      version: '1.0.0',
      description: 'Real-time stock tracking and inventory management',
      hooks: [
        { event: 'entry.updated', handler: 'inventory-sync:check-stock' },
      ],
      routes: [
        { method: 'GET', path: '/inventory/levels', handler: 'inventory-sync:get-levels' },
        { method: 'POST', path: '/inventory/adjust', handler: 'inventory-sync:adjust-stock' },
        { method: 'POST', path: '/inventory/webhook', handler: 'inventory-sync:external-webhook' },
      ],
      fields: [
        {
          contentTypeKey: '*',
          fieldKey: 'stock_quantity',
          type: 'number',
          config: { helpText: 'Current stock quantity' },
        },
        {
          contentTypeKey: '*',
          fieldKey: 'low_stock_threshold',
          type: 'number',
          config: { helpText: 'Alert when stock drops below this number' },
        },
      ],
    },
  },

  // ── Media (2) ────────────────────────────────────────────────────

  {
    key: 'image-optimizer',
    name: 'Image Optimizer',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Automatically compresses and optimizes uploaded images. Supports WebP/AVIF conversion, configurable quality presets, and responsive image variant generation.',
    repository: 'https://github.com/htmless/ext-image-optimizer',
    homepage: 'https://htmless.io/marketplace/image-optimizer',
    license: 'MIT',
    pricing: 'free',
    category: 'media',
    permissions: ['asset.upload'],
    manifest: {
      key: 'image-optimizer',
      name: 'Image Optimizer',
      version: '1.0.0',
      description: 'Auto-compress and optimize uploaded images',
      hooks: [
        { event: 'asset.created', handler: 'image-optimizer:optimize' },
      ],
      routes: [
        { method: 'POST', path: '/optimize/run', handler: 'image-optimizer:manual-optimize' },
        { method: 'GET', path: '/optimize/stats', handler: 'image-optimizer:savings-stats' },
      ],
    },
  },

  {
    key: 'watermark',
    name: 'Watermark',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Adds configurable watermarks to uploaded images. Supports text and image overlays, position control, opacity settings, and batch processing of existing assets.',
    repository: 'https://github.com/htmless/ext-watermark',
    homepage: 'https://htmless.io/marketplace/watermark',
    license: 'MIT',
    pricing: 'free',
    category: 'media',
    permissions: ['asset.upload'],
    manifest: {
      key: 'watermark',
      name: 'Watermark',
      version: '1.0.0',
      description: 'Add watermarks to uploaded images',
      hooks: [
        { event: 'asset.created', handler: 'watermark:apply' },
      ],
      routes: [
        { method: 'POST', path: '/watermark/apply', handler: 'watermark:manual-apply' },
        { method: 'POST', path: '/watermark/batch', handler: 'watermark:batch-apply' },
        { method: 'GET', path: '/watermark/preview', handler: 'watermark:preview' },
      ],
    },
  },

  // ── Notifications (2) ────────────────────────────────────────────

  {
    key: 'slack-notifier',
    name: 'Slack Notifier',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Sends real-time notifications to Slack channels when content is created, published, or updated. Configurable per content type with rich message formatting and thread support.',
    repository: 'https://github.com/htmless/ext-slack-notifier',
    homepage: 'https://htmless.io/marketplace/slack-notifier',
    license: 'MIT',
    pricing: 'free',
    category: 'notifications',
    permissions: ['entry.read', 'webhook.manage'],
    manifest: {
      key: 'slack-notifier',
      name: 'Slack Notifier',
      version: '1.0.0',
      description: 'Send Slack notifications on content changes',
      hooks: [
        { event: 'entry.created', handler: 'slack-notifier:notify-created' },
        { event: 'entry.published', handler: 'slack-notifier:notify-published' },
        { event: 'entry.updated', handler: 'slack-notifier:notify-updated' },
      ],
      routes: [
        { method: 'POST', path: '/slack/test', handler: 'slack-notifier:send-test' },
        { method: 'GET', path: '/slack/channels', handler: 'slack-notifier:list-channels' },
      ],
    },
  },

  {
    key: 'email-digest',
    name: 'Email Digest',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Sends daily or weekly email summaries of content activity. Includes new entries, upcoming scheduled publishes, recent comments, and content status overview.',
    repository: 'https://github.com/htmless/ext-email-digest',
    homepage: 'https://htmless.io/marketplace/email-digest',
    license: 'MIT',
    pricing: 'free',
    category: 'notifications',
    permissions: ['entry.read'],
    manifest: {
      key: 'email-digest',
      name: 'Email Digest',
      version: '1.0.0',
      description: 'Daily/weekly email summaries of content activity',
      routes: [
        { method: 'POST', path: '/digest/send', handler: 'email-digest:send-now' },
        { method: 'GET', path: '/digest/preview', handler: 'email-digest:preview' },
        { method: 'POST', path: '/digest/subscribe', handler: 'email-digest:subscribe' },
        { method: 'POST', path: '/digest/unsubscribe', handler: 'email-digest:unsubscribe' },
      ],
    },
  },

  // ── Integration (2) ──────────────────────────────────────────────

  {
    key: 'github-sync',
    name: 'GitHub Sync',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Two-way sync between HTMLess content and GitHub markdown files. Push published entries as .md files to a repo, or pull markdown changes back into HTMLess. Supports frontmatter mapping.',
    repository: 'https://github.com/htmless/ext-github-sync',
    homepage: 'https://htmless.io/marketplace/github-sync',
    license: 'MIT',
    pricing: 'free',
    category: 'integration',
    permissions: ['entry.read', 'entry.create'],
    manifest: {
      key: 'github-sync',
      name: 'GitHub Sync',
      version: '1.0.0',
      description: 'Two-way sync between content and GitHub markdown files',
      hooks: [
        { event: 'entry.published', handler: 'github-sync:push-to-github' },
      ],
      routes: [
        { method: 'POST', path: '/github/sync', handler: 'github-sync:full-sync' },
        { method: 'POST', path: '/github/pull', handler: 'github-sync:pull-from-github' },
        { method: 'POST', path: '/github/webhook', handler: 'github-sync:handle-webhook' },
        { method: 'GET', path: '/github/status', handler: 'github-sync:sync-status' },
      ],
    },
  },

  {
    key: 'wordpress-import',
    name: 'WordPress Import',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'One-click migration from WordPress. Imports posts, pages, categories, tags, media, and users from a WP XML export or live WP REST API. Maps WordPress blocks to HTMLess blocks.',
    repository: 'https://github.com/htmless/ext-wordpress-import',
    homepage: 'https://htmless.io/marketplace/wordpress-import',
    license: 'MIT',
    pricing: 'free',
    category: 'integration',
    permissions: ['entry.create', 'asset.upload', 'schema.admin'],
    manifest: {
      key: 'wordpress-import',
      name: 'WordPress Import',
      version: '1.0.0',
      description: 'One-click migration from WordPress',
      routes: [
        { method: 'POST', path: '/wp-import/xml', handler: 'wordpress-import:import-xml' },
        { method: 'POST', path: '/wp-import/api', handler: 'wordpress-import:import-api' },
        { method: 'GET', path: '/wp-import/status', handler: 'wordpress-import:import-status' },
        { method: 'GET', path: '/wp-import/preview', handler: 'wordpress-import:preview-import' },
      ],
    },
  },

  // ── Utility (2) ──────────────────────────────────────────────────

  {
    key: 'backup-scheduler',
    name: 'Backup Scheduler',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Automated content backups on a configurable schedule. Exports all entries, schemas, and assets to JSON/ZIP, stores in S3-compatible storage, and supports point-in-time restore.',
    repository: 'https://github.com/htmless/ext-backup-scheduler',
    homepage: 'https://htmless.io/marketplace/backup-scheduler',
    license: 'MIT',
    pricing: 'freemium',
    price: 499,
    category: 'utility',
    permissions: ['entry.read', 'asset.upload', 'schema.admin'],
    manifest: {
      key: 'backup-scheduler',
      name: 'Backup Scheduler',
      version: '1.0.0',
      description: 'Automated content backups and point-in-time restore',
      routes: [
        { method: 'POST', path: '/backup/run', handler: 'backup-scheduler:run-backup' },
        { method: 'GET', path: '/backup/list', handler: 'backup-scheduler:list-backups' },
        { method: 'POST', path: '/backup/restore', handler: 'backup-scheduler:restore' },
        { method: 'GET', path: '/backup/status', handler: 'backup-scheduler:status' },
      ],
    },
  },

  {
    key: 'content-linter',
    name: 'Content Linter',
    version: '1.0.0',
    author: 'HTMLess Team',
    description:
      'Checks content for style, grammar, and consistency issues before publishing. Configurable rulesets for tone, reading level, prohibited words, and brand guidelines.',
    repository: 'https://github.com/htmless/ext-content-linter',
    homepage: 'https://htmless.io/marketplace/content-linter',
    license: 'MIT',
    pricing: 'free',
    category: 'utility',
    permissions: ['entry.read'],
    manifest: {
      key: 'content-linter',
      name: 'Content Linter',
      version: '1.0.0',
      description: 'Style, grammar, and consistency checks for content',
      hooks: [
        { event: 'entry.updated', handler: 'content-linter:lint-on-save' },
      ],
      routes: [
        { method: 'POST', path: '/lint/check', handler: 'content-linter:check' },
        { method: 'GET', path: '/lint/rules', handler: 'content-linter:list-rules' },
        { method: 'POST', path: '/lint/configure', handler: 'content-linter:configure-rules' },
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
