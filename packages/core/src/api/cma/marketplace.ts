// ─── Marketplace CMA Endpoints ──────────────────────────────────────
// Browse, search, install, uninstall, submit, review, and administer
// marketplace extensions. Includes billing/revenue endpoints.

import { Router } from 'express';
import type { Router as IRouter, Request, Response } from 'express';
import { requireScope } from '../../auth/middleware.js';
import { prisma } from '../../db.js';
import {
  listAvailable,
  getMarketplaceExtension,
  installExtension,
  uninstallExtension,
  isInstalled,
  listInstalled,
} from '../../extensions/marketplace.js';
import type { MarketplaceCategory } from '../../extensions/marketplace.js';
import {
  recordInstallBilling,
  getRevenueReport,
  getPlatformBillingSummary,
} from '../../extensions/billing.js';

const router: IRouter = Router();

// ─── Helpers ───

function getSpaceId(req: Request): string | undefined {
  return (req.params as Record<string, string>).spaceId ?? (req.headers['x-space-id'] as string | undefined);
}

function getUserId(req: Request): string | undefined {
  return req.auth?.userId;
}

function isAdmin(req: Request): boolean {
  // For now: users authenticated with scope-based tokens or user JWTs
  // are considered admin when they have schema.admin (enforced by middleware upstream).
  // A dedicated admin flag could be added later.
  return req.auth?.type === 'user';
}

const VALID_CATEGORIES = new Set<string>([
  'ai', 'analytics', 'commerce', 'media', 'seo', 'notifications', 'integration', 'utility',
]);

const VALID_SORT = new Set(['popular', 'newest', 'rating']);
const VALID_PRICING = new Set(['free', 'paid', 'freemium']);

