import type { ContentType, Field } from '@prisma/client';

const FIELD_TYPE_MAP: Record<string, object> = {
  text: { type: 'string' },
  richtext: { type: 'array', items: { type: 'object' } },
  number: { type: 'number' },
  boolean: { type: 'boolean' },
  date: { type: 'string', format: 'date-time' },
  media: { type: 'string', description: 'Asset ID reference' },
  reference: { type: 'string', description: 'Entry ID reference' },
  json: { type: 'object' },
  slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
  enum: { type: 'string' },
};

export function generateJsonSchema(
  contentType: ContentType & { fields: Field[] },
  baseUrl = 'https://schemas.htmless.com',
) {
  const required: string[] = [];
  const properties: Record<string, object> = {};

  for (const field of contentType.fields) {
    let schema: Record<string, unknown> = { ...(FIELD_TYPE_MAP[field.type] || { type: 'string' }) };

    if (field.required) required.push(field.key);

    // Apply validations
    if (field.validations && typeof field.validations === 'object') {
      const v = field.validations as Record<string, unknown>;
      if (v.minLength !== undefined) schema.minLength = v.minLength;
      if (v.maxLength !== undefined) schema.maxLength = v.maxLength;
      if (v.min !== undefined) schema.minimum = v.min;
      if (v.max !== undefined) schema.maximum = v.max;
      if (v.pattern !== undefined) schema.pattern = v.pattern;
    }

    // Enum values
    if (field.type === 'enum' && field.enumValues) {
      schema.enum = field.enumValues;
    }

    // Reference target
    if (field.referenceTarget) {
      schema.description = `Reference to ${field.referenceTarget}`;
    }

    properties[field.key] = schema;
  }

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `${baseUrl}/${contentType.key}.v${contentType.version}.json`,
    title: contentType.name,
    description: contentType.description || undefined,
    type: 'object' as const,
    required: ['id', 'type', 'slug', 'fields', 'state'],
    properties: {
      id: { type: 'string' },
      type: { const: contentType.key },
      slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
      state: { enum: ['draft', 'published', 'scheduled', 'archived'] },
      fields: {
        type: 'object',
        required,
        properties,
        additionalProperties: false,
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    additionalProperties: false,
  };
}
