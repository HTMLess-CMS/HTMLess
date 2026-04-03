// ─── Image Layout Analyzer ───
//
// Stub implementation that works without an external AI API.
// Analyzes image metadata and filename for layout hints, then generates
// appropriate page structures, blocks, and schema fields.
//
// When an AI vision API is connected (via extension hook), this module
// can hand off to real image recognition.

import type {
  ContentTypeSpec,
  FieldSpec,
  GeneratedSchema,
} from './schema-generator.js';

// ─── Public types ──────────────────────────────────────────────────────

export type SectionType =
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'pricing'
  | 'cta'
  | 'footer'
  | 'gallery'
  | 'contact'
  | 'faq'
  | 'team'
  | 'stats'
  | 'content'
  | 'header'
  | 'sidebar'
  | 'reviews';

export interface LayoutSection {
  type: SectionType;
  confidence: number;
}

export interface BlockInstance {
  blockKey: string;
  attributes: Record<string, unknown>;
}

export interface LayoutAnalysis {
  sections: LayoutSection[];
  suggestedSchema: GeneratedSchema;
  suggestedBlocks: BlockInstance[];
  pageStructure: string;
}

// ─── Section → Block mapping ───────────────────────────────────────────

function blocksForSection(section: SectionType): BlockInstance[] {
  switch (section) {
    case 'hero':
      return [
        {
          blockKey: 'heading',
          attributes: { level: 1, text: 'Your Hero Headline Here' },
        },
        {
          blockKey: 'paragraph',
          attributes: { text: 'A compelling subtitle that captures your value proposition.' },
        },
        {
          blockKey: 'image',
          attributes: { assetId: '', alt: 'Hero background image', caption: '' },
        },
      ];
    case 'features':
      return [
        {
          blockKey: 'heading',
          attributes: { level: 2, text: 'Features' },
        },
        {
          blockKey: 'list',
          attributes: {
            ordered: false,
            items: ['Feature one description', 'Feature two description', 'Feature three description'],
          },
        },
      ];
    case 'testimonials':
    case 'reviews':
      return [
        {
          blockKey: 'heading',
          attributes: { level: 2, text: 'What Our Customers Say' },
        },
        {
          blockKey: 'callout',
          attributes: {
            tone: 'info',
            title: 'Customer Name',
            body: '"This product changed everything for us."',
          },
        },
      ];
    case 'pricing':
      return [
        {
          blockKey: 'heading',
          attributes: { level: 2, text: 'Pricing' },
        },
        {
          blockKey: 'paragraph',
          attributes: { text: 'Choose the plan that fits your needs.' },
        },
      ];
    case 'cta':
      return [
        {
          blockKey: 'heading',
          attributes: { level: 2, text: 'Ready to Get Started?' },
        },
        {
          blockKey: 'paragraph',
          attributes: { text: 'Sign up today and transform your workflow.' },
        },
      ];
    case 'gallery':
      return [
        {
          blockKey: 'heading',
          attributes: { level: 2, text: 'Gallery' },
        },
        {
          blockKey: 'image',
          attributes: { assetId: '', alt: 'Gallery image 1', caption: '' },
        },
        {
          blockKey: 'image',
          attributes: { assetId: '', alt: 'Gallery image 2', caption: '' },
        },
      ];
    case 'contact':
      return [
        {
          blockKey: 'heading',
          attributes: { level: 2, text: 'Get In Touch' },
        },
        {
          blockKey: 'paragraph',
          attributes: { text: 'Fill out the form below and we will get back to you.' },
        },
      ];
    case 'faq':
      return [
        {
          blockKey: 'heading',
          attributes: { level: 2, text: 'Frequently Asked Questions' },
        },
        {
          blockKey: 'callout',
          attributes: {
            tone: 'info',
            title: 'How does it work?',
            body: 'Detailed answer goes here.',
          },
        },
      ];
    case 'team':
      return [
        {
          blockKey: 'heading',
          attributes: { level: 2, text: 'Meet the Team' },
        },
        {
          blockKey: 'paragraph',
          attributes: { text: 'The people behind the product.' },
        },
      ];
    case 'stats':
      return [
        {
          blockKey: 'heading',
          attributes: { level: 2, text: 'By the Numbers' },
        },
        {
          blockKey: 'list',
          attributes: {
            ordered: false,
            items: ['100+ customers', '99.9% uptime', '24/7 support'],
          },
        },
      ];
    case 'content':
      return [
        {
          blockKey: 'heading',
          attributes: { level: 2, text: 'Content Section' },
        },
        {
          blockKey: 'paragraph',
          attributes: { text: 'Your main content goes here.' },
        },
      ];
    case 'header':
      return [
        {
          blockKey: 'heading',
          attributes: { level: 1, text: 'Page Header' },
        },
      ];
    case 'sidebar':
      return [
        {
          blockKey: 'heading',
          attributes: { level: 3, text: 'Sidebar' },
        },
        {
          blockKey: 'list',
          attributes: {
            ordered: false,
            items: ['Recent posts', 'Categories', 'Tags'],
          },
        },
      ];
    case 'footer':
      return [
        {
          blockKey: 'paragraph',
          attributes: { text: 'Footer content — links, copyright, social icons.' },
        },
      ];
  }
}

