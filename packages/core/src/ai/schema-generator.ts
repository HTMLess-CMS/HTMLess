// ─── AI Schema Generation — Smart Pattern Matching ───
//
// Analyzes natural-language prompts and produces rich, production-ready
// content-type schemas.  Wire to OpenAI / Anthropic via extension hooks
// when you want LLM-grade results; the local engine already covers the
// most common CMS patterns with zero latency.

// ─── Public types ──────────────────────────────────────────────────────

export interface FieldSpec {
  key: string;
  name: string;
  type: string;
  required: boolean;
  localized: boolean;
  unique: boolean;
  enumValues?: string[];
  referenceTarget?: string;
  validations?: Record<string, unknown>;
  defaultValue?: unknown;
  sortOrder: number;
}

export interface ContentTypeSpec {
  key: string;
  name: string;
  description: string;
  fields: FieldSpec[];
}

export interface TaxonomySpec {
  key: string;
  name: string;
  hierarchical: boolean;
  suggestedTerms?: string[];
}

export interface GeneratedSchema {
  contentTypes: ContentTypeSpec[];
  taxonomies?: TaxonomySpec[];
  locales?: string[];
  suggestedTemplateName: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function f(
  key: string,
  name: string,
  type: string,
  order: number,
  opts: Partial<FieldSpec> = {},
): FieldSpec {
  return {
    key,
    name,
    type,
    required: opts.required ?? false,
    localized: opts.localized ?? false,
    unique: opts.unique ?? false,
    sortOrder: order,
    ...(opts.enumValues && { enumValues: opts.enumValues }),
    ...(opts.referenceTarget && { referenceTarget: opts.referenceTarget }),
    ...(opts.validations && { validations: opts.validations }),
    ...(opts.defaultValue !== undefined && { defaultValue: opts.defaultValue }),
  };
}

function titleCase(s: string): string {
  return s.replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function camelCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, c: string) => c.toUpperCase());
}

// ─── Preset library ────────────────────────────────────────────────────

interface Preset {
  keywords: string[];
  type: Omit<ContentTypeSpec, 'fields'>;
  fields: FieldSpec[];
  taxonomies?: TaxonomySpec[];
}

