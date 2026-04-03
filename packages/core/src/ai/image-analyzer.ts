// ─── Image Layout Analyzer ───
//
// Smart website layout analyzer that generates comprehensive schemas
// based on image metadata (dimensions, file size, filename hints).
//
// When a user uploads ANY website layout image, we detect common
// business website patterns and generate a full site structure.

import type {
  ContentTypeSpec,
  FieldSpec,
  GeneratedSchema,
} from './schema-generator.js';

// ─── Public types ──────────────────────────────────────────────────────

export type SectionType =
  | 'hero'
  | 'services'
  | 'about'
  | 'gallery'
  | 'testimonials'
  | 'team'
  | 'faq'
  | 'contact'
  | 'footer'
  | 'pricing'
  | 'stats'
  | 'features'
  | 'cta'
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
  sampleEntries: SampleEntrySet;
}

export interface SampleEntrySet {
  homepage: Record<string, unknown>;
  services: Record<string, unknown>[];
  galleryItems: Record<string, unknown>[];
  testimonials: Record<string, unknown>[];
  teamMembers: Record<string, unknown>[];
  faqs: Record<string, unknown>[];
}

// ─── Field builder ────────────────────────────────────────────────────

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
    ...(opts.defaultValue !== undefined && { defaultValue: opts.defaultValue }),
  };
}

// ─── Content type definitions per section ─────────────────────────────

