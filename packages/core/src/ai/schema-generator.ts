// ─── AI Schema Generation (stub — keyword matching for now) ───
//
// This module provides the framework for AI-driven schema generation.
// Wire to OpenAI/Anthropic via extension hooks when ready.

interface GeneratedField {
  key: string;
  name: string;
  type: string;
  required: boolean;
}

interface GeneratedContentType {
  key: string;
  name: string;
  description: string;
}

interface GenerateSchemaResult {
  contentTypes: GeneratedContentType[];
  fields: GeneratedField[][];
}

const presets: Record<string, { type: GeneratedContentType; fields: GeneratedField[] }> = {
  blog: {
    type: { key: 'article', name: 'Article', description: 'Blog post or article' },
    fields: [
      { key: 'title', name: 'Title', type: 'text', required: true },
      { key: 'body', name: 'Body', type: 'richtext', required: true },
      { key: 'author', name: 'Author', type: 'text', required: false },
      { key: 'image', name: 'Featured Image', type: 'media', required: false },
      { key: 'date', name: 'Publish Date', type: 'date', required: false },
    ],
  },
  article: {
    type: { key: 'article', name: 'Article', description: 'Blog post or article' },
    fields: [
      { key: 'title', name: 'Title', type: 'text', required: true },
      { key: 'body', name: 'Body', type: 'richtext', required: true },
      { key: 'author', name: 'Author', type: 'text', required: false },
      { key: 'image', name: 'Featured Image', type: 'media', required: false },
      { key: 'date', name: 'Publish Date', type: 'date', required: false },
    ],
  },
  product: {
    type: { key: 'product', name: 'Product', description: 'E-commerce product listing' },
    fields: [
      { key: 'name', name: 'Name', type: 'text', required: true },
      { key: 'price', name: 'Price', type: 'number', required: true },
      { key: 'description', name: 'Description', type: 'richtext', required: false },
      { key: 'image', name: 'Product Image', type: 'media', required: false },
      { key: 'category', name: 'Category', type: 'text', required: false },
    ],
  },
  page: {
    type: { key: 'page', name: 'Page', description: 'Static page' },
    fields: [
      { key: 'title', name: 'Title', type: 'text', required: true },
      { key: 'body', name: 'Body', type: 'richtext', required: true },
      { key: 'hero', name: 'Hero Image', type: 'media', required: false },
      { key: 'seo', name: 'SEO Metadata', type: 'json', required: false },
    ],
  },
  event: {
    type: { key: 'event', name: 'Event', description: 'Event listing' },
    fields: [
      { key: 'title', name: 'Title', type: 'text', required: true },
      { key: 'description', name: 'Description', type: 'richtext', required: false },
      { key: 'date', name: 'Event Date', type: 'date', required: true },
      { key: 'location', name: 'Location', type: 'text', required: false },
      { key: 'image', name: 'Event Image', type: 'media', required: false },
    ],
  },
};

export async function generateSchemaFromPrompt(
  prompt: string,
): Promise<GenerateSchemaResult> {
  const lower = prompt.toLowerCase();

  const contentTypes: GeneratedContentType[] = [];
  const fields: GeneratedField[][] = [];

  // Match against known presets
  for (const [keyword, preset] of Object.entries(presets)) {
    if (lower.includes(keyword)) {
      // Avoid duplicating the same content type key
      if (!contentTypes.some((ct) => ct.key === preset.type.key)) {
        contentTypes.push(preset.type);
        fields.push(preset.fields);
      }
    }
  }

  // Fallback: if nothing matched, create a generic page type
  if (contentTypes.length === 0) {
    const fallback = presets.page!;
    contentTypes.push(fallback.type);
    fields.push(fallback.fields);
  }

  return { contentTypes, fields };
}
