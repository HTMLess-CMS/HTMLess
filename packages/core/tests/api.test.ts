/**
 * HTMLess API integration tests.
 *
 * Runs against a live API instance.
 * Configure with env vars:
 *   API_URL   — base URL (default http://localhost:3100)
 *   SPACE_ID  — default space id (required — printed by seed script)
 *
 * Run:
 *   SPACE_ID=<id> tsx tests/api.test.ts
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import {
  api,
  authGet,
  authPost,
  authPatch,
  authDelete,
  getAdminToken,
  getSpaceId,
  uniqueSlug,
  ADMIN_EMAIL,
  API_URL,
} from './helpers.js';

// ---------------------------------------------------------------------------
// Shared state populated by `before` hooks
// ---------------------------------------------------------------------------

let token: string;
let spaceId: string;

const ONE_BY_ONE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5W5mQAAAAASUVORK5CYII=',
  'base64',
);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function articleBody(text: string): Array<Record<string, unknown>> {
  return [
    {
      type: 'paragraph',
      attrs: { text },
    },
  ];
}

async function waitFor<T>(
  label: string,
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  timeoutMs = 3000,
  intervalMs = 150,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastValue: T | undefined;

  while (Date.now() < deadline) {
    lastValue = await fn();
    if (predicate(lastValue)) {
      return lastValue;
    }
    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for ${label}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Auth
// ═══════════════════════════════════════════════════════════════════════════

describe('Auth', () => {
  it('Login succeeds with correct credentials', async () => {
    const res = await api<{ token: string; user: { email: string } }>('/cma/v1/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: 'admin123' },
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.token, 'response should include a JWT token');
    assert.equal(res.body.user.email, ADMIN_EMAIL);
  });

  it('Login fails with wrong password', async () => {
    const res = await api('/cma/v1/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: 'wrong-password' },
    });

    assert.equal(res.status, 401);
    assert.equal((res.body as Record<string, unknown>).error, 'invalid_credentials');
  });

  it('Login fails with missing email', async () => {
    const res = await api('/cma/v1/auth/login', {
      method: 'POST',
      body: { password: 'admin123' },
    });

    assert.equal(res.status, 400);
    assert.equal((res.body as Record<string, unknown>).error, 'validation_error');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Spaces
// ═══════════════════════════════════════════════════════════════════════════

describe('Spaces', () => {
  before(async () => {
    token = await getAdminToken();
    spaceId = await getSpaceId();
  });

  let tempSpaceId: string | undefined;

  after(async () => {
    if (tempSpaceId) {
      await api(`/cma/v1/spaces/${tempSpaceId}`, {
        method: 'DELETE',
        token,
      }).catch(() => {});
    }
  });

  it('List spaces includes the seeded default space', async () => {
    const res = await api<{ items: Array<{ id: string; slug: string }>; total: number }>('/cma/v1/spaces', {
      token,
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.total >= 1, 'should return at least one accessible space');
    assert.ok(
      res.body.items.some((space) => space.id === spaceId && space.slug === 'default'),
      'default seeded space should be returned',
    );
  });

  it('List templates returns starter space templates', async () => {
    const res = await api<{ items: Array<{ key: string; name: string }>; total: number }>('/cma/v1/spaces/templates', {
      token,
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.total >= 1, 'should expose at least one space template');
    assert.ok(res.body.items.every((item) => item.key && item.name), 'templates should include key and name');
  });

  it('Create and delete a temporary space', async () => {
    const slug = uniqueSlug('space');

    const createRes = await api<{ id: string; slug: string; name: string }>('/cma/v1/spaces', {
      method: 'POST',
      token,
      body: { name: 'Temporary Test Space', slug },
    });

    assert.equal(createRes.status, 201);
    assert.ok(createRes.body.id, 'created space should include an id');
    assert.equal(createRes.body.slug, slug);

    tempSpaceId = createRes.body.id;

    const deleteRes = await api(`/cma/v1/spaces/${tempSpaceId}`, {
      method: 'DELETE',
      token,
    });

    assert.equal(deleteRes.status, 204);
    tempSpaceId = undefined;
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Schema
// ═══════════════════════════════════════════════════════════════════════════

describe('Schema', { concurrency: 1 }, () => {
  before(async () => {
    token = await getAdminToken();
    spaceId = await getSpaceId();
  });

  it('List schemas requires auth and X-Space-Id', async () => {
    // No auth at all
    const noAuth = await api('/cma/v1/schemas/types');
    assert.equal(noAuth.status, 401, 'should reject unauthenticated request');

    // Auth but no X-Space-Id
    const noSpace = await api('/cma/v1/schemas/types', { token });
    assert.equal(noSpace.status, 400, 'should reject request without X-Space-Id');
  });

  it('List schemas returns article type with fields', async () => {
    const res = await authGet<{ items: Array<{ key: string; fields: Array<{ key: string }> }>; total: number }>('/cma/v1/schemas/types');

    assert.equal(res.status, 200);
    assert.ok(res.body.total >= 1, 'should have at least one content type');

    const article = res.body.items.find((t) => t.key === 'article');
    assert.ok(article, 'article content type should exist');

    const fieldKeys = article.fields.map((f) => f.key);
    assert.ok(fieldKeys.includes('title'), 'should have title field');
    assert.ok(fieldKeys.includes('slug'), 'should have slug field');
    assert.ok(fieldKeys.includes('excerpt'), 'should have excerpt field');
    assert.ok(fieldKeys.includes('body'), 'should have body field');
    assert.ok(fieldKeys.includes('featuredImage'), 'should have featuredImage field');
  });

  // --- CRUD lifecycle for a temporary content type ---

  const tempTypeKey = `test-type-${Date.now()}`;
  let tempFieldKey: string;

  it('Create a new content type', async () => {
    const res = await authPost<{ key: string; id: string; name: string }>(
      '/cma/v1/schemas/types',
      { key: tempTypeKey, name: 'Test Type', description: 'Temporary type for tests' },
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.key, tempTypeKey);
    assert.ok(res.body.id, 'should return id');
  });

  it('Add a field to the content type', async () => {
    tempFieldKey = 'test_field';
    const res = await authPost<{ key: string; id: string }>(
      `/cma/v1/schemas/types/${tempTypeKey}/fields`,
      { key: tempFieldKey, name: 'Test Field', type: 'text', required: false },
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.key, tempFieldKey);
    assert.ok(res.body.id, 'should return field id');
  });

  it('Delete the content type', async () => {
    const res = await authDelete(`/cma/v1/schemas/types/${tempTypeKey}`);
    assert.equal(res.status, 204);

    // Confirm it is gone
    const verify = await authGet(`/cma/v1/schemas/types/${tempTypeKey}`);
    assert.equal(verify.status, 404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Entries
// ═══════════════════════════════════════════════════════════════════════════

describe('Entries', { concurrency: 1 }, () => {
  before(async () => {
    token = await getAdminToken();
    spaceId = await getSpaceId();
  });

  // Track entry ids for cleanup
  const entriesToCleanup: string[] = [];
  after(async () => {
    for (const id of entriesToCleanup) {
      await authDelete(`/cma/v1/entries/${id}`).catch(() => {});
    }
  });

  const slug1 = uniqueSlug('entry');
  let entryId: string;
  let currentEtag: string;

  it('Create entry succeeds with valid data', async () => {
    const res = await authPost<{
      id: string;
      slug: string;
      latestVersion: { etag: string; data: Record<string, unknown> };
    }>('/cma/v1/entries', {
      contentTypeKey: 'article',
      slug: slug1,
      data: {
        title: 'Test Article',
        slug: slug1,
        excerpt: 'An excerpt',
        body: articleBody('Hello world'),
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.slug, slug1);
    assert.ok(res.body.id, 'should return entry id');
    assert.ok(res.body.latestVersion.etag, 'should include an etag');

    entryId = res.body.id;
    currentEtag = res.body.latestVersion.etag;
    entriesToCleanup.push(entryId);
  });

  it('Create entry rejects duplicate slug (409)', async () => {
    const res = await authPost('/cma/v1/entries', {
      contentTypeKey: 'article',
      slug: slug1,
      data: { title: 'Duplicate', slug: slug1, body: articleBody('dup') },
    });

    assert.equal(res.status, 409);
    assert.equal((res.body as Record<string, unknown>).error, 'conflict');
  });

  it('Get single entry returns data + versions', async () => {
    const res = await authGet<{
      id: string;
      versions: Array<{ id: string; kind: string; data: Record<string, unknown>; etag: string }>;
    }>(`/cma/v1/entries/${entryId}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.id, entryId);
    assert.ok(Array.isArray(res.body.versions), 'should include versions array');
    assert.ok(res.body.versions.length >= 1, 'should have at least one version');
    assert.ok(res.headers.get('etag'), 'should return ETag header');
  });

  it('Save draft with If-Match succeeds', async () => {
    const res = await authPost<{ etag: string; data: Record<string, unknown> }>(
      `/cma/v1/entries/${entryId}/save-draft`,
      {
        data: {
          title: 'Updated Title',
          slug: slug1,
          excerpt: 'Updated excerpt',
          body: articleBody('Updated body'),
        },
      },
      undefined,
      { 'If-Match': `"${currentEtag}"` },
    );

    assert.equal(res.status, 200);
    assert.ok(res.body.etag, 'should return new etag');
    assert.notEqual(res.body.etag, currentEtag, 'new etag should differ from old');
    currentEtag = res.body.etag;
  });

  it('Save draft with wrong If-Match returns 412', async () => {
    const res = await authPost(
      `/cma/v1/entries/${entryId}/save-draft`,
      {
        data: {
          title: 'Should Fail',
          slug: slug1,
          body: articleBody('conflict'),
        },
      },
      undefined,
      { 'If-Match': '"totally-wrong-etag"' },
    );

    assert.equal(res.status, 412);
    assert.equal((res.body as Record<string, unknown>).error, 'precondition_failed');
  });

  it('Publish requires If-Match header (428 without)', async () => {
    const res = await authPost(`/cma/v1/entries/${entryId}/publish`, {});

    assert.equal(res.status, 428);
    assert.equal((res.body as Record<string, unknown>).error, 'precondition_required');
  });

  it('Publish succeeds with correct If-Match', async () => {
    const res = await authPost<{ status: string; etag: string }>(
      `/cma/v1/entries/${entryId}/publish`,
      {},
      undefined,
      { 'If-Match': `"${currentEtag}"` },
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'published');
    assert.ok(res.body.etag, 'should return published etag');
    currentEtag = res.body.etag;
  });

  it('Unpublish succeeds', async () => {
    const res = await authPost<{ status: string }>(`/cma/v1/entries/${entryId}/unpublish`, {});

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'draft');
  });

  it('List versions returns history', async () => {
    const res = await authGet<{
      items: Array<{ id: string; kind: string }>;
      total: number;
    }>(`/cma/v1/entries/${entryId}/versions`);

    assert.equal(res.status, 200);
    // We created 1 initial draft + 1 save-draft + 1 published version = 3
    assert.ok(res.body.total >= 3, `should have at least 3 versions, got ${res.body.total}`);
    assert.ok(Array.isArray(res.body.items));
  });

  it('Revert to previous version', async () => {
    // Get versions to pick an older one
    const versionsRes = await authGet<{
      items: Array<{ id: string; kind: string; data: Record<string, unknown> }>;
    }>(`/cma/v1/entries/${entryId}/versions`);

    assert.equal(versionsRes.status, 200);

    // Pick the oldest version (last in desc order)
    const oldestVersion = versionsRes.body.items[versionsRes.body.items.length - 1];
    assert.ok(oldestVersion, 'should have at least one version to revert to');

    const res = await authPost<{
      revertedFrom: string;
      etag: string;
      data: Record<string, unknown>;
    }>(`/cma/v1/entries/${entryId}/revert`, { versionId: oldestVersion.id });

    assert.equal(res.status, 200);
    assert.equal(res.body.revertedFrom, oldestVersion.id);
    assert.ok(res.body.etag, 'should return new etag after revert');
    currentEtag = res.body.etag;
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Media
// ═══════════════════════════════════════════════════════════════════════════

describe('Media', { concurrency: 1 }, () => {
  before(async () => {
    token = await getAdminToken();
    spaceId = await getSpaceId();
  });

  let assetId: string;
  let storageKey: string;
  let mediaUrl: string;

  after(async () => {
    if (assetId) {
      await authDelete(`/cma/v1/assets/${assetId}`).catch(() => {});
    }
  });

  it('Raw upload creates a stored asset with metadata and delivery URL', async () => {
    const res = await fetch(`${API_URL}/cma/v1/uploads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Space-Id': spaceId,
        'Content-Type': 'image/png',
        'X-Filename': 'pixel.png',
        'X-Alt': 'Single pixel',
        'X-Caption': 'Upload test asset',
      },
      body: ONE_BY_ONE_PNG,
    });

    assert.equal(res.status, 201);

    const body = await res.json() as {
      id: string;
      width: number | null;
      height: number | null;
      mimeType: string;
      storageKey: string;
      url: string;
      alt: string | null;
      caption: string | null;
    };

    assert.ok(body.id, 'upload should return asset id');
    assert.equal(body.mimeType, 'image/png');
    assert.equal(body.width, 1);
    assert.equal(body.height, 1);
    assert.equal(body.alt, 'Single pixel');
    assert.equal(body.caption, 'Upload test asset');
    assert.ok(body.storageKey.includes(spaceId), 'storage key should include the current space');
    assert.ok(body.url.startsWith('/media/'), 'upload should return a delivery URL');

    assetId = body.id;
    storageKey = body.storageKey;
    mediaUrl = body.url;
  });

  it('Uploaded asset is readable from CMA, CDA, and the media delivery endpoint', async () => {
    const cmaAsset = await authGet<{
      id: string;
      storageKey: string;
      width: number | null;
      height: number | null;
    }>(`/cma/v1/assets/${assetId}`);

    assert.equal(cmaAsset.status, 200);
    assert.equal(cmaAsset.body.id, assetId);
    assert.equal(cmaAsset.body.storageKey, storageKey);
    assert.equal(cmaAsset.body.width, 1);
    assert.equal(cmaAsset.body.height, 1);

    const cdaAsset = await api<{ id: string; storageKey: string; mimeType: string }>(`/cda/v1/assets/${assetId}`, {
      spaceId,
    });

    assert.equal(cdaAsset.status, 200);
    assert.equal(cdaAsset.body.id, assetId);
    assert.equal(cdaAsset.body.storageKey, storageKey);
    assert.equal(cdaAsset.body.mimeType, 'image/png');

    const mediaRes = await fetch(`${API_URL}${mediaUrl}`);
    const mediaBuffer = Buffer.from(await mediaRes.arrayBuffer());

    assert.equal(mediaRes.status, 200);
    assert.equal(mediaRes.headers.get('content-type'), 'image/png');
    assert.ok(
      mediaRes.headers.get('cache-control')?.includes('immutable'),
      'delivery response should be cacheable',
    );
    assert.equal(mediaBuffer.length, ONE_BY_ONE_PNG.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Blocks
// ═══════════════════════════════════════════════════════════════════════════

describe('Blocks', { concurrency: 1 }, () => {
  before(async () => {
    token = await getAdminToken();
    spaceId = await getSpaceId();
  });

  const blockKey = uniqueSlug('block').replace(/-/g, '_');
  let patternId: string | undefined;

  after(async () => {
    if (patternId) {
      await authDelete(`/cma/v1/blocks/patterns/${patternId}`).catch(() => {});
    }
    await authDelete(`/cma/v1/blocks/definitions/${blockKey}`).catch(() => {});
  });

  it('Custom block definitions support create, versioned update, and latest read', async () => {
    const createRes = await authPost<{
      key: string;
      version: string;
      title: string;
      attributesSchema: Record<string, unknown>;
    }>('/cma/v1/blocks/definitions', {
      key: blockKey,
      title: 'Promo Card',
      description: 'Test block definition',
      attributesSchema: {
        type: 'object',
        properties: {
          heading: { type: 'string' },
        },
      },
    });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.key, blockKey);
    assert.equal(createRes.body.version, '1.0.0');

    const patchRes = await authPatch<{
      key: string;
      version: string;
      title: string;
    }>(`/cma/v1/blocks/definitions/${blockKey}`, {
      title: 'Promo Card v2',
    });

    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.key, blockKey);
    assert.equal(patchRes.body.version, '1.1.0');
    assert.equal(patchRes.body.title, 'Promo Card v2');

    const getRes = await authGet<{ key: string; version: string; title: string }>(`/cma/v1/blocks/definitions/${blockKey}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.key, blockKey);
    assert.equal(getRes.body.version, '1.1.0');
    assert.equal(getRes.body.title, 'Promo Card v2');
  });

  it('Patterns support create, list, and delete', async () => {
    const createRes = await authPost<{
      id: string;
      title: string;
      blockTree: Array<Record<string, unknown>>;
    }>('/cma/v1/blocks/patterns', {
      title: 'Hero Pattern',
      description: 'Pattern for tests',
      blockTree: [
        {
          type: blockKey,
          attrs: {
            heading: 'Hello from a pattern',
          },
        },
      ],
      typeKeys: ['article'],
    });

    assert.equal(createRes.status, 201);
    assert.ok(createRes.body.id, 'pattern should return id');
    assert.equal(createRes.body.title, 'Hero Pattern');
    assert.equal(createRes.body.blockTree.length, 1);
    patternId = createRes.body.id;

    const listRes = await authGet<{ items: Array<{ id: string }>; total: number }>('/cma/v1/blocks/patterns');

    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.items.some((pattern) => pattern.id === patternId), 'created pattern should appear in list');

    const deleteRes = await authDelete(`/cma/v1/blocks/patterns/${patternId}`);
    assert.equal(deleteRes.status, 204);
    patternId = undefined;
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Extensions
// ═══════════════════════════════════════════════════════════════════════════

describe('Extensions', () => {
  before(async () => {
    token = await getAdminToken();
    spaceId = await getSpaceId();
  });

  const extensionKey = uniqueSlug('ext');

  after(async () => {
    await authDelete(`/cma/v1/extensions/${extensionKey}`).catch(() => {});
  });

  it('Extension manifests support create, list, fetch, and delete', async () => {
    const createRes = await authPost<{
      key: string;
      version: string;
      routes?: Array<{ method: string; path: string }>;
    }>('/cma/v1/extensions', {
      key: extensionKey,
      name: 'Test Extension',
      version: '1.0.0',
      description: 'Extension used by integration tests',
      routes: [{ method: 'GET', path: '/hello', handler: 'helloHandler' }],
    });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.key, extensionKey);
    assert.equal(createRes.body.version, '1.0.0');
    assert.equal(createRes.body.routes?.[0]?.path, '/hello');

    const listRes = await authGet<{ items: Array<{ key: string }>; total: number }>('/cma/v1/extensions');

    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.items.some((item) => item.key === extensionKey), 'created extension should appear in list');

    const getRes = await authGet<{ key: string; name: string }>(`/cma/v1/extensions/${extensionKey}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.key, extensionKey);
    assert.equal(getRes.body.name, 'Test Extension');

    const deleteRes = await authDelete(`/cma/v1/extensions/${extensionKey}`);
    assert.equal(deleteRes.status, 204);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DX
// ═══════════════════════════════════════════════════════════════════════════

describe('DX', () => {
  before(async () => {
    token = await getAdminToken();
    spaceId = await getSpaceId();
  });

  it('TypeScript codegen returns declarations for seeded content types', async () => {
    const res = await authGet<string>('/cma/v1/codegen/typescript');

    assert.equal(res.status, 200);
    assert.ok(
      res.headers.get('content-type')?.includes('text/plain'),
      'codegen should return plain text declarations',
    );
    assert.match(res.body, /export interface ArticleFields/);
    assert.match(res.body, /export interface HtmlessEntry/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Product APIs
// ═══════════════════════════════════════════════════════════════════════════

describe('Product APIs', { concurrency: 1 }, () => {
  before(async () => {
    token = await getAdminToken();
    spaceId = await getSpaceId();
  });

  const localeCode = uniqueSlug('locale').slice(0, 16);
  const redirectSourceSlug = uniqueSlug('redirect');
  const redirectTargetSlug = `${redirectSourceSlug}-updated`;
  let redirectEntryId: string | undefined;

  after(async () => {
    await authDelete(`/cma/v1/locales/${localeCode}`).catch(() => {});
    if (redirectEntryId) {
      await authDelete(`/cma/v1/entries/${redirectEntryId}`).catch(() => {});
    }
  });

  it('Locales support create, list, patch, and delete', async () => {
    const createRes = await authPost<{ code: string; name: string; isDefault: boolean }>('/cma/v1/locales', {
      code: localeCode,
      name: 'Test Locale',
      isDefault: false,
    });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.code, localeCode);
    assert.equal(createRes.body.name, 'Test Locale');

    const listRes = await authGet<{ items: Array<{ code: string }>; total: number }>('/cma/v1/locales');

    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.items.some((locale) => locale.code === localeCode), 'created locale should appear in list');

    const patchRes = await authPatch<{ code: string; name: string }>(`/cma/v1/locales/${localeCode}`, {
      name: 'Updated Test Locale',
    });

    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.name, 'Updated Test Locale');

    const deleteRes = await authDelete(`/cma/v1/locales/${localeCode}`);
    assert.equal(deleteRes.status, 204);
  });

  it('Changing an entry slug creates a CDA redirect and search can find the new slug', async () => {
    const createRes = await authPost<{
      id: string;
      slug: string;
      latestVersion: { etag: string };
    }>('/cma/v1/entries', {
      contentTypeKey: 'article',
      slug: redirectSourceSlug,
      data: {
        title: 'Redirect Test Article',
        slug: redirectSourceSlug,
        body: articleBody('redirect body'),
      },
    });

    assert.equal(createRes.status, 201);
    redirectEntryId = createRes.body.id;

    const patchRes = await authPatch<{ id: string; slug: string }>(`/cma/v1/entries/${redirectEntryId}`, {
      slug: redirectTargetSlug,
    });

    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.slug, redirectTargetSlug);

    const redirectRes = await api<{
      fromSlug: string;
      toSlug: string;
      statusCode: number;
    }>(`/cda/v1/redirects/${redirectSourceSlug}`, { spaceId });

    assert.equal(redirectRes.status, 200);
    assert.equal(redirectRes.body.fromSlug, redirectSourceSlug);
    assert.equal(redirectRes.body.toSlug, redirectTargetSlug);
    assert.equal(redirectRes.body.statusCode, 301);

    const searchRes = await authGet<{
      entries: Array<{ id: string; slug: string }>;
      assets: unknown[];
      schemas: unknown[];
    }>(`/cma/v1/search?q=${encodeURIComponent(redirectTargetSlug)}`);

    assert.equal(searchRes.status, 200);
    assert.ok(
      searchRes.body.entries.some((entry) => entry.id === redirectEntryId && entry.slug === redirectTargetSlug),
      'search should find the updated entry slug',
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CDA (Content Delivery API)
// ═══════════════════════════════════════════════════════════════════════════

describe('CDA', { concurrency: 1 }, () => {
  before(async () => {
    token = await getAdminToken();
    spaceId = await getSpaceId();
  });

  const cdaSlug = uniqueSlug('cda');
  let cdaEntryId: string;
  let cdaEtag: string;

  // Create and publish an entry for CDA tests
  before(async () => {
    // Create
    const create = await authPost<{
      id: string;
      latestVersion: { etag: string };
    }>('/cma/v1/entries', {
      contentTypeKey: 'article',
      slug: cdaSlug,
      data: {
        title: 'CDA Test Article',
        slug: cdaSlug,
        body: articleBody('CDA body'),
      },
    });
    assert.equal(create.status, 201);
    cdaEntryId = create.body.id;
    cdaEtag = create.body.latestVersion.etag;

    // Publish
    const pub = await authPost<{ etag: string }>(
      `/cma/v1/entries/${cdaEntryId}/publish`,
      {},
      undefined,
      { 'If-Match': `"${cdaEtag}"` },
    );
    assert.equal(pub.status, 200);
    cdaEtag = pub.body.etag;
  });

  after(async () => {
    // Cleanup
    await authDelete(`/cma/v1/entries/${cdaEntryId}`).catch(() => {});
  });

  it('Published entry appears in CDA', async () => {
    const res = await waitFor(
      'published entry in CDA',
      async () =>
        api<{
          items: Array<{ id: string; slug: string; data: Record<string, unknown> }>;
          pagination: { total: number };
        }>(`/cda/v1/content/article?slug=${cdaSlug}`, { spaceId }),
      (response) => response.status === 200 && response.body.items.some((entry) => entry.id === cdaEntryId),
    );

    assert.equal(res.status, 200);
    const found = res.body.items.find((entry) => entry.id === cdaEntryId);
    assert.ok(found, 'published entry should appear in CDA listing');
    assert.equal(found!.slug, cdaSlug);
  });

  it('CDA returns Cache-Control and ETag headers', async () => {
    const res = await api(`/cda/v1/content/article`, { spaceId });

    assert.equal(res.status, 200);
    assert.ok(res.headers.get('cache-control'), 'should have Cache-Control header');
    assert.ok(
      res.headers.get('cache-control')!.includes('max-age'),
      'Cache-Control should include max-age',
    );
    assert.ok(res.headers.get('etag'), 'should have ETag header');
  });

  it('CDA supports ?slug= filter', async () => {
    const res = await api<{
      items: Array<{ slug: string }>;
      pagination: { total: number };
    }>(`/cda/v1/content/article?slug=${cdaSlug}`, { spaceId });

    assert.equal(res.status, 200);
    assert.equal(res.body.pagination.total, 1, 'slug filter should return exactly one result');
    assert.equal(res.body.items[0].slug, cdaSlug);
  });

  it('CDA supports field projection on single-entry reads', async () => {
    const res = await api<{
      id: string;
      slug: string;
      data: Record<string, unknown>;
    }>(`/cda/v1/content/article/${cdaEntryId}?fields=title,slug`, { spaceId });

    assert.equal(res.status, 200);
    assert.equal(res.body.id, cdaEntryId);
    assert.deepEqual(Object.keys(res.body.data).sort(), ['slug', 'title']);
    assert.equal(res.body.data.title, 'CDA Test Article');
  });

  it('CDA supports advanced filter params against published data', async () => {
    const res = await api<{
      items: Array<{ id: string; data: Record<string, unknown> }>;
      pagination: { total: number };
    }>(`/cda/v1/content/article?filter[title][$contains]=CDA%20Test`, { spaceId });

    assert.equal(res.status, 200);
    assert.ok(res.body.pagination.total >= 1, 'filter query should return at least one result');
    assert.ok(
      res.body.items.some((entry) => entry.id === cdaEntryId),
      'filtered results should include the published CDA test entry',
    );
  });

  it('CDA returns 304 when If-None-Match matches the cached ETag', async () => {
    const first = await api(`/cda/v1/content/article?slug=${cdaSlug}`, { spaceId });
    assert.equal(first.status, 200);

    const etag = first.headers.get('etag');
    assert.ok(etag, 'first request should return an ETag');

    const second = await api(`/cda/v1/content/article?slug=${cdaSlug}`, {
      spaceId,
      headers: { 'If-None-Match': etag! },
    });

    assert.equal(second.status, 304);
  });

  it('CDA list requests register cache keys visible from the CMA cache observability endpoint', async () => {
    const listRes = await api(`/cda/v1/content/article?slug=${cdaSlug}`, { spaceId });
    assert.equal(listRes.status, 200);

    const keysRes = await waitFor(
      'CDA cache keys',
      async () =>
        authGet<{ keys: string[]; count: number }>(
          `/cma/v1/cache/keys?pattern=${encodeURIComponent(`cda:${spaceId}:article:*`)}`,
        ),
      (res) => res.status === 200 && res.body.keys.length > 0,
    );

    assert.equal(keysRes.status, 200);
    assert.ok(
      keysRes.body.keys.some((key) => key.startsWith(`cda:${spaceId}:article:`)),
      'cache observability should list the cached CDA key',
    );
  });

  it('Unpublished entry does not appear in CDA', async () => {
    // Unpublish
    const unpub = await authPost(`/cma/v1/entries/${cdaEntryId}/unpublish`, {});
    assert.equal(unpub.status, 200);

    const res = await api<{
      items: Array<{ id: string }>;
    }>(`/cda/v1/content/article?slug=${cdaSlug}`, { spaceId });

    assert.equal(res.status, 200);
    const found = res.body.items.find((e) => e.id === cdaEntryId);
    assert.ok(!found, 'unpublished entry should NOT appear in CDA');

    // Re-publish for subsequent tests that might need it
    // First save a fresh draft to get a valid etag
    const draftRes = await authPost<{ etag: string }>(
      `/cma/v1/entries/${cdaEntryId}/save-draft`,
      { data: { title: 'CDA Test Article', slug: cdaSlug, body: articleBody('CDA body') } },
    );
    assert.equal(draftRes.status, 200);

    const repub = await authPost<{ etag: string }>(
      `/cma/v1/entries/${cdaEntryId}/publish`,
      {},
      undefined,
      { 'If-Match': `"${draftRes.body.etag}"` },
    );
    assert.equal(repub.status, 200);
    cdaEtag = repub.body.etag;
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Preview
// ═══════════════════════════════════════════════════════════════════════════

describe('Preview', { concurrency: 1 }, () => {
  before(async () => {
    token = await getAdminToken();
    spaceId = await getSpaceId();
  });

  const previewSlug = uniqueSlug('preview');
  const previewSlug2 = uniqueSlug('preview2');
  let previewEntryId: string;
  let previewEntry2Id: string;
  let unscopedPreviewToken: string;
  let scopedPreviewToken: string;

  // Create two draft entries for preview tests
  before(async () => {
    const e1 = await authPost<{ id: string; latestVersion: { etag: string } }>('/cma/v1/entries', {
      contentTypeKey: 'article',
      slug: previewSlug,
      data: { title: 'Preview Draft', slug: previewSlug, body: articleBody('draft content') },
    });
    assert.equal(e1.status, 201);
    previewEntryId = e1.body.id;

    const e2 = await authPost<{ id: string; latestVersion: { etag: string } }>('/cma/v1/entries', {
      contentTypeKey: 'article',
      slug: previewSlug2,
      data: { title: 'Preview Draft 2', slug: previewSlug2, body: articleBody('draft content 2') },
    });
    assert.equal(e2.status, 201);
    previewEntry2Id = e2.body.id;
  });

  after(async () => {
    await authDelete(`/cma/v1/entries/${previewEntryId}`).catch(() => {});
    await authDelete(`/cma/v1/entries/${previewEntry2Id}`).catch(() => {});
  });

  it('Create preview token (unscoped)', async () => {
    const res = await authPost<{ token: string; id: string; spaceId: string }>(
      '/cma/v1/auth/preview-tokens',
      { expiresInSeconds: 600 },
    );

    assert.equal(res.status, 201);
    assert.ok(res.body.token, 'should return raw token');
    assert.ok(res.body.token.startsWith('hlp_'), 'token should have hlp_ prefix');
    unscopedPreviewToken = res.body.token;
  });

  it('Preview returns draft content', async () => {
    const res = await api<{
      id: string;
      slug: string;
      data: Record<string, unknown>;
      status: string;
    }>(`/preview/v1/content/article/${previewEntryId}`, {
      token: unscopedPreviewToken,
      spaceId,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.id, previewEntryId);
    assert.equal(res.body.slug, previewSlug);
    assert.equal(res.body.data.title, 'Preview Draft');
    assert.equal(res.body.status, 'draft');
  });

  it('Create entry-scoped preview token', async () => {
    const res = await authPost<{ token: string; id: string; entryId: string }>(
      '/cma/v1/auth/preview-tokens',
      { entryId: previewEntryId, expiresInSeconds: 600 },
    );

    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.entryId, previewEntryId);
    scopedPreviewToken = res.body.token;
  });

  it('Preview with entry-scoped token can read scoped entry', async () => {
    const res = await api<{ id: string }>(`/preview/v1/content/article/${previewEntryId}`, {
      token: scopedPreviewToken,
      spaceId,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.id, previewEntryId);
  });

  it('Preview with entry-scoped token cannot read different entry (403)', async () => {
    const res = await api(`/preview/v1/content/article/${previewEntry2Id}`, {
      token: scopedPreviewToken,
      spaceId,
    });

    assert.equal(res.status, 403);
    assert.equal((res.body as Record<string, unknown>).error, 'preview_scope_denied');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Security
// ═══════════════════════════════════════════════════════════════════════════

describe('Security', () => {
  before(async () => {
    token = await getAdminToken();
    spaceId = await getSpaceId();
  });

  let cdaOnlyToken: string;

  // Cleanup: track any API tokens we create (we can't easily delete them via
  // the API since there's no DELETE /api-tokens route, so we just let them expire).
  // For the expired token test we create one that expires immediately.

  it('Request without auth returns 401', async () => {
    const res = await api('/cma/v1/schemas/types', { spaceId });
    assert.equal(res.status, 401);
    assert.equal((res.body as Record<string, unknown>).error, 'authentication_required');
  });

  it('API token with cda:read scope cannot access CMA write routes', async () => {
    // Create an API token with only cda:read scope
    const createRes = await authPost<{ token: string; id: string; scopes: string[] }>(
      '/cma/v1/auth/api-tokens',
      { name: 'cda-read-only-test', scopes: ['cda:read'] },
    );
    assert.equal(createRes.status, 201);
    cdaOnlyToken = createRes.body.token;
    assert.ok(cdaOnlyToken.startsWith('hle_'), 'API token should have hle_ prefix');

    // Try to create a content type with the cda:read-only token
    const writeRes = await api('/cma/v1/schemas/types', {
      method: 'POST',
      token: cdaOnlyToken,
      spaceId,
      body: { key: 'should-fail', name: 'Should Fail' },
    });

    assert.equal(writeRes.status, 403);
    assert.equal((writeRes.body as Record<string, unknown>).error, 'insufficient_scope');
  });

  it('Expired token is rejected', async () => {
    // Create an API token that expires in 1 second
    const createRes = await authPost<{ token: string; id: string }>(
      '/cma/v1/auth/api-tokens',
      {
        name: 'expires-soon-test',
        scopes: ['cda:read'],
        expiresAt: new Date(Date.now() + 1000).toISOString(),
      },
    );
    assert.equal(createRes.status, 201);
    const expToken = createRes.body.token;

    // Wait for expiry
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Attempt to use the expired token
    const res = await api('/cma/v1/schemas/types', {
      token: expToken,
      spaceId,
    });

    assert.equal(res.status, 401);
    assert.equal((res.body as Record<string, unknown>).error, 'invalid_token');
  });
});
