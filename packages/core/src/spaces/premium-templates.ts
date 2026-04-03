/**
 * Premium / paid template starters for the HTMLess marketplace.
 *
 * Each premium template extends the base Template type with pricing,
 * a features list, and — critically — sample entries with realistic
 * block-based body content so a space is immediately useful.
 */

import type { Template, TemplateField, TemplateContentType, TemplateTaxonomy, TemplateLocale } from './templates.js';

// ─── Extended types ─────────────────────────────────────────────────

export interface SampleBlock {
  type: string;
  attrs?: Record<string, unknown>;
  children?: SampleBlock[];
}

export interface SampleEntryData {
  [fieldKey: string]: unknown;
}

export interface SampleEntry {
  contentTypeKey: string;
  slug: string;
  data: SampleEntryData;
}

export interface PremiumTemplate extends Template {
  price: number;           // USD cents converted to dollars (e.g. 99 = $99)
  currency: 'USD';
  features: string[];
  previewUrl?: string;
  sampleEntries: SampleEntry[];
  readme: string;
}

// ─── Helper: shorthand field builder ────────────────────────────────

let _order = 0;
function f(
  key: string,
  name: string,
  type: string,
  opts: Partial<TemplateField> = {},
): TemplateField {
  const field: TemplateField = { key, name, type, sortOrder: _order++, ...opts };
  return field;
}
function resetOrder(): void { _order = 0; }

// ─── Block helpers ──────────────────────────────────────────────────

function heading(level: number, text: string): SampleBlock {
  return { type: 'heading', attrs: { level, text } };
}

function paragraph(text: string): SampleBlock {
  return { type: 'paragraph', attrs: { text } };
}

function image(src: string, alt: string): SampleBlock {
  return { type: 'image', attrs: { src, alt } };
}

function codeBlock(language: string, code: string): SampleBlock {
  return { type: 'code', attrs: { language, code } };
}

function callout(variant: string, text: string): SampleBlock {
  return { type: 'callout', attrs: { variant, text } };
}

function list(ordered: boolean, items: string[]): SampleBlock {
  return { type: 'list', attrs: { ordered, items } };
}

// ═══════════════════════════════════════════════════════════════════
// 1. SaaS Boilerplate  ($99)
// ═══════════════════════════════════════════════════════════════════

