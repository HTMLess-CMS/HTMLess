/**
 * Core block definitions shipped with HTMLess.
 * Each entry carries a JSON Schema for its attributes.
 */

export interface CoreBlockDef {
  key: string;
  title: string;
  description: string;
  icon: string;
  attributesSchema: Record<string, unknown>;
}

export const coreBlocks: CoreBlockDef[] = [
  {
    key: 'paragraph',
    title: 'Paragraph',
    description: 'A block of body text.',
    icon: 'pilcrow',
    attributesSchema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    key: 'heading',
    title: 'Heading',
    description: 'Section heading (h1 - h6).',
    icon: 'heading',
    attributesSchema: {
      type: 'object',
      required: ['level', 'text'],
      properties: {
        level: { type: 'integer', minimum: 1, maximum: 6 },
        text: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    key: 'image',
    title: 'Image',
    description: 'Image block referencing an asset.',
    icon: 'image',
    attributesSchema: {
      type: 'object',
      required: ['assetId'],
      properties: {
        assetId: { type: 'string' },
        alt: { type: 'string' },
        caption: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    key: 'callout',
    title: 'Callout',
    description: 'Highlighted notice box (info, warning, success, danger).',
    icon: 'megaphone',
    attributesSchema: {
      type: 'object',
      required: ['tone', 'body'],
      properties: {
        tone: { type: 'string', enum: ['info', 'warning', 'success', 'danger'] },
        title: { type: 'string' },
        body: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    key: 'embed',
    title: 'Embed',
    description: 'Embedded external content (video, tweet, etc.).',
    icon: 'link',
    attributesSchema: {
      type: 'object',
      required: ['url'],
      properties: {
        url: { type: 'string', format: 'uri' },
        type: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    key: 'list',
    title: 'List',
    description: 'Ordered or unordered list.',
    icon: 'list',
    attributesSchema: {
      type: 'object',
      required: ['ordered', 'items'],
      properties: {
        ordered: { type: 'boolean' },
        items: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
  },
  {
    key: 'code',
    title: 'Code',
    description: 'Code block with optional syntax highlighting.',
    icon: 'code',
    attributesSchema: {
      type: 'object',
      required: ['code'],
      properties: {
        language: { type: 'string' },
        code: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
];