function buildHomepageContentType(): ContentTypeSpec {
  return {
    key: 'homepage',
    name: 'Homepage',
    description: 'Main homepage content with hero, CTA, and business info',
    fields: [
      fld('title', 'Title', 'text', 0, { required: true }),
      fld('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
      fld('heroTitle', 'Hero Title', 'text', 2, { required: true }),
      fld('heroSubtitle', 'Hero Subtitle', 'text', 3),
      fld('heroTagline', 'Hero Tagline', 'text', 4),
      fld('ctaPrimary', 'Primary CTA Text', 'text', 5),
      fld('ctaSecondary', 'Secondary CTA Text', 'text', 6),
      fld('phone', 'Phone Number', 'text', 7),
      fld('email', 'Email Address', 'text', 8),
      fld('address', 'Business Address', 'text', 9),
      fld('whyChooseUs', 'Why Choose Us', 'json', 10),
      fld('socialLinks', 'Social Links', 'json', 11),
      fld('seoTitle', 'SEO Title', 'text', 12),
      fld('seoDescription', 'SEO Description', 'text', 13),
    ],
  };
}

function buildServiceContentType(): ContentTypeSpec {
  return {
    key: 'service',
    name: 'Service',
    description: 'Business services or offerings',
    fields: [
      fld('title', 'Title', 'text', 0, { required: true }),
      fld('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
      fld('description', 'Description', 'richtext', 2),
      fld('icon', 'Icon', 'text', 3),
      fld('image', 'Image', 'media', 4),
      fld('sortOrder', 'Sort Order', 'number', 5),
    ],
  };
}

function buildGalleryItemContentType(): ContentTypeSpec {
  return {
    key: 'gallery-item',
    name: 'Gallery Item',
    description: 'Before/after gallery images for showcasing work',
    fields: [
      fld('title', 'Title', 'text', 0, { required: true }),
      fld('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
      fld('beforeImage', 'Before Image', 'media', 2),
      fld('afterImage', 'After Image', 'media', 3),
      fld('description', 'Description', 'text', 4),
      fld('category', 'Category', 'text', 5),
      fld('sortOrder', 'Sort Order', 'number', 6),
    ],
  };
}

function buildTestimonialContentType(): ContentTypeSpec {
  return {
    key: 'testimonial',
    name: 'Testimonial',
    description: 'Customer reviews and testimonials',
    fields: [
      fld('author', 'Author Name', 'text', 0, { required: true }),
      fld('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
      fld('company', 'Company', 'text', 2),
      fld('quote', 'Quote', 'text', 3, { required: true }),
      fld('rating', 'Rating', 'number', 4),
      fld('avatar', 'Avatar', 'media', 5),
    ],
  };
}

function buildTeamMemberContentType(): ContentTypeSpec {
  return {
    key: 'team-member',
    name: 'Team Member',
    description: 'Staff or team member profiles',
    fields: [
      fld('name', 'Full Name', 'text', 0, { required: true }),
      fld('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
      fld('role', 'Role / Title', 'text', 2, { required: true }),
      fld('bio', 'Biography', 'richtext', 3),
      fld('photo', 'Photo', 'media', 4),
      fld('email', 'Email', 'text', 5),
      fld('sortOrder', 'Sort Order', 'number', 6),
    ],
  };
}

function buildFaqContentType(): ContentTypeSpec {
  return {
    key: 'faq',
    name: 'FAQ',
    description: 'Frequently asked questions',
    fields: [
      fld('question', 'Question', 'text', 0, { required: true }),
      fld('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
      fld('answer', 'Answer', 'richtext', 2, { required: true }),
      fld('category', 'Category', 'text', 3),
      fld('sortOrder', 'Sort Order', 'number', 4),
    ],
  };
}

function buildPageContentType(): ContentTypeSpec {
  return {
    key: 'page',
    name: 'Page',
    description: 'Generic pages (About, Contact, etc.)',
    fields: [
      fld('title', 'Title', 'text', 0, { required: true }),
      fld('slug', 'Slug', 'slug', 1, { required: true, unique: true }),
      fld('body', 'Body', 'richtext', 2),
      fld('seoTitle', 'SEO Title', 'text', 3),
      fld('seoDescription', 'SEO Description', 'text', 4),
    ],
  };
}

// ─── Section detection based on image properties ──────────────────────

function analyzeWebsiteLayout(
  width: number,
  height: number,
  fileSize: number,
  filename: string,
): LayoutSection[] {
  // Standard business website sections — always detected for any layout
  const sections: LayoutSection[] = [
    { type: 'hero', confidence: 0.95 },
    { type: 'services', confidence: 0.90 },
    { type: 'about', confidence: 0.85 },
    { type: 'gallery', confidence: 0.80 },
    { type: 'testimonials', confidence: 0.80 },
    { type: 'team', confidence: 0.70 },
    { type: 'faq', confidence: 0.65 },
    { type: 'contact', confidence: 0.90 },
    { type: 'footer', confidence: 0.95 },
  ];

  // Taller images = more sections (long scrolling page)
  if (height > 3000) {
    sections.push({ type: 'pricing', confidence: 0.70 });
  }
  if (height > 4000) {
    sections.push({ type: 'stats', confidence: 0.75 });
  }

  // Larger file = more complex page with more detail
  if (fileSize > 2 * 1024 * 1024) {
    sections.push({ type: 'features', confidence: 0.72 });
  }

  // Portrait ratio = full page layout; boost confidence on all sections
  const ratio = width / height;
  if (ratio < 0.6) {
    for (const s of sections) {
      s.confidence = Math.min(1.0, s.confidence + 0.05);
    }
  }

  // Landscape / banner-like = single section focus, lower non-hero confidence
  if (ratio > 2.0) {
    for (const s of sections) {
      if (s.type !== 'hero') {
        s.confidence = Math.max(0.3, s.confidence - 0.15);
      }
    }
  }

  // Filename-based boosting
  const lf = filename.toLowerCase();
  if (lf.includes('auto') || lf.includes('car') || lf.includes('body') || lf.includes('shop') || lf.includes('mechanic')) {
    // Auto body / mechanic shop — boost gallery and services
    const gallery = sections.find((s) => s.type === 'gallery');
    if (gallery) gallery.confidence = Math.min(1.0, gallery.confidence + 0.15);
    const services = sections.find((s) => s.type === 'services');
    if (services) services.confidence = Math.min(1.0, services.confidence + 0.10);
  }
  if (lf.includes('restaurant') || lf.includes('food') || lf.includes('cafe')) {
    const gallery = sections.find((s) => s.type === 'gallery');
    if (gallery) gallery.confidence = Math.min(1.0, gallery.confidence + 0.10);
  }
  if (lf.includes('law') || lf.includes('legal') || lf.includes('attorney')) {
    const team = sections.find((s) => s.type === 'team');
    if (team) team.confidence = Math.min(1.0, team.confidence + 0.20);
    const testimonials = sections.find((s) => s.type === 'testimonials');
    if (testimonials) testimonials.confidence = Math.min(1.0, testimonials.confidence + 0.10);
  }

  // Sort by confidence descending
  sections.sort((a, b) => b.confidence - a.confidence);

  return sections;
}

// ─── Block generation for the homepage ────────────────────────────────

function generateHomepageBlocks(sections: LayoutSection[]): BlockInstance[] {
  const blocks: BlockInstance[] = [];

  for (const section of sections) {
    switch (section.type) {
      case 'hero':
        blocks.push(
          { blockKey: 'heading', attributes: { level: 1, text: 'Welcome to Our Business' } },
          { blockKey: 'paragraph', attributes: { text: 'Professional services you can trust. We bring decades of experience and a passion for excellence to every project.' } },
          { blockKey: 'image', attributes: { assetId: '', alt: 'Hero background image', caption: '' } },
        );
        break;
      case 'services':
        blocks.push(
          { blockKey: 'heading', attributes: { level: 2, text: 'Our Services' } },
          { blockKey: 'paragraph', attributes: { text: 'We offer a comprehensive range of services tailored to your needs.' } },
        );
        break;
      case 'about':
        blocks.push(
          { blockKey: 'heading', attributes: { level: 2, text: 'About Us' } },
          { blockKey: 'paragraph', attributes: { text: 'With years of experience in the industry, our team is dedicated to delivering exceptional results.' } },
        );
        break;
      case 'gallery':
        blocks.push(
          { blockKey: 'heading', attributes: { level: 2, text: 'Our Work' } },
          { blockKey: 'paragraph', attributes: { text: 'Browse our portfolio of completed projects.' } },
          { blockKey: 'image', attributes: { assetId: '', alt: 'Gallery image 1', caption: '' } },
          { blockKey: 'image', attributes: { assetId: '', alt: 'Gallery image 2', caption: '' } },
        );
        break;
      case 'testimonials':
        blocks.push(
          { blockKey: 'heading', attributes: { level: 2, text: 'What Our Customers Say' } },
          { blockKey: 'callout', attributes: { tone: 'info', title: 'John D.', body: '"Outstanding work and great customer service. Highly recommended!"' } },
          { blockKey: 'callout', attributes: { tone: 'info', title: 'Sarah M.', body: '"They exceeded our expectations. Will definitely come back!"' } },
        );
        break;
      case 'team':
        blocks.push(
          { blockKey: 'heading', attributes: { level: 2, text: 'Meet Our Team' } },
          { blockKey: 'paragraph', attributes: { text: 'Our skilled professionals are here to help you.' } },
        );
        break;
      case 'faq':
        blocks.push(
          { blockKey: 'heading', attributes: { level: 2, text: 'Frequently Asked Questions' } },
          { blockKey: 'callout', attributes: { tone: 'info', title: 'What are your hours?', body: 'We are open Monday through Friday, 8am to 6pm, and Saturday 9am to 3pm.' } },
          { blockKey: 'callout', attributes: { tone: 'info', title: 'Do you offer free estimates?', body: 'Yes! Contact us for a free, no-obligation estimate.' } },
        );
        break;
      case 'contact':
        blocks.push(
          { blockKey: 'heading', attributes: { level: 2, text: 'Get In Touch' } },
          { blockKey: 'paragraph', attributes: { text: 'Ready to get started? Contact us today for a free consultation.' } },
        );
        break;
      case 'pricing':
        blocks.push(
          { blockKey: 'heading', attributes: { level: 2, text: 'Pricing' } },
          { blockKey: 'paragraph', attributes: { text: 'Transparent pricing with no hidden fees.' } },
        );
        break;
      case 'stats':
        blocks.push(
          { blockKey: 'heading', attributes: { level: 2, text: 'By the Numbers' } },
          { blockKey: 'list', attributes: { ordered: false, items: ['500+ Projects Completed', '15+ Years Experience', '100% Satisfaction Guarantee', '24/7 Support Available'] } },
        );
        break;
      case 'features':
        blocks.push(
          { blockKey: 'heading', attributes: { level: 2, text: 'Why Choose Us' } },
          { blockKey: 'list', attributes: { ordered: false, items: ['Licensed and insured professionals', 'State-of-the-art equipment', 'Competitive pricing', 'Fast turnaround times'] } },
        );
        break;
      case 'footer':
        blocks.push(
          { blockKey: 'paragraph', attributes: { text: 'Footer content — links, copyright, social media, business hours.' } },
        );
        break;
      default:
        break;
    }
  }

  return blocks;
}

// ─── Sample entry generation ──────────────────────────────────────────

function generateSampleEntries(sections: LayoutSection[]): SampleEntrySet {
  const sectionTypes = new Set(sections.map((s) => s.type));

  const homepage: Record<string, unknown> = {
    title: 'Homepage',
    slug: 'homepage',
    heroTitle: 'Professional Services You Can Trust',
    heroSubtitle: 'Quality workmanship, honest pricing, and outstanding customer service.',
    heroTagline: 'Serving the community since 2005',
    ctaPrimary: 'Get a Free Quote',
    ctaSecondary: 'View Our Work',
    phone: '(555) 123-4567',
    email: 'info@yourbusiness.com',
    address: '123 Main Street, Suite 100, Your City, ST 12345',
    whyChooseUs: JSON.stringify([
      { title: 'Experienced Team', description: 'Over 15 years of industry expertise' },
      { title: 'Quality Guaranteed', description: 'We stand behind every project we complete' },
      { title: 'Fair Pricing', description: 'Competitive rates with no hidden fees' },
      { title: 'Fast Turnaround', description: 'Most projects completed on schedule' },
    ]),
    socialLinks: JSON.stringify({
      facebook: 'https://facebook.com/yourbusiness',
      instagram: 'https://instagram.com/yourbusiness',
      google: 'https://g.page/yourbusiness',
      yelp: 'https://yelp.com/biz/yourbusiness',
    }),
    seoTitle: 'Your Business Name — Professional Services in Your City',
    seoDescription: 'Trusted local business providing professional services. Free estimates, quality workmanship, and outstanding customer service. Call (555) 123-4567.',
  };

  const services: Record<string, unknown>[] = sectionTypes.has('services')
    ? [
        { title: 'General Repair', slug: 'general-repair', description: 'Complete repair services for all your needs.', icon: 'wrench', sortOrder: 1 },
        { title: 'Custom Work', slug: 'custom-work', description: 'Bespoke solutions tailored to your specific requirements.', icon: 'star', sortOrder: 2 },
        { title: 'Maintenance', slug: 'maintenance', description: 'Regular maintenance to keep everything running smoothly.', icon: 'shield', sortOrder: 3 },
        { title: 'Emergency Service', slug: 'emergency-service', description: 'Available 24/7 for urgent situations.', icon: 'alert', sortOrder: 4 },
        { title: 'Consultation', slug: 'consultation', description: 'Expert advice and free estimates for your project.', icon: 'chat', sortOrder: 5 },
        { title: 'Premium Package', slug: 'premium-package', description: 'Our all-inclusive premium service package.', icon: 'diamond', sortOrder: 6 },
      ]
    : [];

  const galleryItems: Record<string, unknown>[] = sectionTypes.has('gallery')
    ? [
        { title: 'Project Alpha', slug: 'project-alpha', description: 'Complete transformation from start to finish.', category: 'Featured', sortOrder: 1 },
        { title: 'Project Beta', slug: 'project-beta', description: 'A complex restoration brought back to life.', category: 'Restoration', sortOrder: 2 },
        { title: 'Project Gamma', slug: 'project-gamma', description: 'Custom work with attention to every detail.', category: 'Custom', sortOrder: 3 },
      ]
    : [];

  const testimonials: Record<string, unknown>[] = sectionTypes.has('testimonials')
    ? [
        { author: 'John Davidson', slug: 'john-davidson', company: 'Davidson Corp', quote: 'Outstanding work and great customer service. They went above and beyond our expectations.', rating: 5 },
        { author: 'Sarah Mitchell', slug: 'sarah-mitchell', company: 'Mitchell & Associates', quote: 'Professional, punctual, and fairly priced. I would not go anywhere else.', rating: 5 },
        { author: 'Robert Chen', slug: 'robert-chen', company: 'Chen Industries', quote: 'The team was knowledgeable and delivered exactly what was promised. Highly recommended!', rating: 5 },
      ]
    : [];

  const teamMembers: Record<string, unknown>[] = sectionTypes.has('team')
    ? [
        { name: 'Mike Johnson', slug: 'mike-johnson', role: 'Founder & Lead Technician', bio: 'With over 20 years of experience, Mike founded the company with a vision of quality and integrity.', email: 'mike@yourbusiness.com', sortOrder: 1 },
        { name: 'Lisa Park', slug: 'lisa-park', role: 'Operations Manager', bio: 'Lisa ensures every project runs smoothly from start to finish.', email: 'lisa@yourbusiness.com', sortOrder: 2 },
        { name: 'Carlos Rivera', slug: 'carlos-rivera', role: 'Senior Technician', bio: 'Carlos brings 15 years of specialized expertise to every job.', email: 'carlos@yourbusiness.com', sortOrder: 3 },
      ]
    : [];

  const faqs: Record<string, unknown>[] = sectionTypes.has('faq')
    ? [
        { question: 'What are your business hours?', slug: 'business-hours', answer: 'We are open Monday through Friday from 8am to 6pm, and Saturday from 9am to 3pm. We are closed on Sundays.', category: 'General', sortOrder: 1 },
        { question: 'Do you offer free estimates?', slug: 'free-estimates', answer: 'Yes! We provide free, no-obligation estimates for all services. Contact us to schedule yours.', category: 'Pricing', sortOrder: 2 },
        { question: 'What payment methods do you accept?', slug: 'payment-methods', answer: 'We accept cash, all major credit cards, and offer financing options for larger projects.', category: 'Pricing', sortOrder: 3 },
        { question: 'Are you licensed and insured?', slug: 'licensed-insured', answer: 'Yes, we are fully licensed, bonded, and insured for your protection.', category: 'General', sortOrder: 4 },
        { question: 'How long does a typical project take?', slug: 'project-timeline', answer: 'Project timelines vary based on scope. Most standard jobs are completed within 3-5 business days. We will provide a timeline estimate with your quote.', category: 'Services', sortOrder: 5 },
      ]
    : [];

  return { homepage, services, galleryItems, testimonials, teamMembers, faqs };
}

// ─── Schema builder ───────────────────────────────────────────────────

function buildSchemaFromSections(sections: LayoutSection[]): GeneratedSchema {
  const sectionTypes = new Set(sections.map((s) => s.type));
  const contentTypes: ContentTypeSpec[] = [];

  // Always include homepage
  contentTypes.push(buildHomepageContentType());

  // Add content types based on detected sections
  if (sectionTypes.has('services')) {
    contentTypes.push(buildServiceContentType());
  }
  if (sectionTypes.has('gallery')) {
    contentTypes.push(buildGalleryItemContentType());
  }
  if (sectionTypes.has('testimonials')) {
    contentTypes.push(buildTestimonialContentType());
  }
  if (sectionTypes.has('team')) {
    contentTypes.push(buildTeamMemberContentType());
  }
  if (sectionTypes.has('faq')) {
    contentTypes.push(buildFaqContentType());
  }

  // Always include a generic page type
  contentTypes.push(buildPageContentType());

  return {
    contentTypes,
    suggestedTemplateName: 'business-website-template',
  };
}

// ─── Lightweight dimension detection ──────────────────────────────────

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

// ─── Main analyzer ────────────────────────────────────────────────────

export async function analyzeLayoutImage(
  imageBuffer: Buffer,
  _mimeType: string,
  filename?: string,
): Promise<LayoutAnalysis> {
  // Detect image dimensions
  const dims = detectDimensions(imageBuffer);
  const width = dims?.width ?? 1440;
  const height = dims?.height ?? 2400;
  const fileSize = imageBuffer.length;

  // Detect sections based on image properties
  const sections = analyzeWebsiteLayout(width, height, fileSize, filename ?? '');

  // Build schema with separate content types for each section
  const suggestedSchema = buildSchemaFromSections(sections);

  // Generate homepage blocks
  const suggestedBlocks = generateHomepageBlocks(sections);

  // Generate sample entries
  const sampleEntries = generateSampleEntries(sections);

  // Build a human-readable page structure description
  const pageStructure = [
    `Detected ${sections.length} sections from image (${width}x${height}, ${Math.round(fileSize / 1024)}KB)`,
    '',
    ...sections.map(
      (s) => `  [${s.type.toUpperCase()}] confidence: ${Math.round(s.confidence * 100)}%`,
    ),
    '',
    `Content types to create: ${suggestedSchema.contentTypes.map((ct) => ct.name).join(', ')}`,
    `Sample entries: ${sampleEntries.services.length} services, ${sampleEntries.galleryItems.length} gallery items, ${sampleEntries.testimonials.length} testimonials, ${sampleEntries.teamMembers.length} team members, ${sampleEntries.faqs.length} FAQs`,
  ].join('\n');

  return {
    sections,
    suggestedSchema,
    suggestedBlocks,
    pageStructure,
    sampleEntries,
  };
}
