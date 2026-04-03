// ─── Extension Billing & Revenue Share ──────────────────────────────
// Stub billing system for paid marketplace extensions.
// Tracks install-based billing events and computes 70/30 revenue split.

// ─── Types ──────────────────────────────────────────────────────────

export interface BillingRecord {
  id: string;
  extensionKey: string;
  spaceId: string;
  amount: number;
  currency: 'USD';
  period: string;
  authorShare: number;
  platformShare: number;
  status: 'pending' | 'paid';
  createdAt: string;
}

export interface RevenueReport {
  extensionKey: string;
  totalRevenue: number;
  authorEarnings: number;
  platformEarnings: number;
  activeInstalls: number;
  records: BillingRecord[];
}

export interface PlatformBillingSummary {
  totalRevenue: number;
  totalAuthorPayouts: number;
  totalPlatformRevenue: number;
  extensionCount: number;
  extensions: {
    extensionKey: string;
    totalRevenue: number;
    authorEarnings: number;
    platformEarnings: number;
    activeInstalls: number;
  }[];
}

// ─── Default revenue share: 70% author, 30% platform ───────────────

const DEFAULT_AUTHOR_SHARE_PERCENT = 70;

// ─── In-memory billing ledger (stub — production would use a DB) ────

const billingLedger: BillingRecord[] = [];
let nextId = 1;

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Calculate revenue split between author and platform.
 * @param priceMonthly — price in cents
 * @param sharePercent — author share percentage (default 70)
 */
export function calculateRevenue(
  priceMonthly: number,
  sharePercent: number = DEFAULT_AUTHOR_SHARE_PERCENT,
): { authorAmount: number; platformAmount: number } {
  const authorAmount = Math.round(priceMonthly * (sharePercent / 100));
  const platformAmount = priceMonthly - authorAmount;
  return { authorAmount, platformAmount };
}

/**
 * Record a billing event when a paid extension is installed.
 * In production this would create a Stripe subscription or charge.
 */
export async function recordInstallBilling(
  extensionKey: string,
  spaceId: string,
  priceMonthly: number,
): Promise<BillingRecord> {
  const { authorAmount, platformAmount } = calculateRevenue(priceMonthly);
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const record: BillingRecord = {
    id: `bill_${nextId++}`,
    extensionKey,
    spaceId,
    amount: priceMonthly,
    currency: 'USD',
    period,
    authorShare: authorAmount,
    platformShare: platformAmount,
    status: 'pending',
    createdAt: now.toISOString(),
  };

  billingLedger.push(record);

  // eslint-disable-next-line no-console
  console.info(
    `[billing] Recorded install billing: ${extensionKey} in space ${spaceId} — ` +
    `$${(priceMonthly / 100).toFixed(2)}/mo (author: $${(authorAmount / 100).toFixed(2)}, ` +
    `platform: $${(platformAmount / 100).toFixed(2)})`,
  );

  return record;
}

/**
 * Get a revenue report for a specific extension.
 */
export async function getRevenueReport(extensionKey: string): Promise<RevenueReport> {
  const records = billingLedger.filter((r) => r.extensionKey === extensionKey);
  const totalRevenue = records.reduce((sum, r) => sum + r.amount, 0);
  const authorEarnings = records.reduce((sum, r) => sum + r.authorShare, 0);
  const platformEarnings = records.reduce((sum, r) => sum + r.platformShare, 0);

  // Count unique active installs (unique spaceIds)
  const activeInstalls = new Set(records.map((r) => r.spaceId)).size;

  return {
    extensionKey,
    totalRevenue,
    authorEarnings,
    platformEarnings,
    activeInstalls,
    records,
  };
}

/**
 * Get platform-wide billing summary.
 */
export async function getPlatformBillingSummary(): Promise<PlatformBillingSummary> {
  // Group by extension key
  const byExtension = new Map<string, BillingRecord[]>();
  for (const record of billingLedger) {
    const list = byExtension.get(record.extensionKey) ?? [];
    list.push(record);
    byExtension.set(record.extensionKey, list);
  }

  const extensions = Array.from(byExtension.entries()).map(([key, records]) => ({
    extensionKey: key,
    totalRevenue: records.reduce((sum, r) => sum + r.amount, 0),
    authorEarnings: records.reduce((sum, r) => sum + r.authorShare, 0),
    platformEarnings: records.reduce((sum, r) => sum + r.platformShare, 0),
    activeInstalls: new Set(records.map((r) => r.spaceId)).size,
  }));

  return {
    totalRevenue: billingLedger.reduce((sum, r) => sum + r.amount, 0),
    totalAuthorPayouts: billingLedger.reduce((sum, r) => sum + r.authorShare, 0),
    totalPlatformRevenue: billingLedger.reduce((sum, r) => sum + r.platformShare, 0),
    extensionCount: byExtension.size,
    extensions,
  };
}

/**
 * Get all billing records (for testing/admin).
 */
export function getAllBillingRecords(): BillingRecord[] {
  return [...billingLedger];
}