const presets: Preset[] = [
  {
    keywords: ['blog', 'article', 'post'],
    type: { key: 'article', name: 'Article', description: 'Blog post or article' },
    fields: [
      f('title', 'Title', 'text', 0, { required: true }),
      f('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
      f('body', 'Body', 'richtext', 2, { required: true }),
      f('excerpt', 'Excerpt', 'text', 3),
      f('author', 'Author', 'reference', 4, { referenceTarget: 'person' }),
      f('featuredImage', 'Featured Image', 'media', 5),
      f('publishedDate', 'Published Date', 'date', 6),
      f('category', 'Category', 'enum', 7, {
        enumValues: ['general', 'tutorial', 'news', 'opinion', 'review'],
      }),
    ],
    taxonomies: [
      { key: 'article-category', name: 'Article Category', hierarchical: true, suggestedTerms: ['General', 'Tutorial', 'News', 'Opinion', 'Review'] },
    ],
  },
  {
    keywords: ['product', 'shop', 'store', 'ecommerce', 'e-commerce'],
    type: { key: 'product', name: 'Product', description: 'E-commerce product listing' },
    fields: [
      f('name', 'Name', 'text', 0, { required: true }),
      f('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
      f('description', 'Description', 'richtext', 2),
      f('price', 'Price', 'number', 3, { required: true, validations: { min: 0 } }),
      f('images', 'Images', 'media', 4),
      f('category', 'Category', 'text', 5),
      f('sku', 'SKU', 'text', 6, { unique: true }),
      f('inStock', 'In Stock', 'boolean', 7, { defaultValue: true }),
      f('weight', 'Weight', 'number', 8),
    ],
    taxonomies: [
      { key: 'product-category', name: 'Product Category', hierarchical: true, suggestedTerms: ['Clothing', 'Electronics', 'Home', 'Accessories'] },
    ],
  },
  {
    keywords: ['page', 'landing', 'website'],
    type: { key: 'page', name: 'Page', description: 'Static or landing page' },
    fields: [
      f('title', 'Title', 'text', 0, { required: true }),
      f('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
      f('heroTitle', 'Hero Title', 'text', 2),
      f('heroSubtitle', 'Hero Subtitle', 'text', 3),
      f('heroImage', 'Hero Image', 'media', 4),
      f('body', 'Body', 'richtext', 5),
      f('seoTitle', 'SEO Title', 'text', 6),
      f('seoDescription', 'SEO Description', 'text', 7),
    ],
  },
  {
    keywords: ['event', 'conference', 'meetup'],
    type: { key: 'event', name: 'Event', description: 'Event or conference listing' },
    fields: [
      f('title', 'Title', 'text', 0, { required: true }),
      f('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
      f('description', 'Description', 'richtext', 2),
      f('date', 'Start Date', 'date', 3, { required: true }),
      f('endDate', 'End Date', 'date', 4),
      f('location', 'Location', 'text', 5),
      f('capacity', 'Capacity', 'number', 6),
      f('image', 'Image', 'media', 7),
      f('registrationUrl', 'Registration URL', 'text', 8),
    ],
  },
  {
    keywords: ['team', 'member', 'staff', 'people'],
    type: { key: 'person', name: 'Person', description: 'Team member or staff profile' },
    fields: [
      f('name', 'Name', 'text', 0, { required: true }),
      f('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
      f('role', 'Role', 'text', 2),
      f('bio', 'Bio', 'richtext', 3),
      f('photo', 'Photo', 'media', 4),
      f('email', 'Email', 'text', 5),
      f('social', 'Social Links', 'json', 6),
    ],
  },
  {
    keywords: ['portfolio', 'project', 'work', 'case study'],
    type: { key: 'project', name: 'Project', description: 'Portfolio project or case study' },
    fields: [
      f('title', 'Title', 'text', 0, { required: true }),
      f('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
      f('description', 'Description', 'richtext', 2),
      f('images', 'Images', 'media', 3),
      f('client', 'Client', 'text', 4),
      f('year', 'Year', 'number', 5),
      f('category', 'Category', 'text', 6),
      f('url', 'Project URL', 'text', 7),
    ],
  },
  {
    keywords: ['faq', 'question', 'help'],
    type: { key: 'faq', name: 'FAQ', description: 'Frequently asked question' },
    fields: [
      f('question', 'Question', 'text', 0, { required: true }),
      f('answer', 'Answer', 'richtext', 1, { required: true }),
      f('category', 'Category', 'text', 2),
      f('sortOrder', 'Sort Order', 'number', 3, { defaultValue: 0 }),
    ],
  },
  {
    keywords: ['testimonial', 'review'],
    type: { key: 'testimonial', name: 'Testimonial', description: 'Customer testimonial or review' },
    fields: [
      f('author', 'Author', 'text', 0, { required: true }),
      f('role', 'Role', 'text', 1),
      f('company', 'Company', 'text', 2),
      f('quote', 'Quote', 'richtext', 3, { required: true }),
      f('rating', 'Rating', 'number', 4, { validations: { min: 1, max: 5 } }),
      f('photo', 'Photo', 'media', 5),
    ],
  },
  {
    keywords: ['recipe', 'food', 'cooking'],
    type: { key: 'recipe', name: 'Recipe', description: 'Food recipe with instructions' },
    fields: [
      f('title', 'Title', 'text', 0, { required: true }),
      f('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
      f('description', 'Description', 'text', 2),
      f('ingredients', 'Ingredients', 'json', 3, { required: true }),
      f('instructions', 'Instructions', 'richtext', 4, { required: true }),
      f('prepTime', 'Prep Time (minutes)', 'number', 5),
      f('cookTime', 'Cook Time (minutes)', 'number', 6),
      f('servings', 'Servings', 'number', 7),
      f('image', 'Image', 'media', 8),
      f('difficulty', 'Difficulty', 'enum', 9, { enumValues: ['easy', 'medium', 'hard'] }),
    ],
  },
  {
    keywords: ['docs', 'documentation', 'guide', 'tutorial'],
    type: { key: 'doc', name: 'Doc', description: 'Documentation page or guide' },
    fields: [
      f('title', 'Title', 'text', 0, { required: true }),
      f('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
      f('body', 'Body', 'richtext', 2, { required: true }),
      f('category', 'Category', 'text', 3),
      f('order', 'Order', 'number', 4, { defaultValue: 0 }),
      f('parentDoc', 'Parent Doc', 'reference', 5, { referenceTarget: 'doc' }),
    ],
  },
];

// ─── Field type keyword detection ──────────────────────────────────────

const fieldTypeHints: { pattern: RegExp; type: string; extra?: Partial<FieldSpec> }[] = [
  { pattern: /\bprice\b/i, type: 'number', extra: { validations: { min: 0 } } },
  { pattern: /\b(image|photo|picture|avatar|logo|thumbnail|banner|cover)\b/i, type: 'media' },
  { pattern: /\b(date|time|when|deadline|due|schedule)\b/i, type: 'date' },
  { pattern: /\b(body|content|description|bio|summary|details|instructions|notes)\b/i, type: 'richtext' },
  { pattern: /\b(email|e-mail)\b/i, type: 'text' },
  { pattern: /\b(url|link|href|website)\b/i, type: 'text' },
  { pattern: /\b(count|amount|quantity|number|rating|score|weight|height|width|size|age|year)\b/i, type: 'number' },
  { pattern: /\b(active|enabled|visible|published|featured|archived|boolean|flag|toggle|checkbox)\b/i, type: 'boolean' },
  { pattern: /\b(slug)\b/i, type: 'slug' },
  { pattern: /\b(tags|metadata|config|settings|options|data|json|social)\b/i, type: 'json' },
  { pattern: /\b(reference|relation|link to|belongs to)\b/i, type: 'reference' },
];

function inferFieldType(fieldDescription: string): string {
  for (const hint of fieldTypeHints) {
    if (hint.pattern.test(fieldDescription)) return hint.type;
  }
  return 'text';
}

function inferFieldExtras(fieldDescription: string): Partial<FieldSpec> {
  for (const hint of fieldTypeHints) {
    if (hint.pattern.test(fieldDescription) && hint.extra) return hint.extra;
  }
  return {};
}

// ─── Ad-hoc field extraction ───────────────────────────────────────────

function extractExplicitFields(prompt: string): FieldSpec[] {
  const fields: FieldSpec[] = [];
  const seenKeys = new Set<string>();

  // Pattern: "with a <field> field" / "with <field> and <field> fields"
  const withFieldsMatch = prompt.match(/with\s+((?:(?:an?\s+)?[\w\s]+(?:\s+field)?(?:\s*(?:,|and)\s*)?)+)/i);
  if (withFieldsMatch) {
    const chunk = withFieldsMatch[1];
    // Split on comma or " and "
    const parts = chunk.split(/\s*(?:,|(?:\band\b))\s*/i);
    for (const part of parts) {
      const cleaned = part
        .replace(/\b(?:an?\s+|the\s+|field[s]?)/gi, '')
        .trim();
      if (!cleaned || cleaned.length > 40) continue;

      const key = camelCase(cleaned);
      if (!key || seenKeys.has(key)) continue;
      seenKeys.add(key);

      const type = inferFieldType(cleaned);
      const extras = inferFieldExtras(cleaned);
      fields.push(
        f(key, titleCase(cleaned), type, fields.length, extras),
      );
    }
  }

  return fields;
}

// ─── Main generator ────────────────────────────────────────────────────

export async function generateSchemaFromPrompt(
  prompt: string,
): Promise<GeneratedSchema> {
  const lower = prompt.toLowerCase();

  const matched: Preset[] = [];
  const usedKeys = new Set<string>();

  // Match against preset keywords
  for (const preset of presets) {
    for (const kw of preset.keywords) {
      if (lower.includes(kw) && !usedKeys.has(preset.type.key)) {
        matched.push(preset);
        usedKeys.add(preset.type.key);
        break;
      }
    }
  }

  // Fallback: generic page type
  if (matched.length === 0) {
    const fallback = presets.find((p) => p.type.key === 'page')!;
    matched.push(fallback);
    usedKeys.add('page');
  }

  // Detect multilingual / localization
  const wantsLocalization =
    /\b(multilingual|translation[s]?|locali[sz]ed|i18n|multi[- ]?language)\b/i.test(prompt);
  const locales = wantsLocalization ? ['en', 'es', 'fr', 'de'] : undefined;

  // Build content types with optional localization
  const contentTypes: ContentTypeSpec[] = matched.map((preset) => {
    const fields = preset.fields.map((field) => ({
      ...field,
      localized: wantsLocalization
        ? ['text', 'richtext', 'slug'].includes(field.type)
        : field.localized,
    }));
    return { ...preset.type, fields };
  });

  // Merge any explicit fields from the prompt into the first content type
  const extraFields = extractExplicitFields(prompt);
  if (extraFields.length > 0 && contentTypes.length > 0) {
    const primary = contentTypes[0];
    const existingKeys = new Set(primary.fields.map((fld) => fld.key));
    for (const extra of extraFields) {
      if (!existingKeys.has(extra.key)) {
        primary.fields.push({
          ...extra,
          sortOrder: primary.fields.length,
          localized: wantsLocalization
            ? ['text', 'richtext', 'slug'].includes(extra.type)
            : false,
        });
        existingKeys.add(extra.key);
      }
    }
  }

  // Collect taxonomies
  const taxonomies: TaxonomySpec[] = [];
  for (const preset of matched) {
    if (preset.taxonomies) {
      taxonomies.push(...preset.taxonomies);
    }
  }

  // Build a nice template name
  const suggestedTemplateName =
    contentTypes.length === 1
      ? `${contentTypes[0].key}-template`
      : `${contentTypes.map((ct) => ct.key).join('-')}-template`;

  return {
    contentTypes,
    ...(taxonomies.length > 0 && { taxonomies }),
    ...(locales && { locales }),
    suggestedTemplateName,
  };
}

// Re-export the old shape as compatibility alias
export type GenerateSchemaResult = GeneratedSchema;
