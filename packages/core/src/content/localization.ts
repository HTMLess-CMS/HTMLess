import type { Field } from '@prisma/client';

/**
 * Resolve localized field values for a specific locale.
 *
 * For localized fields, entry data stores:
 *   { "title": { "en": "Hello", "es": "Hola" }, "body": "Not localized" }
 *
 * This function extracts the value for the requested locale (with fallback
 * to the default locale), and returns a flat object:
 *   { "title": "Hello", "body": "Not localized" }
 */
export function resolveLocale(
  data: Record<string, unknown>,
  fields: Field[],
  locale: string,
  defaultLocale: string,
): Record<string, unknown> {
  const localizedKeys = new Set(
    fields.filter((f) => f.localized).map((f) => f.key),
  );

  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (!localizedKeys.has(key)) {
      // Non-localized field — pass through as-is
      resolved[key] = value;
      continue;
    }

    // Localized field — value should be an object keyed by locale code
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const localeMap = value as Record<string, unknown>;
      if (locale in localeMap) {
        resolved[key] = localeMap[locale];
      } else if (defaultLocale in localeMap) {
        resolved[key] = localeMap[defaultLocale];
      } else {
        // Return first available locale value as last-resort fallback
        const keys = Object.keys(localeMap);
        resolved[key] = keys.length > 0 ? localeMap[keys[0]] : null;
      }
    } else {
      // Data not in expected locale-map format — pass through as-is
      resolved[key] = value;
    }
  }

  return resolved;
}
