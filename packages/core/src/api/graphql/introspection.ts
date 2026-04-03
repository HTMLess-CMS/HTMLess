// ─── GraphQL-like schema introspection ───

import { prisma } from '../../db.js';

interface FieldSchema {
  name: string;
  type: string;
  description: string;
}

interface OperationSchema {
  name: string;
  description: string;
  args: { name: string; type: string; required: boolean }[];
  returnType: string;
  fields: FieldSchema[];
}

export interface IntrospectionResult {
  queryOperations: OperationSchema[];
  contentTypes: {
    key: string;
    name: string;
    fields: { key: string; type: string; required: boolean }[];
  }[];
}

const staticOperations: OperationSchema[] = [
  {
    name: 'entries',
    description: 'Query published entries, optionally filtered by content type',
    args: [
      { name: 'type', type: 'String', required: false },
      { name: 'limit', type: 'Int', required: false },
      { name: 'offset', type: 'Int', required: false },
    ],
    returnType: '[Entry]',
    fields: [
      { name: 'id', type: 'String', description: 'Entry ID' },
      { name: 'type', type: 'String', description: 'Content type key' },
      { name: 'slug', type: 'String', description: 'URL slug' },
      { name: 'data', type: 'JSON', description: 'Entry data object' },
      { name: 'publishedAt', type: 'DateTime', description: 'Publication timestamp' },
      { name: 'updatedAt', type: 'DateTime', description: 'Last update timestamp' },
    ],
  },
  {
    name: 'entry',
    description: 'Fetch a single published entry by type+slug or id',
    args: [
      { name: 'type', type: 'String', required: false },
      { name: 'slug', type: 'String', required: false },
      { name: 'id', type: 'String', required: false },
    ],
    returnType: 'Entry',
    fields: [
      { name: 'id', type: 'String', description: 'Entry ID' },
      { name: 'type', type: 'String', description: 'Content type key' },
      { name: 'slug', type: 'String', description: 'URL slug' },
      { name: 'data', type: 'JSON', description: 'Entry data object' },
      { name: 'publishedAt', type: 'DateTime', description: 'Publication timestamp' },
      { name: 'updatedAt', type: 'DateTime', description: 'Last update timestamp' },
    ],
  },
  {
    name: 'types',
    description: 'List content types and their field schemas',
    args: [],
    returnType: '[ContentType]',
    fields: [
      { name: 'id', type: 'String', description: 'Content type ID' },
      { name: 'key', type: 'String', description: 'Machine key' },
      { name: 'name', type: 'String', description: 'Display name' },
      { name: 'description', type: 'String', description: 'Description' },
      { name: 'fields', type: '[Field]', description: 'Field definitions' },
    ],
  },
  {
    name: 'assets',
    description: 'List uploaded assets',
    args: [
      { name: 'limit', type: 'Int', required: false },
      { name: 'offset', type: 'Int', required: false },
    ],
    returnType: '[Asset]',
    fields: [
      { name: 'id', type: 'String', description: 'Asset ID' },
      { name: 'filename', type: 'String', description: 'Original filename' },
      { name: 'mimeType', type: 'String', description: 'MIME type' },
      { name: 'bytes', type: 'Int', description: 'File size in bytes' },
      { name: 'url', type: 'String', description: 'Public URL' },
      { name: 'alt', type: 'String', description: 'Alt text' },
      { name: 'createdAt', type: 'DateTime', description: 'Upload timestamp' },
    ],
  },
];

export async function getIntrospection(spaceId: string): Promise<IntrospectionResult> {
  const types = await prisma.contentType.findMany({
    where: { spaceId },
    include: { fields: { orderBy: { sortOrder: 'asc' } } },
  });

  return {
    queryOperations: staticOperations,
    contentTypes: types.map((ct) => ({
      key: ct.key,
      name: ct.name,
      fields: ct.fields.map((f) => ({
        key: f.key,
        type: f.type,
        required: f.required,
      })),
    })),
  };
}
