/**
 * Built-in space templates / project starters for HTMLess.
 * Each template defines content types, fields, taxonomies, locales, and core blocks
 * that are provisioned when a new space is created from that template.
 */

// ─── Types ───

export interface TemplateField {
  key: string;
  name: string;
  type: string; // text, richtext, number, boolean, date, media, reference, json, slug, enum
  required?: boolean;
  unique?: boolean;
  localized?: boolean;
  sortOrder: number;
  validations?: Record<string, unknown>;
  enumValues?: string[];
  referenceTarget?: string;
}

export interface TemplateContentType {
  key: string;
  name: string;
  description?: string;
  fields: TemplateField[];
}

export interface TemplateTaxonomy {
  key: string;
  name: string;
  hierarchical?: boolean;
}

export interface TemplateLocale {
  code: string;
  name: string;
  isDefault?: boolean;
}

export interface Template {
  key: string;
  name: string;
  description: string;
  contentTypes: TemplateContentType[];
  taxonomies: TemplateTaxonomy[];
  locales: TemplateLocale[];
}

// ─── Templates ───

const blogTemplate: Template = {
  key: 'blog',
  name: 'Blog',
  description: 'A multi-language blog with articles, categories, and rich-text editing.',
  contentTypes: [
    {
      key: 'article',
      name: 'Article',
      description: 'Blog articles and posts',
      fields: [
        { key: 'title', name: 'Title', type: 'text', required: true, localized: true, sortOrder: 0 },
        { key: 'slug', name: 'Slug', type: 'slug', required: true, unique: true, sortOrder: 1 },
        { key: 'body', name: 'Body', type: 'richtext', required: true, localized: true, sortOrder: 2 },
        { key: 'excerpt', name: 'Excerpt', type: 'text', required: false, localized: true, sortOrder: 3 },
        { key: 'author', name: 'Author', type: 'text', required: false, sortOrder: 4 },
        { key: 'featuredImage', name: 'Featured Image', type: 'media', required: false, sortOrder: 5 },
        { key: 'category', name: 'Category', type: 'text', required: false, sortOrder: 6 },
        { key: 'publishedDate', name: 'Published Date', type: 'date', required: false, sortOrder: 7 },
      ],
    },
  ],
  taxonomies: [
    { key: 'category', name: 'Category', hierarchical: true },
  ],
  locales: [
    { code: 'en', name: 'English', isDefault: true },
    { code: 'es', name: 'Spanish' },
  ],
};

const docsTemplate: Template = {
  key: 'docs',
  name: 'Documentation',
  description: 'Technical documentation with pages, sections, and ordering.',
  contentTypes: [
    {
      key: 'page',
      name: 'Page',
      description: 'Documentation pages',
      fields: [
        { key: 'title', name: 'Title', type: 'text', required: true, sortOrder: 0 },
        { key: 'slug', name: 'Slug', type: 'slug', required: true, unique: true, sortOrder: 1 },
        { key: 'body', name: 'Body', type: 'richtext', required: true, sortOrder: 2 },
        { key: 'sidebar', name: 'Sidebar', type: 'richtext', required: false, sortOrder: 3 },
        { key: 'order', name: 'Order', type: 'number', required: false, sortOrder: 4 },
      ],
    },
  ],
  taxonomies: [
    { key: 'section', name: 'Section', hierarchical: true },
  ],
  locales: [
    { code: 'en', name: 'English', isDefault: true },
  ],
};

