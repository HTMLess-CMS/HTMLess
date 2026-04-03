// ─── Extension Runtime Environment ──────────────────────────────────
// Creates sandboxed SDK instances scoped to a specific space and
// manages extension lifecycle (install/uninstall hooks).

import { prisma } from '../db.js';
import type { ExtensionManifest } from './manifest.js';
import {
  HTMLessExtensionSDK,
  type DataAccessCallbacks,
  type ExtensionContext,
  type QueryOptions,
  type Entry,
  type Asset,
} from './sdk.js';

// ─── Active runtime instances (spaceId:extensionKey -> SDK) ─────────

const runtimes = new Map<string, HTMLessExtensionSDK>();

function runtimeKey(spaceId: string, extensionKey: string): string {
  return `${spaceId}:${extensionKey}`;
}

// ─── Prisma-backed data access callbacks ────────────────────────────

function buildDataAccess(): DataAccessCallbacks {
  return {
    async getEntries(spaceId: string, typeKey: string, options?: QueryOptions): Promise<Entry[]> {
      const contentType = await prisma.contentType.findUnique({
        where: { spaceId_key: { spaceId, key: typeKey } },
      });
      if (!contentType) return [];

      const rows = await prisma.entry.findMany({
        where: { spaceId, contentTypeId: contentType.id },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
        orderBy: options?.orderBy
          ? Object.entries(options.orderBy).map(([k, dir]) => ({ [k]: dir }))
          : [{ createdAt: 'desc' }],
        include: {
          versions: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      });

      return rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        contentTypeKey: typeKey,
        data: (r.versions[0]?.data as Record<string, unknown>) ?? {},
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    },

    async createEntry(spaceId: string, typeKey: string, data: object): Promise<Entry> {
      const contentType = await prisma.contentType.findUnique({
        where: { spaceId_key: { spaceId, key: typeKey } },
      });
      if (!contentType) throw new Error(`Content type "${typeKey}" not found in space`);

      // Generate a slug from data or use timestamp
      const slug =
        (data as Record<string, unknown>).slug as string | undefined ??
        `ext-${Date.now()}`;

      const entry = await prisma.entry.create({
        data: {
          spaceId,
          contentTypeId: contentType.id,
          slug,
          versions: {
            create: {
              kind: 'draft',
              data: data as object,
              etag: `ext-${Date.now()}`,
              createdById: 'system',
            },
          },
        },
      });

      return {
        id: entry.id,
        slug: entry.slug,
        contentTypeKey: typeKey,
        data: data as Record<string, unknown>,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      };
    },

    async getAssets(spaceId: string, options?: QueryOptions): Promise<Asset[]> {
      const rows = await prisma.asset.findMany({
        where: { spaceId },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
        orderBy: [{ createdAt: 'desc' }],
      });

      return rows.map((r) => ({
        id: r.id,
        filename: r.filename,
        mimeType: r.mimeType,
        bytes: r.bytes,
        width: r.width,
        height: r.height,
        alt: r.alt,
        storageKey: r.storageKey,
        createdAt: r.createdAt.toISOString(),
      }));
    },

    async getConfig<T>(spaceId: string, extensionKey: string, key: string): Promise<T | null> {
      const row = await prisma.extensionConfig.findUnique({
        where: {
          spaceId_extensionKey_configKey: { spaceId, extensionKey, configKey: key },
        },
      });
      return row ? (row.value as T) : null;
    },

    async setConfig(spaceId: string, extensionKey: string, key: string, value: unknown): Promise<void> {
      await prisma.extensionConfig.upsert({
        where: {
          spaceId_extensionKey_configKey: { spaceId, extensionKey, configKey: key },
        },
        update: { value: value as object },
        create: {
          spaceId,
          extensionKey,
          configKey: key,
          value: value as object,
        },
      });
    },
  };
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Create a sandboxed SDK instance scoped to a specific space.
 * If a runtime already exists for this space+extension pair, returns the existing one.
 */
export function createExtensionRuntime(
  manifest: ExtensionManifest,
  spaceId: string,
): HTMLessExtensionSDK {
  const key = runtimeKey(spaceId, manifest.key);
  const existing = runtimes.get(key);
  if (existing) return existing;

  const context: ExtensionContext = {
    spaceId,
    extensionKey: manifest.key,
    extensionVersion: manifest.version,
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:4000',
  };

  const sdk = new HTMLessExtensionSDK(context, buildDataAccess());
  runtimes.set(key, sdk);
  return sdk;
}

/**
 * Execute the install lifecycle hook for an extension in a space.
 */
export async function executeInstallHook(
  manifest: ExtensionManifest,
  spaceId: string,
): Promise<void> {
  const sdk = createExtensionRuntime(manifest, spaceId);
  if (sdk.installHandler) {
    await sdk.installHandler(sdk.context);
  }
}

/**
 * Execute the uninstall lifecycle hook for an extension in a space.
 * Cleans up the runtime instance afterwards.
 */
export async function executeUninstallHook(
  manifest: ExtensionManifest,
  spaceId: string,
): Promise<void> {
  const key = runtimeKey(spaceId, manifest.key);
  const sdk = runtimes.get(key);
  if (sdk?.uninstallHandler) {
    await sdk.uninstallHandler(sdk.context);
  }

  // Clean up stored config for this extension in this space
  await prisma.extensionConfig.deleteMany({
    where: { spaceId, extensionKey: manifest.key },
  });

  runtimes.delete(key);
}

/**
 * Dispatch an event to all active runtimes that have handlers for it.
 */
export async function dispatchEvent(
  eventType: string,
  spaceId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const payload = {
    eventType,
    spaceId,
    timestamp: new Date().toISOString(),
    data,
  };

  for (const [key, sdk] of runtimes) {
    if (!key.startsWith(`${spaceId}:`)) continue;
    const handlers = sdk.eventHandlers.get(eventType);
    if (!handlers) continue;
    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (err) {
        sdk.log('error', `Event handler failed for ${eventType}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

/**
 * Get an active runtime for a space+extension pair.
 */
export function getRuntime(spaceId: string, extensionKey: string): HTMLessExtensionSDK | undefined {
  return runtimes.get(runtimeKey(spaceId, extensionKey));
}

/**
 * List all active runtime keys.
 */
export function listRuntimes(): string[] {
  return Array.from(runtimes.keys());
}