// ─── Section → Schema field suggestions ────────────────────────────────

function fld(
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
  };
}

function fieldsForSections(sections: SectionType[]): FieldSpec[] {
  const fields: FieldSpec[] = [
    fld('title', 'Title', 'text', 0, { required: true }),
    fld('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
  ];
  let order = 2;
  const seen = new Set<string>(['title', 'slug']);

  function add(key: string, name: string, type: string, opts: Partial<FieldSpec> = {}): void {
    if (seen.has(key)) return;
    seen.add(key);
    fields.push(fld(key, name, type, order++, opts));
  }

  for (const section of sections) {
    switch (section) {
      case 'hero':
        add('heroTitle', 'Hero Title', 'text');
        add('heroSubtitle', 'Hero Subtitle', 'text');
        add('heroImage', 'Hero Image', 'media');
        break;
      case 'features':
        add('features', 'Features', 'json');
        break;
      case 'testimonials':
      case 'reviews':
        add('testimonials', 'Testimonials', 'json');
        break;
      case 'pricing':
        add('pricingPlans', 'Pricing Plans', 'json');
        break;
      case 'cta':
        add('ctaTitle', 'CTA Title', 'text');
        add('ctaButtonText', 'CTA Button Text', 'text');
        add('ctaButtonUrl', 'CTA Button URL', 'text');
        break;
      case 'gallery':
        add('galleryImages', 'Gallery Images', 'media');
        break;
      case 'contact':
        add('contactEmail', 'Contact Email', 'text');
        add('contactPhone', 'Contact Phone', 'text');
        break;
      case 'faq':
        add('faqItems', 'FAQ Items', 'json');
        break;
      case 'team':
        add('teamMembers', 'Team Members', 'json');
        break;
      case 'stats':
        add('stats', 'Statistics', 'json');
        break;
      case 'content':
        add('body', 'Body', 'richtext');
        break;
      case 'header':
        // covered by title
        break;
      case 'sidebar':
        add('sidebarContent', 'Sidebar Content', 'richtext');
        break;
      case 'footer':
        add('footerText', 'Footer Text', 'text');
        break;
    }
  }

  add('seoTitle', 'SEO Title', 'text');
  add('seoDescription', 'SEO Description', 'text');

  return fields;
}

// ─── Layout presets by filename hint ───────────────────────────────────

interface LayoutPreset {
  keywords: string[];
  sections: { type: SectionType; confidence: number }[];
  pageKey: string;
}

const layoutPresets: LayoutPreset[] = [
  {
    keywords: ['landing'],
    sections: [
      { type: 'hero', confidence: 0.95 },
      { type: 'features', confidence: 0.9 },
      { type: 'cta', confidence: 0.85 },
      { type: 'footer', confidence: 0.8 },
    ],
    pageKey: 'landing-page',
  },
  {
    keywords: ['blog'],
    sections: [
      { type: 'header', confidence: 0.95 },
      { type: 'content', confidence: 0.95 },
      { type: 'sidebar', confidence: 0.8 },
    ],
    pageKey: 'blog-page',
  },
  {
    keywords: ['product'],
    sections: [
      { type: 'hero', confidence: 0.9 },
      { type: 'gallery', confidence: 0.85 },
      { type: 'pricing', confidence: 0.9 },
      { type: 'reviews', confidence: 0.8 },
    ],
    pageKey: 'product-page',
  },
  {
    keywords: ['portfolio', 'work'],
    sections: [
      { type: 'hero', confidence: 0.9 },
      { type: 'gallery', confidence: 0.95 },
      { type: 'contact', confidence: 0.8 },
    ],
    pageKey: 'portfolio-page',
  },
  {
    keywords: ['about'],
    sections: [
      { type: 'hero', confidence: 0.9 },
      { type: 'team', confidence: 0.85 },
      { type: 'stats', confidence: 0.75 },
      { type: 'cta', confidence: 0.7 },
    ],
    pageKey: 'about-page',
  },
  {
    keywords: ['pricing'],
    sections: [
      { type: 'hero', confidence: 0.85 },
      { type: 'pricing', confidence: 0.95 },
      { type: 'faq', confidence: 0.8 },
      { type: 'cta', confidence: 0.75 },
    ],
    pageKey: 'pricing-page',
  },
  {
    keywords: ['contact'],
    sections: [
      { type: 'hero', confidence: 0.8 },
      { type: 'contact', confidence: 0.95 },
      { type: 'faq', confidence: 0.7 },
    ],
    pageKey: 'contact-page',
  },
];

const defaultLayout: LayoutPreset = {
  keywords: [],
  sections: [
    { type: 'hero', confidence: 0.8 },
    { type: 'features', confidence: 0.75 },
    { type: 'testimonials', confidence: 0.7 },
    { type: 'cta', confidence: 0.65 },
  ],
  pageKey: 'page',
};

// ─── Image dimension hints ─────────────────────────────────────────────

function adjustSectionsForDimensions(
  sections: LayoutSection[],
  width: number,
  height: number,
): LayoutSection[] {
  const ratio = width / height;

  // Very wide (banner-like) → boost hero confidence
  if (ratio > 2.5) {
    const hero = sections.find((s) => s.type === 'hero');
    if (hero) hero.confidence = Math.min(1, hero.confidence + 0.1);
  }

  // Very tall (long page mockup) → likely has many sections
  if (ratio < 0.5) {
    // Add more sections at lower confidence
    const existing = new Set(sections.map((s) => s.type));
    if (!existing.has('footer')) {
      sections.push({ type: 'footer', confidence: 0.6 });
    }
    if (!existing.has('stats')) {
      sections.push({ type: 'stats', confidence: 0.55 });
    }
  }

  return sections;
}

// ─── Main analyzer ─────────────────────────────────────────────────────

export async function analyzeLayoutImage(
  _imageBuffer: Buffer,
  _mimeType: string,
  filename?: string,
): Promise<LayoutAnalysis> {
  const lowerFilename = (filename ?? '').toLowerCase();

  // Match a layout preset by filename
  let preset = defaultLayout;
  for (const candidate of layoutPresets) {
    for (const kw of candidate.keywords) {
      if (lowerFilename.includes(kw)) {
        preset = candidate;
        break;
      }
    }
    if (preset !== defaultLayout) break;
  }

  // Clone sections so we can modify
  let sections: LayoutSection[] = preset.sections.map((s) => ({ ...s }));

  // Try to detect image dimensions from the buffer (PNG / JPEG headers)
  const dims = detectDimensions(_imageBuffer);
  if (dims) {
    sections = adjustSectionsForDimensions(sections, dims.width, dims.height);
  }

  // Build blocks from sections
  const suggestedBlocks: BlockInstance[] = [];
  for (const section of sections) {
    suggestedBlocks.push(...blocksForSection(section.type));
  }

  // Build schema from sections
  const sectionTypes = sections.map((s) => s.type);
  const fields = fieldsForSections(sectionTypes);

  const pageType: ContentTypeSpec = {
    key: preset.pageKey,
    name: preset.pageKey
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    description: `Page layout auto-detected from image${filename ? ` (${filename})` : ''}`,
    fields,
  };

  const suggestedSchema: GeneratedSchema = {
    contentTypes: [pageType],
    suggestedTemplateName: `${preset.pageKey}-template`,
  };

  // Build a human-readable page structure description
  const pageStructure = sections
    .map((s) => `[${s.type.toUpperCase()}] (confidence: ${Math.round(s.confidence * 100)}%)`)
    .join('\n');

  return {
    sections,
    suggestedSchema,
    suggestedBlocks,
    pageStructure,
  };
}

// ─── Lightweight dimension detection ───────────────────────────────────

function detectDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  if (buffer.length < 24) return null;

  // PNG: bytes 16-23 contain width (4 bytes BE) and height (4 bytes BE) in IHDR
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  // JPEG: scan for SOF0 (0xFF 0xC0) marker
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length - 9) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }
      const segLen = buffer.readUInt16BE(offset + 2);
      offset += 2 + segLen;
    }
  }

  return null;
}
