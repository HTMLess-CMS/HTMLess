/**
 * Unified template registry.
 * Merges the free built-in templates with premium marketplace templates,
 * providing a single API surface for template discovery and lookup.
 */

import type { Template } from './templates.js';
import { getTemplates as getBuiltInTemplates, getTemplate as getBuiltInTemplate } from './templates.js';
import type { PremiumTemplate } from './premium-templates.js';
import { getPremiumTemplates as getPremiumList, getPremiumTemplate as getPremiumByKey } from './premium-templates.js';

// Re-export the PremiumTemplate type so consumers can import from one place
export type { PremiumTemplate } from './premium-templates.js';

export interface TemplateListItem {
  key: string;
  name: string;
  description: string;
  premium: boolean;
  price?: number;
  currency?: 'USD';
  features?: string[];
  previewUrl?: string;
  contentTypeKeys: string[];
  taxonomyKeys: string[];
  localeCodes: string[];
}

// ─── Queries ────────────────────────────────────────────────────────

/** All templates (free + premium), ordered free-first. */
export function getAllTemplates(): Template[] {
  return [...getBuiltInTemplates(), ...getPremiumList()];
}

/** Look up any template by key (free or premium). */
export function getTemplate(key: string): Template | undefined {
  return getBuiltInTemplate(key) ?? getPremiumByKey(key);
}

/** All premium templates. */
export function getPremiumTemplates(): PremiumTemplate[] {
  return getPremiumList();
}

/** Check if a template key corresponds to a premium template. */
export function isPremiumTemplate(key: string): boolean {
  return getPremiumByKey(key) !== undefined;
}

/** Get a premium template by key, or undefined for free templates. */
export function getPremiumTemplate(key: string): PremiumTemplate | undefined {
  return getPremiumByKey(key);
}

// ─── List helpers ───────────────────────────────────────────────────

function toListItem(t: Template, premium: boolean): TemplateListItem {
  const item: TemplateListItem = {
    key: t.key,
    name: t.name,
    description: t.description,
    premium,
    contentTypeKeys: t.contentTypes.map((ct) => ct.key),
    taxonomyKeys: t.taxonomies.map((tx) => tx.key),
    localeCodes: t.locales.map((l) => l.code),
  };

  if (premium) {
    const p = t as PremiumTemplate;
    item.price = p.price;
    item.currency = p.currency;
    item.features = p.features;
    item.previewUrl = p.previewUrl;
  }

  return item;
}

/** Returns a lightweight list suitable for API responses. */
export function listAllTemplates(): TemplateListItem[] {
  const free = getBuiltInTemplates().map((t) => toListItem(t, false));
  const premium = getPremiumList().map((t) => toListItem(t, true));
  return [...free, ...premium];
}