// ─── GET /marketplace ───────────────────────────────────────────────
// List available extensions with filters: ?category=, ?pricing=, ?search=, ?sort=, ?page=, ?limit=
router.get('/', requireScope('cma:read', 'cma:write'), async (req: Request, res: Response) => {
  const spaceId = getSpaceId(req);
  const categoryParam = req.query.category as string | undefined;
  const pricingParam = req.query.pricing as string | undefined;
  const searchParam = req.query.search as string | undefined;
  const sortParam = (req.query.sort as string | undefined) ?? 'popular';
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

  // Validate category
  let category: MarketplaceCategory | undefined;
  if (categoryParam) {
    if (!VALID_CATEGORIES.has(categoryParam)) {
      res.status(400).json({
        error: 'validation_error',
        message: `Invalid category "${categoryParam}". Valid: ${Array.from(VALID_CATEGORIES).join(', ')}`,
      });
      return;
    }
    category = categoryParam as MarketplaceCategory;
  }

  // Validate sort
  if (!VALID_SORT.has(sortParam)) {
    res.status(400).json({
      error: 'validation_error',
      message: `Invalid sort "${sortParam}". Valid: ${Array.from(VALID_SORT).join(', ')}`,
    });
    return;
  }

  // Get from in-memory catalog
  let extensions = listAvailable(category);

  // Filter by pricing
  if (pricingParam) {
    if (!VALID_PRICING.has(pricingParam)) {
      res.status(400).json({
        error: 'validation_error',
        message: `Invalid pricing "${pricingParam}". Valid: ${Array.from(VALID_PRICING).join(', ')}`,
      });
      return;
    }
    extensions = extensions.filter((ext) => ext.pricing === pricingParam);
  }

  // Search by name/description
  if (searchParam) {
    const lower = searchParam.toLowerCase();
    extensions = extensions.filter(
      (ext) =>
        ext.name.toLowerCase().includes(lower) ||
        ext.description.toLowerCase().includes(lower),
    );
  }

  // Also pull DB listings (approved) and merge
  const dbListings = await prisma.marketplaceListing.findMany({
    where: {
      status: 'approved',
      ...(categoryParam ? { category: categoryParam } : {}),
      ...(pricingParam ? { pricing: pricingParam } : {}),
      ...(searchParam
        ? {
            OR: [
              { name: { contains: searchParam, mode: 'insensitive' as const } },
              { description: { contains: searchParam, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
  });

  // Build a combined list: in-memory catalog items + DB listings (no duplicates)
  const catalogKeys = new Set(extensions.map((e) => e.key));
  const dbItems = dbListings
    .filter((l) => !catalogKeys.has(l.extensionKey))
    .map((l) => ({
      key: l.extensionKey,
      name: l.name,
      version: l.version,
      author: l.author,
      description: l.description,
      repository: l.repository,
      homepage: l.homepage,
      license: l.license,
      pricing: l.pricing as 'free' | 'paid' | 'freemium',
      price: l.priceMonthly ?? undefined,
      category: l.category as MarketplaceCategory,
      downloads: l.downloads,
      rating: l.rating,
      reviewCount: l.reviewCount,
      iconUrl: l.iconUrl,
    }));

  // Merge into items with sort-friendly shape
  type ListItem = {
    key: string;
    name: string;
    version: string;
    author: string;
    description: string;
    pricing: string;
    price?: number;
    category: string;
    downloads?: number;
    rating?: number | null;
    reviewCount?: number;
    installed: boolean;
    [k: string]: unknown;
  };

  let items: ListItem[] = [
    ...extensions.map((ext) => ({
      ...ext,
      downloads: 0,
      rating: null as number | null,
      reviewCount: 0,
      installed: spaceId ? isInstalled(spaceId, ext.key) : false,
    })),
    ...dbItems.map((item) => ({
      ...item,
      permissions: [] as string[],
      manifest: {} as Record<string, unknown>,
      installed: spaceId ? isInstalled(spaceId, item.key) : false,
    })),
  ];

  // Sort
  if (sortParam === 'popular') {
    items.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
  } else if (sortParam === 'newest') {
    // Built-in items first (no createdAt), then by name
    items.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortParam === 'rating') {
    items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  // Paginate
  const total = items.length;
  const offset = (page - 1) * limit;
  items = items.slice(offset, offset + limit);

  res.json({
    items,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    categories: Array.from(VALID_CATEGORIES),
  });
});

// ─── GET /marketplace/installed ─────────────────────────────────────
router.get('/installed', requireScope('cma:read', 'cma:write'), async (req: Request, res: Response) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const installedKeys = listInstalled(spaceId);
  const items = installedKeys
    .map((key) => getMarketplaceExtension(key))
    .filter(Boolean);

  res.json({ items, total: items.length });
});

// ─── GET /marketplace/billing ───────────────────────────────────────
// Platform-wide billing summary (admin only).
router.get('/billing', requireScope('cma:write'), async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
    return;
  }

  const summary = await getPlatformBillingSummary();
  res.json(summary);
});

// ─── GET /marketplace/:key ──────────────────────────────────────────
// Full listing with reviews.
router.get('/:key', requireScope('cma:read', 'cma:write'), async (req: Request, res: Response) => {
  const spaceId = getSpaceId(req);
  const key = req.params.key as string;

  // Try in-memory catalog first
  const catalogExt = getMarketplaceExtension(key);

  // Try DB listing
  const dbListing = await prisma.marketplaceListing.findUnique({
    where: { extensionKey: key },
    include: {
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!catalogExt && !dbListing) {
    res.status(404).json({ error: 'not_found', message: `Extension "${key}" not found` });
    return;
  }

  const installed = spaceId ? isInstalled(spaceId, key) : false;

  if (dbListing) {
    res.json({
      key: dbListing.extensionKey,
      name: dbListing.name,
      version: dbListing.version,
      author: dbListing.author,
      authorEmail: dbListing.authorEmail,
      description: dbListing.description,
      longDescription: dbListing.longDescription,
      repository: dbListing.repository,
      homepage: dbListing.homepage,
      iconUrl: dbListing.iconUrl,
      screenshotUrls: dbListing.screenshotUrls,
      category: dbListing.category,
      tags: dbListing.tags,
      pricing: dbListing.pricing,
      priceMonthly: dbListing.priceMonthly,
      license: dbListing.license,
      downloads: dbListing.downloads,
      rating: dbListing.rating,
      reviewCount: dbListing.reviewCount,
      status: dbListing.status,
      manifest: dbListing.manifest,
      reviews: dbListing.reviews,
      installed,
    });
    return;
  }

  // Return from catalog
  res.json({
    ...catalogExt,
    downloads: 0,
    rating: null,
    reviewCount: 0,
    reviews: [],
    installed,
  });
});

// ─── POST /marketplace/submit ───────────────────────────────────────
// Submit an extension for marketplace review.
router.post('/submit', requireScope('cma:write'), async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  const requiredFields = ['extensionKey', 'name', 'description', 'author', 'category', 'version', 'manifest'];
  for (const field of requiredFields) {
    if (!body[field]) {
      res.status(400).json({
        error: 'validation_error',
        message: `Field "${field}" is required`,
      });
      return;
    }
  }

  const categoryVal = body.category as string;
  if (!VALID_CATEGORIES.has(categoryVal)) {
    res.status(400).json({
      error: 'validation_error',
      message: `Invalid category "${categoryVal}". Valid: ${Array.from(VALID_CATEGORIES).join(', ')}`,
    });
    return;
  }

  // Check for duplicate
  const existing = await prisma.marketplaceListing.findUnique({
    where: { extensionKey: body.extensionKey as string },
  });

  if (existing) {
    res.status(409).json({
      error: 'conflict',
      message: `Extension "${body.extensionKey}" has already been submitted`,
    });
    return;
  }

  const listing = await prisma.marketplaceListing.create({
    data: {
      extensionKey: body.extensionKey as string,
      name: body.name as string,
      description: body.description as string,
      longDescription: (body.longDescription as string) ?? null,
      author: body.author as string,
      authorEmail: (body.authorEmail as string) ?? null,
      repository: (body.repository as string) ?? null,
      homepage: (body.homepage as string) ?? null,
      iconUrl: (body.iconUrl as string) ?? null,
      screenshotUrls: (body.screenshotUrls as string[]) ?? null,
      category: categoryVal,
      tags: (body.tags as string[]) ?? null,
      pricing: (body.pricing as string) ?? 'free',
      priceMonthly: (body.priceMonthly as number) ?? null,
      license: (body.license as string) ?? 'MIT',
      version: body.version as string,
      manifest: body.manifest as object,
      status: 'pending',
    },
  });

  res.status(201).json({
    id: listing.id,
    extensionKey: listing.extensionKey,
    status: listing.status,
    submittedAt: listing.submittedAt,
    message: 'Extension submitted for review',
  });
});

// ─── POST /marketplace/:key/review ──────────────────────────────────
// Submit a review for an extension.
router.post('/:key/review', requireScope('cma:write'), async (req: Request, res: Response) => {
  const key = req.params.key as string;
  const userId = getUserId(req);

  if (!userId) {
    res.status(401).json({ error: 'authentication_required', message: 'User ID required to submit review' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const rating = body.rating as number;

  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    res.status(400).json({
      error: 'validation_error',
      message: 'Rating must be an integer between 1 and 5',
    });
    return;
  }

  // Find the listing
  const listing = await prisma.marketplaceListing.findUnique({
    where: { extensionKey: key },
  });

  if (!listing) {
    res.status(404).json({ error: 'not_found', message: `Extension "${key}" not found in marketplace` });
    return;
  }

  // Upsert the review (one per user per listing)
  const review = await prisma.marketplaceReview.upsert({
    where: {
      listingId_userId: { listingId: listing.id, userId },
    },
    update: {
      rating,
      title: (body.title as string) ?? null,
      body: (body.body as string) ?? null,
    },
    create: {
      listingId: listing.id,
      userId,
      rating,
      title: (body.title as string) ?? null,
      body: (body.body as string) ?? null,
    },
  });

  // Recalculate aggregate rating
  const stats = await prisma.marketplaceReview.aggregate({
    where: { listingId: listing.id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.marketplaceListing.update({
    where: { id: listing.id },
    data: {
      rating: stats._avg.rating,
      reviewCount: stats._count.rating,
    },
  });

  res.status(201).json({
    id: review.id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    createdAt: review.createdAt,
  });
});

// ─── GET /marketplace/:key/reviews ──────────────────────────────────
router.get('/:key/reviews', requireScope('cma:read', 'cma:write'), async (req: Request, res: Response) => {
  const key = req.params.key as string;
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

  const listing = await prisma.marketplaceListing.findUnique({
    where: { extensionKey: key },
  });

  if (!listing) {
    // If it's a catalog-only extension with no DB listing, return empty reviews
    if (getMarketplaceExtension(key)) {
      res.json({ items: [], total: 0, page, limit, pages: 0 });
      return;
    }
    res.status(404).json({ error: 'not_found', message: `Extension "${key}" not found` });
    return;
  }

  const [reviews, total] = await Promise.all([
    prisma.marketplaceReview.findMany({
      where: { listingId: listing.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.marketplaceReview.count({ where: { listingId: listing.id } }),
  ]);

  res.json({
    items: reviews,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    averageRating: listing.rating,
  });
});

// ─── POST /marketplace/:key/install ─────────────────────────────────
router.post('/:key/install', requireScope('cma:write'), async (req: Request, res: Response) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const key = req.params.key as string;

  try {
    await installExtension(spaceId, key);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Installation failed';

    if (message.includes('not found')) {
      res.status(404).json({ error: 'not_found', message });
      return;
    }
    if (message.includes('already installed')) {
      res.status(409).json({ error: 'conflict', message });
      return;
    }

    res.status(400).json({ error: 'install_error', message });
    return;
  }

  // Increment downloads counter in DB if listing exists
  await prisma.marketplaceListing.updateMany({
    where: { extensionKey: key },
    data: { downloads: { increment: 1 } },
  });

  // Record billing for paid extensions
  const catalogExt = getMarketplaceExtension(key);
  const dbListing = await prisma.marketplaceListing.findUnique({
    where: { extensionKey: key },
  });
  const priceMonthly = dbListing?.priceMonthly ?? catalogExt?.price ?? 0;

  let billingRecord = null;
  if (priceMonthly > 0) {
    billingRecord = await recordInstallBilling(key, spaceId, priceMonthly);
  }

  const extension = catalogExt;

  res.status(201).json({
    installed: true,
    extension: extension
      ? { key: extension.key, name: extension.name, version: extension.version }
      : { key },
    spaceId,
    billing: billingRecord
      ? {
          amount: billingRecord.amount,
          currency: billingRecord.currency,
          authorShare: billingRecord.authorShare,
          platformShare: billingRecord.platformShare,
        }
      : null,
  });
});

// ─── POST /marketplace/:key/uninstall ───────────────────────────────
router.post('/:key/uninstall', requireScope('cma:write'), async (req: Request, res: Response) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const key = req.params.key as string;

  try {
    await uninstallExtension(spaceId, key);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Uninstall failed';

    if (message.includes('not installed')) {
      res.status(404).json({ error: 'not_found', message });
      return;
    }

    res.status(400).json({ error: 'uninstall_error', message });
    return;
  }

  res.json({
    uninstalled: true,
    extensionKey: key,
    spaceId,
  });
});

// ─── GET /marketplace/:key/revenue ──────────────────────────────────
// Revenue report for an extension author.
router.get('/:key/revenue', requireScope('cma:read', 'cma:write'), async (req: Request, res: Response) => {
  const key = req.params.key as string;
  const report = await getRevenueReport(key);
  res.json(report);
});

// ─── Admin endpoints ────────────────────────────────────────────────

// POST /marketplace/:key/approve
router.post('/:key/approve', requireScope('cma:write'), async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
    return;
  }

  const key = req.params.key as string;

  const listing = await prisma.marketplaceListing.findUnique({
    where: { extensionKey: key },
  });

  if (!listing) {
    res.status(404).json({ error: 'not_found', message: `Listing for "${key}" not found` });
    return;
  }

  if (listing.status === 'approved') {
    res.status(400).json({ error: 'already_approved', message: 'Listing is already approved' });
    return;
  }

  const updated = await prisma.marketplaceListing.update({
    where: { extensionKey: key },
    data: {
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  res.json({
    extensionKey: updated.extensionKey,
    status: updated.status,
    approvedAt: updated.approvedAt,
  });
});

// POST /marketplace/:key/reject
router.post('/:key/reject', requireScope('cma:write'), async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
    return;
  }

  const key = req.params.key as string;
  const body = req.body as Record<string, unknown>;
  const reason = (body.reason as string) ?? 'No reason provided';

  const listing = await prisma.marketplaceListing.findUnique({
    where: { extensionKey: key },
  });

  if (!listing) {
    res.status(404).json({ error: 'not_found', message: `Listing for "${key}" not found` });
    return;
  }

  const updated = await prisma.marketplaceListing.update({
    where: { extensionKey: key },
    data: {
      status: 'rejected',
      rejectionReason: reason,
    },
  });

  res.json({
    extensionKey: updated.extensionKey,
    status: updated.status,
    rejectionReason: updated.rejectionReason,
  });
});

export default router;
