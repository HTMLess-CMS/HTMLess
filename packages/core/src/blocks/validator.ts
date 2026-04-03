import { prisma } from '../db.js';

export interface BlockValidationError {
  path: string;
  message: string;
}

/**
 * Validates a block tree against registered block definitions for a space.
 * Returns an array of errors (empty = valid).
 */
export async function validateBlockTree(
  blocks: unknown[],
  spaceId: string,
): Promise<BlockValidationError[]> {
  // Load all block definitions for this space (keyed by latest version)
  const definitions = await prisma.blockDefinition.findMany({
    where: { spaceId },
    orderBy: { version: 'desc' },
  });

  // Build a map of key -> latest definition
  const defMap = new Map<string, (typeof definitions)[number]>();
  for (const def of definitions) {
    if (!defMap.has(def.key)) {
      defMap.set(def.key, def);
    }
  }

  const errors: BlockValidationError[] = [];
  validateNodes(blocks, defMap, errors, 'blocks');
  return errors;
}

function validateNodes(
  nodes: unknown[],
  defMap: Map<string, { key: string; attributesSchema: unknown }>,
  errors: BlockValidationError[],
  basePath: string,
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as Record<string, unknown> | null;
    const path = `${basePath}[${i}]`;

    if (!node || typeof node !== 'object') {
      errors.push({ path, message: 'Block must be an object' });
      continue;
    }

    if (!node.typeKey || typeof node.typeKey !== 'string') {
      errors.push({ path, message: 'Block must have a string "typeKey"' });
      continue;
    }

    if (!node.attrs || typeof node.attrs !== 'object') {
      errors.push({ path, message: 'Block must have an "attrs" object' });
      continue;
    }

    const def = defMap.get(node.typeKey);
    if (!def) {
      errors.push({ path, message: `Unknown block type "${node.typeKey}"` });
      continue;
    }

    // Validate attrs against attributesSchema
    const schema = def.attributesSchema as JsonSchema | null;
    if (schema) {
      validateAttrs(node.attrs as Record<string, unknown>, schema, errors, `${path}.attrs`);
    }

    // Recurse into children if present
    if (node.children !== undefined) {
      if (!Array.isArray(node.children)) {
        errors.push({ path: `${path}.children`, message: 'Block children must be an array' });
      } else {
        validateNodes(node.children, defMap, errors, `${path}.children`);
      }
    }
  }
}

// ─── Simple JSON Schema validator (handles type, required, enum) ───

interface JsonSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  enum?: unknown[];
  items?: JsonSchema;
  minimum?: number;
  maximum?: number;
}

function validateAttrs(
  attrs: Record<string, unknown>,
  schema: JsonSchema,
  errors: BlockValidationError[],
  basePath: string,
): void {
  // Check required
  if (schema.required) {
    for (const key of schema.required) {
      if (attrs[key] === undefined || attrs[key] === null) {
        errors.push({ path: `${basePath}.${key}`, message: `"${key}" is required` });
      }
    }
  }

  // Check properties
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const value = attrs[key];
      if (value === undefined || value === null) continue;

      validateValue(value, propSchema, errors, `${basePath}.${key}`);
    }
  }
}

function validateValue(
  value: unknown,
  schema: JsonSchema,
  errors: BlockValidationError[],
  path: string,
): void {
  // Type check
  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    const expectedType = schema.type === 'integer' ? 'number' : schema.type;

    if (actualType !== expectedType) {
      errors.push({ path, message: `Expected ${schema.type}, got ${actualType}` });
      return;
    }

    if (schema.type === 'integer' && !Number.isInteger(value)) {
      errors.push({ path, message: 'Expected an integer' });
      return;
    }
  }

  // Enum check
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({ path, message: `Must be one of: ${schema.enum.join(', ')}` });
  }

  // Range checks
  if (schema.minimum !== undefined && typeof value === 'number' && value < schema.minimum) {
    errors.push({ path, message: `Must be >= ${schema.minimum}` });
  }
  if (schema.maximum !== undefined && typeof value === 'number' && value > schema.maximum) {
    errors.push({ path, message: `Must be <= ${schema.maximum}` });
  }

  // Array items check
  if (schema.type === 'array' && Array.isArray(value) && schema.items) {
    for (let i = 0; i < value.length; i++) {
      validateValue(value[i], schema.items, errors, `${path}[${i}]`);
    }
  }
}
