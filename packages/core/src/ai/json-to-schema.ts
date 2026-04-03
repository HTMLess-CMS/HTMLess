// ─── JSON → Schema Analyzer ───
//
// Paste any JSON blob — object or array-of-objects — and get a fully
// scaffolded content-type schema plus ready-to-import entries.

import type {
  FieldSpec,
  ContentTypeSpec,
  GeneratedSchema,
} from './schema-generator.js';

// ─── Public types ──────────────────────────────────────────────────────

export interface JsonAnalysisResult extends GeneratedSchema {
  sampleEntries: Record<string, unknown>[];
}

// ─── Type inference helpers ────────────────────────────────────────────

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|svg|tiff?|bmp|ico)(\?.*)?$/i;
const URL_PATTERN = /^https?:\/\//i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?([Zz]|[+-]\d{2}:?\d{2})?)?$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function inferFieldType(key: string, value: unknown): string {
  if (value === null || value === undefined) return 'text';

  if (typeof value === 'boolean') return 'boolean';

  if (typeof value === 'number') return 'number';

  if (typeof value === 'string') {
    if (ISO_DATE_PATTERN.test(value)) return 'date';
    if (URL_PATTERN.test(value) && IMAGE_EXTENSIONS.test(value)) return 'media';
    if (URL_PATTERN.test(value)) return 'text';
    if (EMAIL_PATTERN.test(value)) return 'text';
    if (SLUG_PATTERN.test(value) && key.toLowerCase().includes('slug')) return 'slug';
    if (value.length > 500) return 'richtext';
    return 'text';
  }

  if (Array.isArray(value)) return 'json';

  if (typeof value === 'object') return 'json';

  return 'text';
}

// ─── Name formatting ───────────────────────────────────────────────────

function titleCase(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}

function camelCase(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

function slugifyKey(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Merge multiple samples to get the richest type map ────────────────

function mergeFieldTypes(
  samples: Record<string, unknown>[],
): Map<string, string> {
  const fieldTypes = new Map<string, string>();

  for (const sample of samples) {
    for (const [key, value] of Object.entries(sample)) {
      const inferred = inferFieldType(key, value);
      const existing = fieldTypes.get(key);

      // Keep the richer/more specific type
      if (!existing || existing === 'text') {
        fieldTypes.set(key, inferred);
      }
    }
  }

  return fieldTypes;
}

// ─── Guess content-type key from shape ─────────────────────────────────

function guessContentTypeKey(fields: string[]): string {
  const lowerFields = new Set(fields.map((f) => f.toLowerCase()));

  if (lowerFields.has('price') || lowerFields.has('sku')) return 'product';
  if (lowerFields.has('question') && lowerFields.has('answer')) return 'faq';
  if (lowerFields.has('recipe') || lowerFields.has('ingredients')) return 'recipe';
  if (lowerFields.has('quote') && (lowerFields.has('rating') || lowerFields.has('company'))) return 'testimonial';
  if (lowerFields.has('bio') || lowerFields.has('role')) return 'person';
  if (lowerFields.has('body') || lowerFields.has('excerpt')) return 'article';
  if (lowerFields.has('date') && lowerFields.has('location')) return 'event';

  return 'item';
}

// ─── Main analyzer ─────────────────────────────────────────────────────

export function analyzeJson(
  json: unknown,
  typeName?: string,
): JsonAnalysisResult {
  // Normalize to array of objects
  let items: Record<string, unknown>[];

  if (Array.isArray(json)) {
    items = json.filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === 'object' && !Array.isArray(item),
    );
    if (items.length === 0) {
      throw new Error('Array must contain at least one object');
    }
  } else if (json !== null && typeof json === 'object' && !Array.isArray(json)) {
    items = [json as Record<string, unknown>];
  } else {
    throw new Error('Input must be a JSON object or array of objects');
  }

  // Analyze up to the first 10 items
  const sampled = items.slice(0, 10);
  const fieldTypes = mergeFieldTypes(sampled);

  // Determine content type key
  const allKeys = Array.from(fieldTypes.keys());
  const key = typeName ? slugifyKey(typeName) : guessContentTypeKey(allKeys);
  const name = typeName ? titleCase(typeName) : titleCase(key);

  // Build field specs
  const fields: FieldSpec[] = [];
  let order = 0;
  for (const [fieldKey, fieldType] of fieldTypes) {
    const normalizedKey = camelCase(fieldKey);
    fields.push({
      key: normalizedKey,
      name: titleCase(fieldKey),
      type: fieldType,
      required: false,
      localized: false,
      unique: normalizedKey === 'slug' || normalizedKey === 'sku',
      sortOrder: order++,
    });
  }

  // Mark the first text field as required (likely the title/name)
  const firstTextField = fields.find(
    (fld) => fld.type === 'text' && !fld.key.toLowerCase().includes('seo'),
  );
  if (firstTextField) {
    firstTextField.required = true;
  }

  const contentType: ContentTypeSpec = {
    key,
    name,
    description: `Auto-generated from JSON data (${items.length} item${items.length === 1 ? '' : 's'} analyzed)`,
    fields,
  };

  // Build sample entries — map to normalized keys
  const sampleEntries: Record<string, unknown>[] = items.map((item) => {
    const entry: Record<string, unknown> = {};
    for (const [rawKey, value] of Object.entries(item)) {
      entry[camelCase(rawKey)] = value;
    }
    return entry;
  });

  return {
    contentTypes: [contentType],
    suggestedTemplateName: `${key}-template`,
    sampleEntries,
  };
}