const saasTemplate: Template = {
  key: 'saas',
  name: 'SaaS Landing',
  description: 'SaaS product site with pages, features, pricing tiers, and FAQs.',
  contentTypes: [
    {
      key: 'page',
      name: 'Page',
      description: 'Landing pages',
      fields: [
        { key: 'title', name: 'Title', type: 'text', required: true, sortOrder: 0 },
        { key: 'slug', name: 'Slug', type: 'slug', required: true, unique: true, sortOrder: 1 },
        { key: 'body', name: 'Body', type: 'richtext', required: true, sortOrder: 2 },
        { key: 'metaTitle', name: 'Meta Title', type: 'text', required: false, sortOrder: 3 },
        { key: 'metaDescription', name: 'Meta Description', type: 'text', required: false, sortOrder: 4 },
      ],
    },
    {
      key: 'feature',
      name: 'Feature',
      description: 'Product features',
      fields: [
        { key: 'title', name: 'Title', type: 'text', required: true, sortOrder: 0 },
        { key: 'slug', name: 'Slug', type: 'slug', required: true, unique: true, sortOrder: 1 },
        { key: 'description', name: 'Description', type: 'richtext', required: true, sortOrder: 2 },
        { key: 'icon', name: 'Icon', type: 'text', required: false, sortOrder: 3 },
        { key: 'order', name: 'Order', type: 'number', required: false, sortOrder: 4 },
      ],
    },
    {
      key: 'pricing',
      name: 'Pricing',
      description: 'Pricing tiers',
      fields: [
        { key: 'title', name: 'Title', type: 'text', required: true, sortOrder: 0 },
        { key: 'slug', name: 'Slug', type: 'slug', required: true, unique: true, sortOrder: 1 },
        { key: 'price', name: 'Price', type: 'number', required: true, sortOrder: 2 },
        { key: 'interval', name: 'Billing Interval', type: 'enum', required: false, sortOrder: 3, enumValues: ['monthly', 'yearly'] },
        { key: 'features', name: 'Features', type: 'json', required: false, sortOrder: 4 },
        { key: 'highlighted', name: 'Highlighted', type: 'boolean', required: false, sortOrder: 5 },
        { key: 'order', name: 'Order', type: 'number', required: false, sortOrder: 6 },
      ],
    },
    {
      key: 'faq',
      name: 'FAQ',
      description: 'Frequently asked questions',
      fields: [
        { key: 'question', name: 'Question', type: 'text', required: true, sortOrder: 0 },
        { key: 'slug', name: 'Slug', type: 'slug', required: true, unique: true, sortOrder: 1 },
        { key: 'answer', name: 'Answer', type: 'richtext', required: true, sortOrder: 2 },
        { key: 'order', name: 'Order', type: 'number', required: false, sortOrder: 3 },
      ],
    },
  ],
  taxonomies: [],
  locales: [
    { code: 'en', name: 'English', isDefault: true },
  ],
};

const agencyTemplate: Template = {
  key: 'agency',
  name: 'Agency Portfolio',
  description: 'Portfolio site for agencies with projects, services, and categories.',
  contentTypes: [
    {
      key: 'project',
      name: 'Project',
      description: 'Portfolio projects',
      fields: [
        { key: 'title', name: 'Title', type: 'text', required: true, sortOrder: 0 },
        { key: 'slug', name: 'Slug', type: 'slug', required: true, unique: true, sortOrder: 1 },
        { key: 'description', name: 'Description', type: 'richtext', required: true, sortOrder: 2 },
        { key: 'images', name: 'Images', type: 'json', required: false, sortOrder: 3 },
        { key: 'client', name: 'Client', type: 'text', required: false, sortOrder: 4 },
        { key: 'year', name: 'Year', type: 'number', required: false, sortOrder: 5 },
      ],
    },
    {
      key: 'service',
      name: 'Service',
      description: 'Services offered',
      fields: [
        { key: 'title', name: 'Title', type: 'text', required: true, sortOrder: 0 },
        { key: 'slug', name: 'Slug', type: 'slug', required: true, unique: true, sortOrder: 1 },
        { key: 'description', name: 'Description', type: 'richtext', required: true, sortOrder: 2 },
        { key: 'icon', name: 'Icon', type: 'text', required: false, sortOrder: 3 },
        { key: 'order', name: 'Order', type: 'number', required: false, sortOrder: 4 },
      ],
    },
  ],
  taxonomies: [
    { key: 'category', name: 'Category', hierarchical: true },
  ],
  locales: [
    { code: 'en', name: 'English', isDefault: true },
  ],
};

const ecommerceTemplate: Template = {
  key: 'ecommerce',
  name: 'E-Commerce',
  description: 'Product catalog with categories, brands, and SKU tracking.',
  contentTypes: [
    {
      key: 'product',
      name: 'Product',
      description: 'Products in the catalog',
      fields: [
        { key: 'name', name: 'Name', type: 'text', required: true, sortOrder: 0 },
        { key: 'slug', name: 'Slug', type: 'slug', required: true, unique: true, sortOrder: 1 },
        { key: 'description', name: 'Description', type: 'richtext', required: true, sortOrder: 2 },
        { key: 'price', name: 'Price', type: 'number', required: true, sortOrder: 3 },
        { key: 'images', name: 'Images', type: 'json', required: false, sortOrder: 4 },
        { key: 'category', name: 'Category', type: 'text', required: false, sortOrder: 5 },
        { key: 'sku', name: 'SKU', type: 'text', required: false, unique: true, sortOrder: 6 },
      ],
    },
  ],
  taxonomies: [
    { key: 'category', name: 'Category', hierarchical: true },
    { key: 'brand', name: 'Brand', hierarchical: false },
  ],
  locales: [
    { code: 'en', name: 'English', isDefault: true },
  ],
};

// ─── Registry ───

const templates: Template[] = [
  blogTemplate,
  docsTemplate,
  saasTemplate,
  agencyTemplate,
  ecommerceTemplate,
];

export function getTemplates(): Template[] {
  return templates;
}

export function getTemplate(key: string): Template | undefined {
  return templates.find((t) => t.key === key);
}