resetOrder();
const saasBoilerplateContentTypes: TemplateContentType[] = [
  {
    key: 'page',
    name: 'Page',
    description: 'Marketing and landing pages with hero sections, feature grids, and CTAs',
    fields: [
      f('title', 'Title', 'text', { required: true, localized: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('hero', 'Hero Section', 'json', { localized: true }),
      f('featuresList', 'Features List', 'json', { localized: true }),
      f('cta', 'Call to Action', 'json', { localized: true }),
      f('body', 'Body', 'richtext', { localized: true }),
      f('metaTitle', 'Meta Title', 'text', { localized: true }),
      f('metaDescription', 'Meta Description', 'text', { localized: true }),
    ],
  },
  (() => { resetOrder(); return {
    key: 'feature',
    name: 'Feature',
    description: 'Individual product features displayed on landing pages',
    fields: [
      f('title', 'Title', 'text', { required: true, localized: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('description', 'Description', 'richtext', { required: true, localized: true }),
      f('icon', 'Icon', 'text'),
      f('category', 'Category', 'text'),
      f('order', 'Order', 'number'),
    ],
  }; })(),
  (() => { resetOrder(); return {
    key: 'pricing-plan',
    name: 'Pricing Plan',
    description: 'Subscription tiers with feature breakdowns',
    fields: [
      f('name', 'Name', 'text', { required: true, localized: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('price', 'Price', 'number', { required: true }),
      f('interval', 'Billing Interval', 'enum', { enumValues: ['monthly', 'yearly'] }),
      f('features', 'Features', 'json', { localized: true }),
      f('highlighted', 'Highlighted', 'boolean'),
      f('order', 'Order', 'number'),
    ],
  }; })(),
  (() => { resetOrder(); return {
    key: 'testimonial',
    name: 'Testimonial',
    description: 'Customer testimonials and social proof',
    fields: [
      f('author', 'Author', 'text', { required: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('role', 'Role', 'text'),
      f('company', 'Company', 'text'),
      f('quote', 'Quote', 'text', { required: true, localized: true }),
      f('avatar', 'Avatar', 'media'),
      f('order', 'Order', 'number'),
    ],
  }; })(),
  (() => { resetOrder(); return {
    key: 'faq',
    name: 'FAQ',
    description: 'Frequently asked questions grouped by category',
    fields: [
      f('question', 'Question', 'text', { required: true, localized: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('answer', 'Answer', 'richtext', { required: true, localized: true }),
      f('category', 'Category', 'text'),
      f('order', 'Order', 'number'),
    ],
  }; })(),
  (() => { resetOrder(); return {
    key: 'changelog',
    name: 'Changelog',
    description: 'Product release notes and version history',
    fields: [
      f('version', 'Version', 'text', { required: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('date', 'Date', 'date', { required: true }),
      f('entries', 'Entries', 'json', { required: true }),
      f('body', 'Body', 'richtext', { localized: true }),
    ],
  }; })(),
  (() => { resetOrder(); return {
    key: 'blog-post',
    name: 'Blog Post',
    description: 'Company blog posts and thought leadership',
    fields: [
      f('title', 'Title', 'text', { required: true, localized: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('body', 'Body', 'richtext', { required: true, localized: true }),
      f('author', 'Author', 'text'),
      f('image', 'Featured Image', 'media'),
      f('category', 'Category', 'text'),
      f('publishedDate', 'Published Date', 'date'),
    ],
  }; })(),
];

const saasBoilerplateTaxonomies: TemplateTaxonomy[] = [
  { key: 'page-section', name: 'Page Section', hierarchical: true },
  { key: 'feature-category', name: 'Feature Category' },
  { key: 'faq-category', name: 'FAQ Category' },
  { key: 'blog-category', name: 'Blog Category' },
];

const saasBoilerplateEntries: SampleEntry[] = [
  // ── Pages ──
  {
    contentTypeKey: 'page',
    slug: 'home',
    data: {
      title: { en: 'Ship Faster with Acme Platform', es: 'Lanza mas rapido con Acme Platform' },
      hero: {
        en: { headline: 'Ship Faster with Acme Platform', subheadline: 'The all-in-one platform that helps product teams build, iterate, and deploy 10x faster.', ctaText: 'Start Free Trial', ctaLink: '/signup' },
        es: { headline: 'Lanza mas rapido con Acme Platform', subheadline: 'La plataforma todo-en-uno que ayuda a equipos de producto a construir, iterar y desplegar 10x mas rapido.', ctaText: 'Prueba Gratis', ctaLink: '/signup' },
      },
      featuresList: {
        en: ['Real-time collaboration', 'One-click deployments', 'Built-in analytics', 'Enterprise SSO'],
        es: ['Colaboracion en tiempo real', 'Despliegues con un clic', 'Analitica integrada', 'SSO empresarial'],
      },
      cta: { en: { text: 'Get started for free', link: '/signup' }, es: { text: 'Comienza gratis', link: '/signup' } },
      body: [
        heading(1, 'Why teams choose Acme'),
        paragraph('Over 2,000 companies rely on Acme to power their product development workflow. From startups to Fortune 500 enterprises, our platform scales with your ambitions.'),
      ],
      metaTitle: { en: 'Acme Platform — Ship Software Faster', es: 'Acme Platform — Lanza Software Mas Rapido' },
      metaDescription: { en: 'The all-in-one platform for product teams. Build, iterate, and deploy 10x faster with real-time collaboration and one-click deployments.', es: 'La plataforma todo-en-uno para equipos de producto.' },
    },
  },
  {
    contentTypeKey: 'page',
    slug: 'about',
    data: {
      title: { en: 'About Us', es: 'Sobre Nosotros' },
      body: [
        heading(1, 'Our Story'),
        paragraph('Acme was founded in 2022 by a team of engineers frustrated with fragmented toolchains. We believed product teams deserved a single, cohesive platform that just works.'),
        heading(2, 'Our Mission'),
        paragraph('We are on a mission to eliminate the friction between idea and production. Every feature we build is guided by a simple question: does this help teams ship faster?'),
        heading(2, 'The Team'),
        paragraph('We are a distributed team of 45 across San Francisco, London, and Tokyo, backed by $32M in Series B funding from Sequoia Capital and Accel Partners.'),
      ],
      metaTitle: { en: 'About Acme Platform', es: 'Sobre Acme Platform' },
    },
  },
  {
    contentTypeKey: 'page',
    slug: 'pricing',
    data: {
      title: { en: 'Simple, Transparent Pricing', es: 'Precios Simples y Transparentes' },
      body: [
        heading(1, 'Choose the plan that fits your team'),
        paragraph('All plans include a 14-day free trial. No credit card required. Upgrade, downgrade, or cancel at any time.'),
      ],
      metaTitle: { en: 'Pricing — Acme Platform', es: 'Precios — Acme Platform' },
    },
  },
  // ── Features ──
  {
    contentTypeKey: 'feature',
    slug: 'real-time-collaboration',
    data: {
      title: { en: 'Real-Time Collaboration', es: 'Colaboracion en Tiempo Real' },
      description: { en: 'See changes as they happen. Multiple team members can edit simultaneously with conflict-free resolution.', es: 'Ve los cambios mientras ocurren. Varios miembros pueden editar simultaneamente.' },
      icon: 'users',
      category: 'collaboration',
      order: 1,
    },
  },
  {
    contentTypeKey: 'feature',
    slug: 'one-click-deploy',
    data: {
      title: { en: 'One-Click Deployments', es: 'Despliegues con Un Clic' },
      description: { en: 'Push to production in seconds. Automatic rollbacks, blue-green deployments, and real-time logs included.', es: 'Despliega a produccion en segundos. Rollbacks automaticos y logs en tiempo real incluidos.' },
      icon: 'rocket',
      category: 'deployment',
      order: 2,
    },
  },
  {
    contentTypeKey: 'feature',
    slug: 'built-in-analytics',
    data: {
      title: { en: 'Built-In Analytics', es: 'Analitica Integrada' },
      description: { en: 'Track performance metrics, user behavior, and business KPIs without third-party scripts. Privacy-first by design.', es: 'Rastrea metricas de rendimiento y comportamiento de usuarios sin scripts de terceros.' },
      icon: 'chart-bar',
      category: 'analytics',
      order: 3,
    },
  },
  {
    contentTypeKey: 'feature',
    slug: 'enterprise-sso',
    data: {
      title: { en: 'Enterprise SSO', es: 'SSO Empresarial' },
      description: { en: 'SAML 2.0 and OpenID Connect support with automated user provisioning via SCIM. SOC 2 Type II compliant.', es: 'Soporte para SAML 2.0 y OpenID Connect con aprovisionamiento automatico.' },
      icon: 'shield-check',
      category: 'security',
      order: 4,
    },
  },
  {
    contentTypeKey: 'feature',
    slug: 'api-first',
    data: {
      title: { en: 'API-First Architecture', es: 'Arquitectura API-First' },
      description: { en: 'Every feature is accessible via our REST and GraphQL APIs. Build custom integrations and automate workflows with full programmatic control.', es: 'Cada funcionalidad es accesible via nuestras APIs REST y GraphQL.' },
      icon: 'code',
      category: 'developer',
      order: 5,
    },
  },
  {
    contentTypeKey: 'feature',
    slug: 'version-control',
    data: {
      title: { en: 'Built-In Version Control', es: 'Control de Versiones Integrado' },
      description: { en: 'Every change is tracked with full audit history. Branch, diff, and merge content just like code.', es: 'Cada cambio es rastreado. Crea ramas, compara y fusiona contenido como codigo.' },
      icon: 'git-branch',
      category: 'developer',
      order: 6,
    },
  },
  // ── Pricing Plans ──
  {
    contentTypeKey: 'pricing-plan',
    slug: 'starter',
    data: {
      name: { en: 'Starter', es: 'Inicial' },
      price: 0,
      interval: 'monthly',
      features: {
        en: ['Up to 3 team members', '1,000 entries', '5 GB storage', 'Community support', 'REST API access'],
        es: ['Hasta 3 miembros', '1.000 entradas', '5 GB almacenamiento', 'Soporte comunidad', 'Acceso API REST'],
      },
      highlighted: false,
      order: 1,
    },
  },
  {
    contentTypeKey: 'pricing-plan',
    slug: 'pro',
    data: {
      name: { en: 'Pro', es: 'Pro' },
      price: 49,
      interval: 'monthly',
      features: {
        en: ['Up to 15 team members', '50,000 entries', '50 GB storage', 'Priority email support', 'REST + GraphQL APIs', 'Webhooks', 'Custom roles'],
        es: ['Hasta 15 miembros', '50.000 entradas', '50 GB almacenamiento', 'Soporte prioritario', 'APIs REST + GraphQL', 'Webhooks', 'Roles personalizados'],
      },
      highlighted: true,
      order: 2,
    },
  },
  {
    contentTypeKey: 'pricing-plan',
    slug: 'enterprise',
    data: {
      name: { en: 'Enterprise', es: 'Empresarial' },
      price: 199,
      interval: 'monthly',
      features: {
        en: ['Unlimited team members', 'Unlimited entries', '500 GB storage', 'Dedicated account manager', 'SSO / SAML', 'SLA guarantee', 'Custom contract'],
        es: ['Miembros ilimitados', 'Entradas ilimitadas', '500 GB almacenamiento', 'Gerente de cuenta dedicado', 'SSO / SAML', 'Garantia SLA', 'Contrato personalizado'],
      },
      highlighted: false,
      order: 3,
    },
  },
  // ── Testimonials ──
  {
    contentTypeKey: 'testimonial',
    slug: 'sarah-chen',
    data: {
      author: 'Sarah Chen',
      role: 'VP of Engineering',
      company: 'Streamline Inc.',
      quote: { en: 'Acme cut our deployment time from 45 minutes to under 2 minutes. The real-time collaboration alone was worth switching for.', es: 'Acme redujo nuestro tiempo de despliegue de 45 minutos a menos de 2. Solo la colaboracion en tiempo real valio el cambio.' },
      order: 1,
    },
  },
  {
    contentTypeKey: 'testimonial',
    slug: 'marcus-johnson',
    data: {
      author: 'Marcus Johnson',
      role: 'CTO',
      company: 'Finovate',
      quote: { en: 'We evaluated 12 platforms before choosing Acme. Nothing else came close in terms of developer experience and API quality.', es: 'Evaluamos 12 plataformas antes de elegir Acme. Nada se acerco en experiencia de desarrollador y calidad de API.' },
      order: 2,
    },
  },
  {
    contentTypeKey: 'testimonial',
    slug: 'elena-rodriguez',
    data: {
      author: 'Elena Rodriguez',
      role: 'Product Manager',
      company: 'Nexora',
      quote: { en: 'The content modeling flexibility is incredible. We migrated from Contentful in a weekend and never looked back.', es: 'La flexibilidad del modelado de contenido es increible. Migramos desde Contentful en un fin de semana.' },
      order: 3,
    },
  },
  {
    contentTypeKey: 'testimonial',
    slug: 'david-park',
    data: {
      author: 'David Park',
      role: 'Head of Growth',
      company: 'Launchpad.io',
      quote: { en: 'Our marketing team can now ship landing pages without engineering support. That alone saves us 20+ hours per sprint.', es: 'Nuestro equipo de marketing ahora puede lanzar landing pages sin soporte de ingenieria.' },
      order: 4,
    },
  },
  // ── FAQs ──
  {
    contentTypeKey: 'faq',
    slug: 'what-is-acme',
    data: {
      question: { en: 'What is Acme Platform?', es: 'Que es Acme Platform?' },
      answer: { en: 'Acme is an all-in-one platform for product teams that combines content management, deployment, analytics, and collaboration into a single tool.', es: 'Acme es una plataforma todo-en-uno para equipos de producto.' },
      category: 'general',
      order: 1,
    },
  },
  {
    contentTypeKey: 'faq',
    slug: 'free-trial',
    data: {
      question: { en: 'Is there a free trial?', es: 'Hay prueba gratuita?' },
      answer: { en: 'Yes! Every plan includes a 14-day free trial with full access to all features. No credit card required to start.', es: 'Si. Cada plan incluye 14 dias de prueba gratis con acceso completo.' },
      category: 'billing',
      order: 2,
    },
  },
  {
    contentTypeKey: 'faq',
    slug: 'data-migration',
    data: {
      question: { en: 'Can I migrate from another CMS?', es: 'Puedo migrar desde otro CMS?' },
      answer: { en: 'Absolutely. We provide import tools for Contentful, Sanity, Strapi, and WordPress. Our team also offers white-glove migration for Enterprise plans.', es: 'Por supuesto. Ofrecemos herramientas de importacion para Contentful, Sanity, Strapi y WordPress.' },
      category: 'general',
      order: 3,
    },
  },
  {
    contentTypeKey: 'faq',
    slug: 'api-rate-limits',
    data: {
      question: { en: 'What are the API rate limits?', es: 'Cuales son los limites de la API?' },
      answer: { en: 'Starter plans get 100 requests/second, Pro gets 500/s, and Enterprise gets custom limits. Burst traffic up to 3x is allowed for short periods.', es: 'El plan Starter tiene 100 req/s, Pro tiene 500/s, y Enterprise tiene limites personalizados.' },
      category: 'technical',
      order: 4,
    },
  },
  {
    contentTypeKey: 'faq',
    slug: 'uptime-sla',
    data: {
      question: { en: 'What is your uptime SLA?', es: 'Cual es su SLA de uptime?' },
      answer: { en: 'We maintain 99.99% uptime for all paid plans. Enterprise customers receive a contractual SLA with financial penalties for downtime.', es: 'Mantenemos 99.99% uptime para planes de pago. Clientes Enterprise reciben SLA contractual.' },
      category: 'technical',
      order: 5,
    },
  },
  {
    contentTypeKey: 'faq',
    slug: 'cancel-anytime',
    data: {
      question: { en: 'Can I cancel my subscription?', es: 'Puedo cancelar mi suscripcion?' },
      answer: { en: 'Yes, you can cancel anytime from your account settings. Your data remains accessible for 30 days after cancellation.', es: 'Si, puede cancelar en cualquier momento. Sus datos quedan accesibles por 30 dias.' },
      category: 'billing',
      order: 6,
    },
  },
  {
    contentTypeKey: 'faq',
    slug: 'team-collaboration',
    data: {
      question: { en: 'How does team collaboration work?', es: 'Como funciona la colaboracion en equipo?' },
      answer: { en: 'Invite team members by email and assign roles (Admin, Editor, Author, Viewer). All changes are tracked with full audit history and real-time presence.', es: 'Invite miembros por email y asigne roles. Todos los cambios se rastrean con historial y presencia en tiempo real.' },
      category: 'general',
      order: 7,
    },
  },
  {
    contentTypeKey: 'faq',
    slug: 'data-security',
    data: {
      question: { en: 'How is my data secured?', es: 'Como se aseguran mis datos?' },
      answer: { en: 'All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We are SOC 2 Type II certified and GDPR compliant. Enterprise plans include data residency options.', es: 'Datos encriptados en reposo (AES-256) y en transito (TLS 1.3). Certificados SOC 2 Type II y cumplimiento GDPR.' },
      category: 'security',
      order: 8,
    },
  },
  // ── Changelog ──
  {
    contentTypeKey: 'changelog',
    slug: 'v2-4-0',
    data: {
      version: '2.4.0',
      date: '2026-03-15',
      entries: [
        { type: 'feature', text: 'GraphQL subscriptions for real-time content updates' },
        { type: 'feature', text: 'Bulk publish and unpublish operations' },
        { type: 'improvement', text: 'Content Delivery API response times reduced by 40%' },
        { type: 'fix', text: 'Fixed slug uniqueness validation across environments' },
      ],
      body: [
        heading(2, 'GraphQL Subscriptions'),
        paragraph('You can now subscribe to content changes in real-time via GraphQL subscriptions. This enables live previews, collaborative editing indicators, and instant cache invalidation.'),
        codeBlock('graphql', 'subscription {\n  entryUpdated(contentType: "article") {\n    id\n    slug\n    data\n  }\n}'),
      ],
    },
  },
  {
    contentTypeKey: 'changelog',
    slug: 'v2-3-0',
    data: {
      version: '2.3.0',
      date: '2026-02-28',
      entries: [
        { type: 'feature', text: 'AI-powered content suggestions and auto-tagging' },
        { type: 'feature', text: 'Custom block definitions with JSON Schema validation' },
        { type: 'improvement', text: 'Webhook delivery reliability improved to 99.97%' },
        { type: 'fix', text: 'Fixed media upload progress bar stalling at 99%' },
        { type: 'fix', text: 'Resolved timezone handling for scheduled publishing' },
      ],
    },
  },
  // ── Blog Posts ──
  {
    contentTypeKey: 'blog-post',
    slug: 'introducing-acme-v2',
    data: {
      title: { en: 'Introducing Acme v2: Faster, Smarter, More Flexible', es: 'Presentamos Acme v2: Mas Rapido, Inteligente y Flexible' },
      body: [
        heading(1, 'Introducing Acme v2'),
        paragraph('After 8 months of development and feedback from over 500 beta testers, we are thrilled to announce Acme Platform v2. This release represents the biggest leap forward since our initial launch.'),
        heading(2, 'What is new'),
        paragraph('Acme v2 introduces a completely redesigned content editor, real-time collaboration, and an AI assistant that helps you write, tag, and optimize content.'),
        callout('info', 'Existing users will be automatically migrated to v2. No action required on your part.'),
        heading(2, 'Performance improvements'),
        paragraph('We rewrote our Content Delivery API from the ground up. Average response times dropped from 120ms to 18ms at the 95th percentile, with a global edge cache ensuring sub-50ms responses worldwide.'),
      ],
      author: 'Acme Team',
      category: 'announcements',
      publishedDate: '2026-03-01',
    },
  },
  {
    contentTypeKey: 'blog-post',
    slug: 'content-modeling-best-practices',
    data: {
      title: { en: 'Content Modeling Best Practices for Headless CMS', es: 'Mejores Practicas de Modelado de Contenido' },
      body: [
        heading(1, 'Content Modeling Best Practices'),
        paragraph('A well-designed content model is the foundation of a successful headless CMS implementation. In this guide, we share the patterns and anti-patterns we have seen across thousands of Acme spaces.'),
        heading(2, '1. Start with the consumer'),
        paragraph('Before creating content types, map out every surface where content will appear: website, mobile app, email, digital signage. Each consumer has different data needs.'),
        heading(2, '2. Normalize aggressively'),
        paragraph('If a piece of content appears in more than one place, make it a separate content type and use references. Duplication leads to inconsistency.'),
        heading(2, '3. Use taxonomies for classification'),
        paragraph('Categories, tags, and other classification systems should be modeled as taxonomies rather than free-text fields. This enables filtering, faceted search, and consistent labeling.'),
        callout('tip', 'Use hierarchical taxonomies for categories (e.g. Electronics > Phones > Smartphones) and flat taxonomies for tags.'),
      ],
      author: 'Engineering Team',
      category: 'tutorials',
      publishedDate: '2026-02-15',
    },
  },
  {
    contentTypeKey: 'blog-post',
    slug: 'soc2-certification',
    data: {
      title: { en: 'Acme Achieves SOC 2 Type II Certification', es: 'Acme Obtiene Certificacion SOC 2 Tipo II' },
      body: [
        heading(1, 'SOC 2 Type II Certification'),
        paragraph('We are proud to announce that Acme Platform has achieved SOC 2 Type II certification, the gold standard for security and compliance in cloud services.'),
        paragraph('This certification validates that our security controls have been operating effectively over an extended audit period. Enterprise customers can request our full audit report through their account manager.'),
      ],
      author: 'Security Team',
      category: 'announcements',
      publishedDate: '2026-01-20',
    },
  },
];

export const saasBoilerplate: PremiumTemplate = {
  key: 'saas-boilerplate',
  name: 'SaaS Boilerplate',
  description: 'Complete SaaS product site with landing pages, feature showcases, pricing tiers, testimonials, FAQ, changelog, and a company blog. Bilingual English/Spanish.',
  price: 99,
  currency: 'USD',
  features: [
    '7 content types with rich field sets',
    '30+ sample entries with realistic content',
    'Block-based body content for pages and posts',
    'English and Spanish locales with translated content',
    '4 taxonomy categories for organizing content',
    'Pricing plans with feature breakdowns',
    'Customer testimonials and social proof',
    'Product changelog with release notes',
  ],
  previewUrl: 'https://templates.htmless.dev/saas-boilerplate',
  contentTypes: saasBoilerplateContentTypes,
  taxonomies: saasBoilerplateTaxonomies,
  locales: [
    { code: 'en', name: 'English', isDefault: true },
    { code: 'es', name: 'Spanish' },
  ],
  sampleEntries: saasBoilerplateEntries,
  readme: `# SaaS Boilerplate Template

A production-ready content structure for SaaS product websites. Includes 7 content types, 30+ sample entries, and bilingual content in English and Spanish.

## Content Types

- **Page** — Marketing pages with hero sections, feature lists, and CTAs
- **Feature** — Individual product features with icons and categories
- **Pricing Plan** — Subscription tiers with feature breakdowns
- **Testimonial** — Customer quotes with author details
- **FAQ** — Frequently asked questions grouped by category
- **Changelog** — Version history with structured release notes
- **Blog Post** — Company blog with rich block content

## Getting Started

1. Apply this template to a new space
2. Customize the sample content to match your product
3. Connect your frontend via the Content Delivery API
4. Publish and go live
`,
};


// ═══════════════════════════════════════════════════════════════════
// 2. Blog Engine  ($49)
// ═══════════════════════════════════════════════════════════════════

resetOrder();
const blogEngineContentTypes: TemplateContentType[] = [
  {
    key: 'post',
    name: 'Post',
    description: 'Blog posts with block-based rich content',
    fields: [
      f('title', 'Title', 'text', { required: true, localized: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('body', 'Body', 'richtext', { required: true, localized: true }),
      f('excerpt', 'Excerpt', 'text', { localized: true }),
      f('featuredImage', 'Featured Image', 'media'),
      f('author', 'Author', 'reference', { referenceTarget: 'author' }),
      f('publishedDate', 'Published Date', 'date'),
      f('readingTime', 'Reading Time (min)', 'number'),
      f('tags', 'Tags', 'json'),
    ],
  },
  (() => { resetOrder(); return {
    key: 'author',
    name: 'Author',
    description: 'Blog authors with bios and social links',
    fields: [
      f('name', 'Name', 'text', { required: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('bio', 'Bio', 'richtext'),
      f('avatar', 'Avatar', 'media'),
      f('socialLinks', 'Social Links', 'json'),
    ],
  }; })(),
  (() => { resetOrder(); return {
    key: 'category',
    name: 'Category',
    description: 'Post categories for organizing content',
    fields: [
      f('name', 'Name', 'text', { required: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('description', 'Description', 'text'),
      f('image', 'Cover Image', 'media'),
    ],
  }; })(),
  (() => { resetOrder(); return {
    key: 'tag',
    name: 'Tag',
    description: 'Post tags for fine-grained content labeling',
    fields: [
      f('name', 'Name', 'text', { required: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
    ],
  }; })(),
  (() => { resetOrder(); return {
    key: 'page',
    name: 'Page',
    description: 'Static pages (about, contact, etc.)',
    fields: [
      f('title', 'Title', 'text', { required: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('body', 'Body', 'richtext', { required: true }),
    ],
  }; })(),
];

const blogEngineEntries: SampleEntry[] = [
  // ── Authors ──
  {
    contentTypeKey: 'author',
    slug: 'jane-doe',
    data: {
      name: 'Jane Doe',
      bio: 'Full-stack developer and technical writer with 10 years of experience building web applications. Passionate about developer tools, API design, and making complex topics accessible.',
      socialLinks: { twitter: 'https://twitter.com/janedoe', github: 'https://github.com/janedoe', linkedin: 'https://linkedin.com/in/janedoe' },
    },
  },
  {
    contentTypeKey: 'author',
    slug: 'alex-rivera',
    data: {
      name: 'Alex Rivera',
      bio: 'Product designer turned developer advocate. Writes about design systems, accessibility, and the intersection of design and engineering.',
      socialLinks: { twitter: 'https://twitter.com/alexrivera', dribbble: 'https://dribbble.com/alexrivera' },
    },
  },
  // ── Categories ──
  {
    contentTypeKey: 'category',
    slug: 'tutorials',
    data: { name: 'Tutorials', description: 'Step-by-step guides and how-to articles for developers' },
  },
  {
    contentTypeKey: 'category',
    slug: 'engineering',
    data: { name: 'Engineering', description: 'Deep dives into architecture, performance, and technical decisions' },
  },
  {
    contentTypeKey: 'category',
    slug: 'design',
    data: { name: 'Design', description: 'UI/UX design patterns, accessibility, and design systems' },
  },
  {
    contentTypeKey: 'category',
    slug: 'news',
    data: { name: 'News', description: 'Product updates, release announcements, and company news' },
  },
  // ── Tags ──
  { contentTypeKey: 'tag', slug: 'javascript', data: { name: 'JavaScript' } },
  { contentTypeKey: 'tag', slug: 'typescript', data: { name: 'TypeScript' } },
  { contentTypeKey: 'tag', slug: 'react', data: { name: 'React' } },
  { contentTypeKey: 'tag', slug: 'nextjs', data: { name: 'Next.js' } },
  { contentTypeKey: 'tag', slug: 'api-design', data: { name: 'API Design' } },
  { contentTypeKey: 'tag', slug: 'performance', data: { name: 'Performance' } },
  { contentTypeKey: 'tag', slug: 'accessibility', data: { name: 'Accessibility' } },
  { contentTypeKey: 'tag', slug: 'css', data: { name: 'CSS' } },
  // ── Posts ──
  {
    contentTypeKey: 'post',
    slug: 'building-type-safe-apis-with-trpc',
    data: {
      title: 'Building Type-Safe APIs with tRPC and Next.js',
      body: [
        heading(1, 'Building Type-Safe APIs with tRPC'),
        paragraph('If you have ever wished your API calls had the same type safety as the rest of your TypeScript code, tRPC is the answer. In this tutorial, we will build a full-stack application with end-to-end type safety.'),
        heading(2, 'What is tRPC?'),
        paragraph('tRPC (TypeScript Remote Procedure Call) lets you build APIs where the input and output types are inferred automatically. No code generation, no schema definitions, no runtime overhead.'),
        heading(2, 'Setting up the project'),
        paragraph('Start by creating a new Next.js project with the T3 stack:'),
        codeBlock('bash', 'npx create-t3-app@latest my-app\ncd my-app\nnpm install'),
        heading(2, 'Defining a router'),
        paragraph('Create your first tRPC router with a simple greeting procedure:'),
        codeBlock('typescript', 'import { router, publicProcedure } from \'./trpc\';\nimport { z } from \'zod\';\n\nexport const appRouter = router({\n  hello: publicProcedure\n    .input(z.object({ name: z.string() }))\n    .query(({ input }) => {\n      return { greeting: `Hello ${input.name}!` };\n    }),\n});'),
        callout('tip', 'The input schema doubles as runtime validation. If a client sends invalid data, tRPC returns a 400 error automatically.'),
        heading(2, 'Calling from the client'),
        paragraph('On the client side, you get full autocompletion and type checking:'),
        codeBlock('typescript', 'const { data } = trpc.hello.useQuery({ name: \'World\' });\n// data is typed as { greeting: string }'),
        heading(2, 'Conclusion'),
        paragraph('tRPC eliminates the gap between backend and frontend types. Combined with Zod for validation, you get a development experience that catches errors at compile time rather than runtime.'),
      ],
      excerpt: 'Learn how to build fully type-safe APIs using tRPC and Next.js, with end-to-end TypeScript inference and zero code generation.',
      author: 'jane-doe',
      publishedDate: '2026-03-20',
      readingTime: 8,
      tags: ['typescript', 'nextjs', 'api-design'],
    },
  },
  {
    contentTypeKey: 'post',
    slug: 'css-container-queries-guide',
    data: {
      title: 'The Complete Guide to CSS Container Queries',
      body: [
        heading(1, 'CSS Container Queries: The Complete Guide'),
        paragraph('Container queries are the most significant addition to CSS since Flexbox. They allow components to adapt their styling based on the size of their container rather than the viewport.'),
        heading(2, 'Why container queries matter'),
        paragraph('Media queries respond to viewport size, but modern applications are built with reusable components that live in containers of varying sizes. A card component might appear in a narrow sidebar and a wide main content area on the same page.'),
        heading(2, 'Basic syntax'),
        codeBlock('css', '.card-container {\n  container-type: inline-size;\n  container-name: card;\n}\n\n@container card (min-width: 400px) {\n  .card {\n    display: grid;\n    grid-template-columns: 200px 1fr;\n  }\n}'),
        callout('info', 'Container queries have shipped in all major browsers since early 2023, so they are safe to use in production today.'),
        heading(2, 'Container query units'),
        paragraph('CSS also introduced container query length units: cqw, cqh, cqi, cqb, cqmin, and cqmax. These work like viewport units but relative to the container.'),
        codeBlock('css', '.card-title {\n  font-size: clamp(1rem, 3cqi, 2rem);\n}'),
        heading(2, 'Real-world patterns'),
        paragraph('Here are three patterns where container queries shine: responsive cards, adaptive navigation menus, and dashboard widgets that reconfigure based on available space.'),
      ],
      excerpt: 'Master CSS container queries with practical examples. Learn how to build truly responsive components that adapt to their container size.',
      author: 'alex-rivera',
      publishedDate: '2026-03-10',
      readingTime: 6,
      tags: ['css', 'performance'],
    },
  },
  {
    contentTypeKey: 'post',
    slug: 'optimizing-react-performance',
    data: {
      title: 'Optimizing React Performance: Beyond React.memo',
      body: [
        heading(1, 'Optimizing React Performance'),
        paragraph('React.memo is the go-to performance optimization, but it is often misused and rarely the best tool for the job. Let us explore the techniques that actually make a difference.'),
        heading(2, 'Measure first'),
        paragraph('Before optimizing, profile your application using React DevTools Profiler. Look for components that re-render frequently with the same props.'),
        callout('warning', 'Premature optimization is the root of all evil. Always measure before and after to verify your changes actually improve performance.'),
        heading(2, 'Technique 1: State colocation'),
        paragraph('Move state as close to where it is used as possible. If only one child component needs a piece of state, do not store it in a parent that causes siblings to re-render.'),
        heading(2, 'Technique 2: Composition patterns'),
        paragraph('Use the children prop to prevent unnecessary re-renders:'),
        codeBlock('tsx', '// Bad: ExpensiveTree re-renders when count changes\nfunction App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div>\n      <button onClick={() => setCount(c => c + 1)}>{count}</button>\n      <ExpensiveTree />\n    </div>\n  );\n}\n\n// Good: ExpensiveTree does NOT re-render\nfunction App() {\n  return (\n    <Counter>\n      <ExpensiveTree />\n    </Counter>\n  );\n}'),
        heading(2, 'Technique 3: useDeferredValue'),
        paragraph('For expensive computations triggered by user input, useDeferredValue lets React prioritize the input update and defer the expensive re-render:'),
        codeBlock('tsx', 'function SearchResults({ query }: { query: string }) {\n  const deferredQuery = useDeferredValue(query);\n  const results = useMemo(() => filterItems(deferredQuery), [deferredQuery]);\n  return <List items={results} />;\n}'),
      ],
      excerpt: 'Go beyond React.memo with state colocation, composition patterns, and concurrent features to build genuinely fast React applications.',
      author: 'jane-doe',
      publishedDate: '2026-02-28',
      readingTime: 10,
      tags: ['react', 'javascript', 'performance'],
    },
  },
  {
    contentTypeKey: 'post',
    slug: 'building-accessible-forms',
    data: {
      title: 'Building Accessible Forms That Everyone Can Use',
      body: [
        heading(1, 'Accessible Forms That Everyone Can Use'),
        paragraph('Forms are the primary way users interact with web applications, yet they remain one of the most common sources of accessibility barriers. Here is how to get them right.'),
        heading(2, 'Labels and instructions'),
        paragraph('Every input needs a visible, associated label. Placeholder text is not a substitute for a label because it disappears when the user starts typing.'),
        codeBlock('html', '<label for="email">Email address</label>\n<input type="email" id="email" name="email"\n  aria-describedby="email-hint"\n  required />\n<p id="email-hint">We will never share your email.</p>'),
        heading(2, 'Error handling'),
        paragraph('When validation fails, clearly describe what went wrong and how to fix it. Associate error messages with their inputs using aria-describedby.'),
        callout('tip', 'Use aria-live="polite" on your error summary so screen readers announce errors automatically when they appear.'),
        heading(2, 'Keyboard navigation'),
        paragraph('Users must be able to complete the entire form using only the keyboard. Tab through every input, radio button, checkbox, and submit button to verify the order is logical.'),
        image('https://images.unsplash.com/photo-1555421689-d68471e189f2', 'Developer testing keyboard navigation on a form'),
        heading(2, 'Testing checklist'),
        list(true, [
          'All inputs have visible labels',
          'Error messages are descriptive and associated with inputs',
          'Form is fully navigable by keyboard',
          'Screen reader announces all labels, hints, and errors',
          'Color is not the only indicator of state (error, success)',
        ]),
      ],
      excerpt: 'A practical guide to building web forms that work for everyone, including keyboard and screen reader users.',
      author: 'alex-rivera',
      publishedDate: '2026-02-15',
      readingTime: 7,
      tags: ['accessibility', 'css', 'javascript'],
    },
  },
  {
    contentTypeKey: 'post',
    slug: 'next-js-server-components-patterns',
    data: {
      title: 'Practical Patterns for Next.js Server Components',
      body: [
        heading(1, 'Practical Patterns for Server Components'),
        paragraph('React Server Components are now the default in Next.js App Router. After a year of using them in production, here are the patterns that have proven most useful.'),
        heading(2, 'Pattern 1: Data fetching at the top'),
        paragraph('Fetch data in Server Components at the top of the component tree and pass it down as props. This eliminates client-side loading states for initial page loads.'),
        codeBlock('tsx', '// app/posts/page.tsx (Server Component)\nexport default async function PostsPage() {\n  const posts = await db.post.findMany({\n    orderBy: { publishedDate: \'desc\' },\n    take: 20,\n  });\n  return <PostList posts={posts} />;\n}'),
        heading(2, 'Pattern 2: Client islands'),
        paragraph('Use the "client island" pattern: wrap only the interactive parts in Client Components while keeping the surrounding layout as a Server Component.'),
        heading(2, 'Pattern 3: Streaming with Suspense'),
        paragraph('For slow data sources, wrap the component in Suspense to stream the rest of the page immediately while the slow part loads:'),
        codeBlock('tsx', '<Suspense fallback={<AnalyticsSkeleton />}>\n  <AnalyticsDashboard />\n</Suspense>'),
        callout('info', 'Streaming works automatically with Next.js App Router. No additional configuration needed.'),
      ],
      excerpt: 'Battle-tested patterns for building production applications with React Server Components and Next.js App Router.',
      author: 'jane-doe',
      publishedDate: '2026-01-30',
      readingTime: 9,
      tags: ['react', 'nextjs', 'typescript'],
    },
  },
  // ── Pages ──
  {
    contentTypeKey: 'page',
    slug: 'about',
    data: {
      title: 'About This Blog',
      body: [
        heading(1, 'About'),
        paragraph('This blog covers web development, design, and engineering. We publish in-depth tutorials, technical deep dives, and practical guides for modern web development.'),
        heading(2, 'Who writes here'),
        paragraph('Our authors are practicing engineers and designers who write about the tools and techniques they use every day. No fluff, no hype — just practical knowledge.'),
        heading(2, 'Contributing'),
        paragraph('We welcome guest posts. If you have a topic you are passionate about, reach out via the contact page.'),
      ],
    },
  },
  {
    contentTypeKey: 'page',
    slug: 'contact',
    data: {
      title: 'Contact Us',
      body: [
        heading(1, 'Get in Touch'),
        paragraph('Have a question, suggestion, or guest post idea? We would love to hear from you.'),
        paragraph('Email us at hello@blog.example.com or find us on Twitter @blogexample.'),
      ],
    },
  },
];

export const blogEngine: PremiumTemplate = {
  key: 'blog-engine',
  name: 'Blog Engine',
  description: 'A fully-featured blog with posts, authors, categories, tags, and static pages. Posts include realistic block content with code samples, callouts, images, and lists.',
  price: 49,
  currency: 'USD',
  features: [
    '5 content types (Post, Author, Category, Tag, Page)',
    '5 posts with realistic block-based content',
    'Code blocks, callouts, images, and ordered lists',
    '2 author profiles with social links',
    '4 categories and 8 tags',
    '2 static pages (about, contact)',
    'Category and tag taxonomies',
    'Reading time field for posts',
  ],
  previewUrl: 'https://templates.htmless.dev/blog-engine',
  contentTypes: blogEngineContentTypes,
  taxonomies: [
    { key: 'category', name: 'Category', hierarchical: true },
    { key: 'tag', name: 'Tag', hierarchical: false },
  ],
  locales: [
    { code: 'en', name: 'English', isDefault: true },
  ],
  sampleEntries: blogEngineEntries,
  readme: `# Blog Engine Template

A production-ready blog content structure with 5 content types and 20+ sample entries. Posts include realistic block content with headings, paragraphs, code samples, callouts, and images.

## Content Types

- **Post** — Blog posts with block-based bodies, excerpts, author references, reading time, and tags
- **Author** — Writer profiles with bios and social media links
- **Category** — Hierarchical categories for organizing posts
- **Tag** — Flat tags for fine-grained content labeling
- **Page** — Static pages for about, contact, and similar content

## Getting Started

1. Apply this template to create your blog space
2. Customize authors and categories
3. Write your first post using the block editor
4. Connect via CDA and render on your frontend
`,
};


// ═══════════════════════════════════════════════════════════════════
// 3. AI Dashboard  ($149)
// ═══════════════════════════════════════════════════════════════════

resetOrder();
const aiDashboardContentTypes: TemplateContentType[] = [
  {
    key: 'dashboard',
    name: 'Dashboard',
    description: 'Configurable AI dashboard with widget layouts',
    fields: [
      f('title', 'Title', 'text', { required: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('description', 'Description', 'text'),
      f('widgets', 'Widgets', 'json', { required: true }),
    ],
  },
  (() => { resetOrder(); return {
    key: 'model',
    name: 'Model',
    description: 'AI model configurations with provider and endpoint details',
    fields: [
      f('name', 'Name', 'text', { required: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('provider', 'Provider', 'text', { required: true }),
      f('endpoint', 'Endpoint', 'text', { required: true }),
      f('apiKey', 'API Key', 'text'),
      f('config', 'Configuration', 'json'),
    ],
  }; })(),
  (() => { resetOrder(); return {
    key: 'prompt',
    name: 'Prompt',
    description: 'Reusable prompt templates with variable substitution',
    fields: [
      f('name', 'Name', 'text', { required: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('template', 'Template', 'richtext', { required: true }),
      f('variables', 'Variables', 'json'),
      f('model', 'Model', 'reference', { referenceTarget: 'model' }),
    ],
  }; })(),
  (() => { resetOrder(); return {
    key: 'conversation',
    name: 'Conversation',
    description: 'Saved AI conversations with full message history',
    fields: [
      f('title', 'Title', 'text', { required: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('messages', 'Messages', 'json', { required: true }),
      f('model', 'Model', 'reference', { referenceTarget: 'model' }),
    ],
  }; })(),
  (() => { resetOrder(); return {
    key: 'knowledge-base',
    name: 'Knowledge Base',
    description: 'Document collections for RAG and context injection',
    fields: [
      f('title', 'Title', 'text', { required: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('description', 'Description', 'text'),
      f('documents', 'Documents', 'json', { required: true }),
    ],
  }; })(),
];

const aiDashboardEntries: SampleEntry[] = [
  // ── Dashboard ──
  {
    contentTypeKey: 'dashboard',
    slug: 'main-dashboard',
    data: {
      title: 'AI Operations Dashboard',
      description: 'Central hub for monitoring AI model usage, prompt performance, and conversation analytics.',
      widgets: [
        { id: 'w1', type: 'metric', title: 'Total API Calls (24h)', config: { source: 'api_logs', metric: 'count', timeRange: '24h' }, position: { x: 0, y: 0, w: 3, h: 1 } },
        { id: 'w2', type: 'metric', title: 'Avg Response Time', config: { source: 'api_logs', metric: 'avg_latency', timeRange: '24h' }, position: { x: 3, y: 0, w: 3, h: 1 } },
        { id: 'w3', type: 'metric', title: 'Token Usage', config: { source: 'api_logs', metric: 'total_tokens', timeRange: '24h' }, position: { x: 6, y: 0, w: 3, h: 1 } },
        { id: 'w4', type: 'metric', title: 'Error Rate', config: { source: 'api_logs', metric: 'error_rate', timeRange: '24h' }, position: { x: 9, y: 0, w: 3, h: 1 } },
        { id: 'w5', type: 'chart', title: 'Requests Over Time', config: { source: 'api_logs', chartType: 'line', groupBy: 'hour', metric: 'count', timeRange: '7d' }, position: { x: 0, y: 1, w: 6, h: 2 } },
        { id: 'w6', type: 'chart', title: 'Model Usage Distribution', config: { source: 'api_logs', chartType: 'pie', groupBy: 'model', metric: 'count', timeRange: '30d' }, position: { x: 6, y: 1, w: 6, h: 2 } },
        { id: 'w7', type: 'table', title: 'Recent Conversations', config: { source: 'conversations', columns: ['title', 'model', 'messageCount', 'updatedAt'], limit: 10 }, position: { x: 0, y: 3, w: 12, h: 2 } },
      ],
    },
  },
  // ── Models ──
  {
    contentTypeKey: 'model',
    slug: 'gpt-4o',
    data: {
      name: 'GPT-4o',
      provider: 'OpenAI',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: 'sk-placeholder-replace-with-your-key',
      config: {
        model: 'gpt-4o',
        maxTokens: 4096,
        temperature: 0.7,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        responseFormat: 'text',
      },
    },
  },
  {
    contentTypeKey: 'model',
    slug: 'claude-sonnet',
    data: {
      name: 'Claude Sonnet 4',
      provider: 'Anthropic',
      endpoint: 'https://api.anthropic.com/v1/messages',
      apiKey: 'sk-ant-placeholder-replace-with-your-key',
      config: {
        model: 'claude-sonnet-4-20250514',
        maxTokens: 8192,
        temperature: 0.7,
        topP: 0.9,
        systemPrompt: 'You are a helpful AI assistant.',
      },
    },
  },
  // ── Prompts ──
  {
    contentTypeKey: 'prompt',
    slug: 'summarize-article',
    data: {
      name: 'Summarize Article',
      template: 'You are an expert content summarizer. Summarize the following article in {{length}} sentences. Focus on key takeaways and actionable insights.\n\n---\n\n{{article_text}}\n\n---\n\nProvide the summary in bullet points.',
      variables: [
        { key: 'article_text', label: 'Article Text', type: 'textarea', required: true },
        { key: 'length', label: 'Number of Sentences', type: 'number', default: 5 },
      ],
      model: 'claude-sonnet',
    },
  },
  {
    contentTypeKey: 'prompt',
    slug: 'generate-blog-outline',
    data: {
      name: 'Generate Blog Outline',
      template: 'Create a detailed blog post outline for the topic: "{{topic}}"\n\nTarget audience: {{audience}}\nTone: {{tone}}\nTarget word count: {{word_count}}\n\nInclude:\n- A compelling title\n- Introduction hook\n- 4-6 main sections with subsections\n- Key points to cover in each section\n- Conclusion with call-to-action\n- SEO keywords to target',
      variables: [
        { key: 'topic', label: 'Topic', type: 'text', required: true },
        { key: 'audience', label: 'Target Audience', type: 'text', default: 'developers' },
        { key: 'tone', label: 'Tone', type: 'select', options: ['professional', 'casual', 'academic', 'conversational'], default: 'conversational' },
        { key: 'word_count', label: 'Word Count', type: 'number', default: 2000 },
      ],
      model: 'gpt-4o',
    },
  },
  {
    contentTypeKey: 'prompt',
    slug: 'code-review',
    data: {
      name: 'Code Review',
      template: 'Review the following {{language}} code. Evaluate it for:\n\n1. **Correctness** — Are there bugs or logical errors?\n2. **Performance** — Are there inefficiencies or potential bottlenecks?\n3. **Readability** — Is the code clear and well-structured?\n4. **Security** — Are there any security vulnerabilities?\n5. **Best Practices** — Does it follow {{language}} conventions?\n\n```{{language}}\n{{code}}\n```\n\nProvide specific, actionable feedback with code examples for suggested improvements.',
      variables: [
        { key: 'code', label: 'Code', type: 'textarea', required: true },
        { key: 'language', label: 'Language', type: 'text', default: 'TypeScript' },
      ],
      model: 'claude-sonnet',
    },
  },
  {
    contentTypeKey: 'prompt',
    slug: 'extract-structured-data',
    data: {
      name: 'Extract Structured Data',
      template: 'Extract structured data from the following text and return it as a JSON object matching this schema:\n\n```json\n{{schema}}\n```\n\nText to extract from:\n\n{{text}}\n\nReturn ONLY valid JSON. Do not include explanations.',
      variables: [
        { key: 'text', label: 'Source Text', type: 'textarea', required: true },
        { key: 'schema', label: 'Target JSON Schema', type: 'textarea', required: true },
      ],
      model: 'gpt-4o',
    },
  },
  // ── Conversation ──
  {
    contentTypeKey: 'conversation',
    slug: 'api-architecture-discussion',
    data: {
      title: 'API Architecture Discussion',
      messages: [
        { role: 'user', content: 'I am designing a REST API for a multi-tenant CMS. Each tenant (space) has its own content types, entries, and assets. What is the best URL structure?', timestamp: '2026-03-28T10:00:00Z' },
        { role: 'assistant', content: 'For a multi-tenant CMS API, I recommend a structure that makes the space context explicit while keeping URLs clean:\n\n**Option A: Header-based tenancy**\n```\nGET /v1/entries\nX-Space-Id: space_abc123\n```\n\n**Option B: URL-based tenancy**\n```\nGET /v1/spaces/abc123/entries\n```\n\nOption A is cleaner for SDKs (set the header once), while Option B is more explicit and easier to debug. Most mature CMS platforms (Contentful, Sanity) use a hybrid approach.\n\nFor your CMA (Content Management API), I would use header-based tenancy with explicit space routes for cross-space operations like listing spaces.', timestamp: '2026-03-28T10:00:15Z' },
        { role: 'user', content: 'Good points. How should I handle versioning of content entries? I need draft and published states with full version history.', timestamp: '2026-03-28T10:01:00Z' },
        { role: 'assistant', content: 'Here is a proven pattern for content versioning:\n\n1. **Entries** are the anchor — they hold the slug and content type reference\n2. **EntryVersions** store the actual data as immutable JSON snapshots\n3. **EntryState** tracks the current draft and published version IDs\n\nThis gives you:\n- Full version history (every save creates a new EntryVersion)\n- Independent draft/published states\n- Easy rollback (point draftVersionId to an older version)\n- Efficient diffing between any two versions\n\nThe CMA returns the draft version by default, while the CDA always returns the published version. This separation keeps the read path fast.', timestamp: '2026-03-28T10:01:30Z' },
      ],
      model: 'claude-sonnet',
    },
  },
  // ── Knowledge Base ──
  {
    contentTypeKey: 'knowledge-base',
    slug: 'product-docs',
    data: {
      title: 'Product Documentation',
      description: 'Core product documentation for RAG-powered support and content generation. Includes API reference, getting started guides, and architecture overviews.',
      documents: [
        { id: 'doc-1', title: 'Getting Started Guide', type: 'markdown', content: '# Getting Started\n\nWelcome to the platform. This guide walks you through creating your first space, defining content types, and publishing your first entry.\n\n## Step 1: Create a Space\n\nA space is an isolated content environment. Create one via the dashboard or API.\n\n## Step 2: Define Content Types\n\nContent types are the schema for your content. Define fields like title, body, images, and references.\n\n## Step 3: Create and Publish\n\nCreate entries, preview them, and publish when ready.', wordCount: 85, updatedAt: '2026-03-15' },
        { id: 'doc-2', title: 'API Reference Overview', type: 'markdown', content: '# API Reference\n\nThe platform exposes two APIs:\n\n- **CMA (Content Management API)** — Full CRUD operations for content, schemas, assets, and settings. Requires authentication.\n- **CDA (Content Delivery API)** — Read-only, optimized for content delivery. Supports caching and CDN integration.\n\nAll endpoints return JSON. Rate limits apply based on your plan tier.', wordCount: 55, updatedAt: '2026-03-20' },
        { id: 'doc-3', title: 'Architecture Overview', type: 'markdown', content: '# Architecture\n\nThe platform uses a multi-tenant architecture with logical isolation at the database level. Each space has its own content types, entries, assets, and configurations.\n\nKey components:\n- Express.js API server\n- PostgreSQL with Prisma ORM\n- Redis for caching and real-time events\n- S3-compatible storage for media assets\n- Traefik for reverse proxy and TLS termination', wordCount: 60, updatedAt: '2026-03-10' },
      ],
    },
  },
];

export const aiDashboard: PremiumTemplate = {
  key: 'ai-dashboard',
  name: 'AI Dashboard',
  description: 'A content structure for building AI-powered dashboards with model management, reusable prompt templates, conversation storage, and RAG knowledge bases.',
  price: 149,
  currency: 'USD',
  features: [
    '5 content types for AI operations',
    'Dashboard with configurable widget layouts',
    'Model configurations for GPT-4o and Claude',
    '4 reusable prompt templates with variables',
    'Conversation storage with full message history',
    'Knowledge base for RAG document management',
    'JSON-based widget and config schemas',
  ],
  previewUrl: 'https://templates.htmless.dev/ai-dashboard',
  contentTypes: aiDashboardContentTypes,
  taxonomies: [],
  locales: [
    { code: 'en', name: 'English', isDefault: true },
  ],
  sampleEntries: aiDashboardEntries,
  readme: `# AI Dashboard Template

A content structure for building AI-powered dashboards and tools. Includes model management, reusable prompt templates, conversation storage, and knowledge bases for RAG.

## Content Types

- **Dashboard** — Widget-based layouts with metric, chart, and table components
- **Model** — AI model configurations (provider, endpoint, parameters)
- **Prompt** — Reusable prompt templates with variable substitution
- **Conversation** — Saved AI conversations with message history
- **Knowledge Base** — Document collections for context injection and RAG

## Getting Started

1. Apply this template to create your AI dashboard space
2. Replace placeholder API keys with your actual keys
3. Customize prompts for your use case
4. Build your frontend consuming the CDA
`,
};


// ═══════════════════════════════════════════════════════════════════
// 4. E-commerce Content  ($99)
// ═══════════════════════════════════════════════════════════════════

resetOrder();
const ecommerceContentTypes: TemplateContentType[] = [
  {
    key: 'product',
    name: 'Product',
    description: 'Products with full e-commerce fields including pricing, inventory, and SEO',
    fields: [
      f('name', 'Name', 'text', { required: true, localized: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('description', 'Description', 'richtext', { required: true, localized: true }),
      f('price', 'Price', 'number', { required: true }),
      f('compareAtPrice', 'Compare At Price', 'number'),
      f('images', 'Images', 'json'),
      f('sku', 'SKU', 'text', { unique: true }),
      f('inStock', 'In Stock', 'boolean'),
      f('weight', 'Weight (g)', 'number'),
      f('category', 'Category', 'text'),
      f('brand', 'Brand', 'reference', { referenceTarget: 'brand' }),
      f('tags', 'Tags', 'json'),
      f('seoTitle', 'SEO Title', 'text', { localized: true }),
      f('seoDescription', 'SEO Description', 'text', { localized: true }),
    ],
  },
  (() => { resetOrder(); return {
    key: 'collection',
    name: 'Collection',
    description: 'Curated product collections and categories',
    fields: [
      f('name', 'Name', 'text', { required: true, localized: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('description', 'Description', 'richtext', { localized: true }),
      f('image', 'Cover Image', 'media'),
      f('products', 'Products', 'json'),
    ],
  }; })(),
  (() => { resetOrder(); return {
    key: 'brand',
    name: 'Brand',
    description: 'Product brands with logos and descriptions',
    fields: [
      f('name', 'Name', 'text', { required: true }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('logo', 'Logo', 'media'),
      f('description', 'Description', 'richtext'),
    ],
  }; })(),
  (() => { resetOrder(); return {
    key: 'review',
    name: 'Review',
    description: 'Product reviews with ratings',
    fields: [
      f('product', 'Product', 'reference', { required: true, referenceTarget: 'product' }),
      f('slug', 'Slug', 'slug', { required: true, unique: true }),
      f('author', 'Author', 'text', { required: true }),
      f('rating', 'Rating', 'number', { required: true, validations: { min: 1, max: 5 } }),
      f('title', 'Title', 'text'),
      f('body', 'Body', 'richtext'),
    ],
  }; })(),
];

const ecommerceEntries: SampleEntry[] = [
  // ── Brands ──
  {
    contentTypeKey: 'brand',
    slug: 'aurora-tech',
    data: {
      name: 'Aurora Tech',
      description: 'Premium consumer electronics and smart home devices. Founded in 2018 in San Francisco, Aurora Tech combines cutting-edge technology with minimalist Scandinavian design.',
    },
  },
  {
    contentTypeKey: 'brand',
    slug: 'verde-outdoor',
    data: {
      name: 'Verde Outdoor',
      description: 'Sustainable outdoor gear and apparel made from recycled and organic materials. B-Corp certified since 2020.',
    },
  },
  {
    contentTypeKey: 'brand',
    slug: 'craft-home',
    data: {
      name: 'Craft & Home',
      description: 'Artisanal home goods and decor sourced from independent makers around the world. Every piece tells a story.',
    },
  },
  // ── Products ──
  {
    contentTypeKey: 'product',
    slug: 'aurora-wireless-headphones',
    data: {
      name: { en: 'Aurora Wireless Headphones', es: 'Auriculares Inalambricos Aurora' },
      description: { en: 'Premium over-ear headphones with adaptive noise cancellation, 40-hour battery life, and lossless audio via Bluetooth 5.3. Crafted from recycled aluminum and protein leather.', es: 'Auriculares premium over-ear con cancelacion de ruido adaptativa, 40 horas de bateria y audio sin perdida via Bluetooth 5.3.' },
      price: 299.99,
      compareAtPrice: 349.99,
      images: [
        { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e', alt: 'Aurora Wireless Headphones - front view' },
        { url: 'https://images.unsplash.com/photo-1590658268037-6bf12f032f4e', alt: 'Aurora Wireless Headphones - side view' },
      ],
      sku: 'AUR-WH-001',
      inStock: true,
      weight: 265,
      category: 'electronics',
      brand: 'aurora-tech',
      tags: ['headphones', 'wireless', 'noise-cancelling', 'bluetooth'],
      seoTitle: { en: 'Aurora Wireless Headphones — Premium ANC Over-Ear', es: 'Auriculares Inalambricos Aurora — ANC Premium' },
      seoDescription: { en: 'Premium over-ear headphones with adaptive noise cancellation and 40-hour battery life. Free shipping.', es: 'Auriculares premium con cancelacion de ruido adaptativa y 40 horas de bateria. Envio gratis.' },
    },
  },
  {
    contentTypeKey: 'product',
    slug: 'aurora-smart-speaker',
    data: {
      name: { en: 'Aurora Smart Speaker', es: 'Altavoz Inteligente Aurora' },
      description: { en: 'Room-filling 360-degree sound with built-in voice assistant, multi-room support, and a walnut veneer finish. Plays lossless audio from all major streaming services.', es: 'Sonido 360 grados con asistente de voz integrado, soporte multi-habitacion y acabado en nogal.' },
      price: 179.99,
      images: [
        { url: 'https://images.unsplash.com/photo-1589492477829-5e65395b66cc', alt: 'Aurora Smart Speaker on shelf' },
      ],
      sku: 'AUR-SS-001',
      inStock: true,
      weight: 1200,
      category: 'electronics',
      brand: 'aurora-tech',
      tags: ['speaker', 'smart-home', 'voice-assistant'],
      seoTitle: { en: 'Aurora Smart Speaker — 360 Sound with Voice Assistant', es: 'Altavoz Inteligente Aurora' },
    },
  },
  {
    contentTypeKey: 'product',
    slug: 'verde-trail-jacket',
    data: {
      name: { en: 'Verde Trail Jacket', es: 'Chaqueta Trail Verde' },
      description: { en: 'Lightweight waterproof jacket made from 100% recycled nylon. 20K/20K waterproof-breathable rating with fully taped seams. Packs into its own chest pocket. Perfect for trail running and hiking in variable conditions.', es: 'Chaqueta ligera impermeable de nylon 100% reciclado. Clasificacion 20K/20K impermeable-transpirable. Se guarda en su propio bolsillo.' },
      price: 189.00,
      compareAtPrice: 220.00,
      images: [
        { url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea', alt: 'Verde Trail Jacket worn outdoors' },
      ],
      sku: 'VRD-TJ-M-BLU',
      inStock: true,
      weight: 195,
      category: 'apparel',
      brand: 'verde-outdoor',
      tags: ['jacket', 'waterproof', 'hiking', 'trail-running', 'sustainable'],
      seoTitle: { en: 'Verde Trail Jacket — Recycled Waterproof Running Jacket', es: 'Chaqueta Trail Verde — Impermeable Reciclada' },
    },
  },
  {
    contentTypeKey: 'product',
    slug: 'verde-merino-base-layer',
    data: {
      name: { en: 'Verde Merino Base Layer', es: 'Capa Base Merino Verde' },
      description: { en: 'Ultrasoft 150gsm merino wool base layer with flatlock seams and odor resistance. Temperature-regulating for year-round comfort. Ethically sourced from New Zealand farms.', es: 'Capa base de lana merino ultrasuave de 150gsm con costuras planas y resistencia al olor.' },
      price: 89.00,
      images: [
        { url: 'https://images.unsplash.com/photo-1556906781-9a412961c28c', alt: 'Verde Merino Base Layer' },
      ],
      sku: 'VRD-MB-M-BLK',
      inStock: true,
      weight: 170,
      category: 'apparel',
      brand: 'verde-outdoor',
      tags: ['base-layer', 'merino', 'sustainable', 'hiking'],
      seoTitle: { en: 'Verde Merino Base Layer — Ethical Merino Wool', es: 'Capa Base Merino Verde' },
    },
  },
  {
    contentTypeKey: 'product',
    slug: 'handwoven-cotton-throw',
    data: {
      name: { en: 'Handwoven Cotton Throw', es: 'Manta de Algodon Tejida a Mano' },
      description: { en: 'Artisan-crafted throw blanket handwoven by cooperatives in Oaxaca, Mexico. Made from organic cotton with natural indigo dye. Each piece is unique with slight variations in pattern.', es: 'Manta artesanal tejida a mano por cooperativas en Oaxaca, Mexico. Algodon organico con tinte natural de indigo.' },
      price: 145.00,
      images: [
        { url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc', alt: 'Handwoven cotton throw draped over sofa' },
      ],
      sku: 'CH-HCT-001',
      inStock: true,
      weight: 850,
      category: 'home',
      brand: 'craft-home',
      tags: ['throw', 'handwoven', 'organic', 'artisan'],
      seoTitle: { en: 'Handwoven Cotton Throw — Artisan Made in Oaxaca', es: 'Manta de Algodon Tejida a Mano' },
    },
  },
  {
    contentTypeKey: 'product',
    slug: 'ceramic-pour-over-set',
    data: {
      name: { en: 'Ceramic Pour-Over Coffee Set', es: 'Set de Cafe Pour-Over de Ceramica' },
      description: { en: 'Minimalist pour-over coffee set in matte white stoneware. Includes dripper, server, and two cups. Hand-thrown by a ceramicist in Portland, Oregon. Dishwasher safe.', es: 'Set minimalista pour-over en gres blanco mate. Incluye gotero, servidor y dos tazas. Hecho a mano en Portland.' },
      price: 78.00,
      images: [
        { url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085', alt: 'Ceramic pour-over coffee set on counter' },
      ],
      sku: 'CH-POS-WHT',
      inStock: true,
      weight: 620,
      category: 'home',
      brand: 'craft-home',
      tags: ['coffee', 'ceramic', 'handmade', 'kitchen'],
      seoTitle: { en: 'Ceramic Pour-Over Set — Handmade in Portland', es: 'Set Pour-Over de Ceramica' },
    },
  },
  {
    contentTypeKey: 'product',
    slug: 'aurora-fitness-tracker',
    data: {
      name: { en: 'Aurora Fitness Tracker', es: 'Rastreador Fitness Aurora' },
      description: { en: 'Ultra-thin fitness tracker with AMOLED display, GPS, heart rate monitoring, sleep tracking, and 14-day battery life. Swim-proof to 50 meters. Syncs with Apple Health and Google Fit.', es: 'Rastreador fitness ultrafino con pantalla AMOLED, GPS, monitor de ritmo cardiaco y 14 dias de bateria.' },
      price: 149.99,
      images: [
        { url: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6', alt: 'Aurora Fitness Tracker on wrist' },
      ],
      sku: 'AUR-FT-001',
      inStock: false,
      weight: 28,
      category: 'electronics',
      brand: 'aurora-tech',
      tags: ['fitness', 'wearable', 'gps', 'health'],
      seoTitle: { en: 'Aurora Fitness Tracker — 14-Day Battery, GPS, Swim-Proof', es: 'Rastreador Fitness Aurora' },
    },
  },
  {
    contentTypeKey: 'product',
    slug: 'verde-daypack-22l',
    data: {
      name: { en: 'Verde Daypack 22L', es: 'Mochila Verde 22L' },
      description: { en: 'Versatile 22-liter daypack made from recycled ocean plastic. Features a padded laptop sleeve (fits 15"), water bottle pockets, and a rain cover stowed in the base. PFC-free DWR coating.', es: 'Mochila versatil de 22 litros hecha de plastico oceanico reciclado. Compartimento acolchado para portatil de 15".' },
      price: 129.00,
      compareAtPrice: 149.00,
      images: [
        { url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62', alt: 'Verde Daypack 22L in use' },
      ],
      sku: 'VRD-DP-22-GRN',
      inStock: true,
      weight: 680,
      category: 'accessories',
      brand: 'verde-outdoor',
      tags: ['backpack', 'sustainable', 'laptop', 'everyday-carry'],
      seoTitle: { en: 'Verde Daypack 22L — Recycled Ocean Plastic Backpack', es: 'Mochila Verde 22L' },
    },
  },
  // ── Collections ──
  {
    contentTypeKey: 'collection',
    slug: 'summer-essentials',
    data: {
      name: { en: 'Summer Essentials', es: 'Esenciales de Verano' },
      description: { en: 'Everything you need for the perfect summer — from outdoor gear to smart accessories. Curated for adventure seekers and urban explorers alike.', es: 'Todo lo que necesitas para el verano perfecto — desde equipo outdoor hasta accesorios inteligentes.' },
      products: ['verde-trail-jacket', 'verde-daypack-22l', 'aurora-wireless-headphones', 'aurora-fitness-tracker'],
    },
  },
  {
    contentTypeKey: 'collection',
    slug: 'home-and-living',
    data: {
      name: { en: 'Home & Living', es: 'Hogar y Vida' },
      description: { en: 'Thoughtfully crafted home goods that bring warmth and character to any space. Handmade by independent artisans.', es: 'Articulos para el hogar cuidadosamente elaborados que aportan calidez y caracter.' },
      products: ['handwoven-cotton-throw', 'ceramic-pour-over-set', 'aurora-smart-speaker'],
    },
  },
  {
    contentTypeKey: 'collection',
    slug: 'sustainable-picks',
    data: {
      name: { en: 'Sustainable Picks', es: 'Selecciones Sostenibles' },
      description: { en: 'Our most sustainable products — made from recycled materials, organic fibers, and ethically sourced ingredients. Good for you, good for the planet.', es: 'Nuestros productos mas sostenibles — hechos de materiales reciclados y fibras organicas.' },
      products: ['verde-trail-jacket', 'verde-merino-base-layer', 'verde-daypack-22l', 'handwoven-cotton-throw'],
    },
  },
  // ── Reviews ──
  {
    contentTypeKey: 'review',
    slug: 'review-headphones-sarah',
    data: {
      product: 'aurora-wireless-headphones',
      author: 'Sarah M.',
      rating: 5,
      title: 'Best headphones I have ever owned',
      body: 'The noise cancellation is incredible — completely silent on my daily commute. Battery life is exactly as advertised (I got 41 hours). The recycled materials feel premium, not cheap. Worth every penny.',
    },
  },
  {
    contentTypeKey: 'review',
    slug: 'review-headphones-james',
    data: {
      product: 'aurora-wireless-headphones',
      author: 'James K.',
      rating: 4,
      title: 'Great sound, slightly heavy',
      body: 'Sound quality is phenomenal, especially with lossless audio enabled. My only complaint is they feel a bit heavy after 3+ hours of continuous use. The carrying case is a nice touch.',
    },
  },
  {
    contentTypeKey: 'review',
    slug: 'review-trail-jacket-mike',
    data: {
      product: 'verde-trail-jacket',
      author: 'Mike R.',
      rating: 5,
      title: 'Survived a downpour on the PCT',
      body: 'Wore this through 6 hours of continuous rain on the Pacific Crest Trail. Stayed completely dry. It packs down to the size of a grapefruit. The fact that it is made from recycled materials is a bonus.',
    },
  },
  {
    contentTypeKey: 'review',
    slug: 'review-throw-lisa',
    data: {
      product: 'handwoven-cotton-throw',
      author: 'Lisa P.',
      rating: 5,
      title: 'Stunning craftsmanship',
      body: 'The colors are even more beautiful in person. You can see the slight variations in the weave that prove it is truly handmade. It has become the centerpiece of our living room.',
    },
  },
  {
    contentTypeKey: 'review',
    slug: 'review-coffee-set-tom',
    data: {
      product: 'ceramic-pour-over-set',
      author: 'Tom H.',
      rating: 4,
      title: 'Beautiful but fragile',
      body: 'The design is gorgeous and makes great coffee. The matte white finish is elegant. Docking one star because the dripper chip is thin and I worry about longevity. Handle with care and it will last.',
    },
  },
  {
    contentTypeKey: 'review',
    slug: 'review-daypack-anna',
    data: {
      product: 'verde-daypack-22l',
      author: 'Anna W.',
      rating: 5,
      title: 'My everyday carry for everything',
      body: 'I use this for commuting, day hikes, and weekend trips. The laptop sleeve is well-padded, the rain cover saved me during an unexpected shower, and knowing it is made from ocean plastic makes me feel good. The 22L size is perfect — big enough for a full day, small enough for the office.',
    },
  },
];

export const ecommerceContent: PremiumTemplate = {
  key: 'ecommerce-content',
  name: 'E-Commerce Content',
  description: 'Complete e-commerce content structure with products, collections, brands, and reviews. Includes 8 products across 3 brands with realistic descriptions, pricing, SKUs, and customer reviews. Bilingual English/Spanish.',
  price: 99,
  currency: 'USD',
  features: [
    '4 content types (Product, Collection, Brand, Review)',
    '8 products with full e-commerce fields',
    '3 brands with descriptions',
    '3 curated collections',
    '6 customer reviews with ratings',
    'Compare-at pricing for sale items',
    'SKU and inventory tracking fields',
    'SEO title and description fields',
    'English and Spanish locales',
    'Product category, brand, and tag taxonomies',
  ],
  previewUrl: 'https://templates.htmless.dev/ecommerce-content',
  contentTypes: ecommerceContentTypes,
  taxonomies: [
    { key: 'product-category', name: 'Product Category', hierarchical: true },
    { key: 'brand', name: 'Brand', hierarchical: false },
    { key: 'tag', name: 'Tag', hierarchical: false },
  ],
  locales: [
    { code: 'en', name: 'English', isDefault: true },
    { code: 'es', name: 'Spanish' },
  ],
  sampleEntries: ecommerceEntries,
  readme: `# E-Commerce Content Template

A production-ready content structure for headless e-commerce. Includes 4 content types, 8 products across 3 brands, curated collections, and customer reviews. Bilingual English/Spanish.

## Content Types

- **Product** — Full e-commerce fields: name, price, compareAtPrice, images, SKU, stock, weight, SEO
- **Collection** — Curated product groupings with descriptions and cover images
- **Brand** — Brand profiles with logos and descriptions
- **Review** — Customer reviews with product references and star ratings

## Getting Started

1. Apply this template to create your e-commerce content space
2. Replace sample products with your actual inventory
3. Adjust collections and categories to match your store
4. Connect to your storefront via the Content Delivery API
`,
};


// ─── Registry ───────────────────────────────────────────────────────

export const premiumTemplates: PremiumTemplate[] = [
  saasBoilerplate,
  blogEngine,
  aiDashboard,
  ecommerceContent,
];

export function getPremiumTemplate(key: string): PremiumTemplate | undefined {
  return premiumTemplates.find((t) => t.key === key);
}

export function getPremiumTemplates(): PremiumTemplate[] {
  return premiumTemplates;
}
