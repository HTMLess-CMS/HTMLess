// ─── Advanced CDA Filtering & Sorting ───────────────────────────────

export interface FilterCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface SortDirective {
  field: string;
  direction: 'asc' | 'desc';
}

const SUPPORTED_OPERATORS = new Set([
  '$eq',
  '$ne',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$contains',
  '$startsWith',
  '$in',
]);

/**
 * Parse query params into FilterCondition[].
 *
 * Supported formats:
 *   ?filter[field]=value              → implicit $eq
 *   ?filter[field][$gt]=value         → explicit operator
 */
export function parseFilters(query: Record<string, string>): FilterCondition[] {
  const conditions: FilterCondition[] = [];

  for (const [key, raw] of Object.entries(query)) {
    // Match filter[field] or filter[field][$op]
    const match = key.match(/^filter\[([^\]]+)\](?:\[(\$[^\]]+)\])?$/);
    if (!match) continue;

    const field = match[1]!;
    const operator = match[2] ?? '$eq';

    if (!SUPPORTED_OPERATORS.has(operator)) continue;

    let value: unknown = raw;

    // Attempt to parse JSON-like values
    if (raw === 'true') value = true;
    else if (raw === 'false') value = false;
    else if (raw === 'null') value = null;
    else if (/^-?\d+(\.\d+)?$/.test(raw)) value = Number(raw);
    else if (operator === '$in') {
      // $in expects comma-separated values
      value = raw.split(',').map((v) => {
        const trimmed = v.trim();
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
        return trimmed;
      });
    }

    conditions.push({ field, operator, value });
  }

  return conditions;
}

/**
 * Parse sort query param into SortDirective[].
 *
 *   ?sort=field       → ascending
 *   ?sort=-field      → descending
 *   ?sort=a,-b        → multiple
 */
export function parseSortDirectives(sortParam: string | undefined): SortDirective[] {
  if (!sortParam || sortParam.trim().length === 0) return [];

  return sortParam.split(',').map((s) => {
    const trimmed = s.trim();
    if (trimmed.startsWith('-')) {
      return { field: trimmed.slice(1), direction: 'desc' as const };
    }
    return { field: trimmed, direction: 'asc' as const };
  });
}

/**
 * Evaluate a single filter condition against a data record.
 */
function evaluateCondition(data: Record<string, unknown>, condition: FilterCondition): boolean {
  const { field, operator, value } = condition;

  // Support nested field access via dot notation
  const fieldValue = getNestedValue(data, field);

  switch (operator) {
    case '$eq':
      return fieldValue === value;

    case '$ne':
      return fieldValue !== value;

    case '$gt':
      return typeof fieldValue === 'number' && typeof value === 'number'
        ? fieldValue > value
        : String(fieldValue) > String(value);

    case '$gte':
      return typeof fieldValue === 'number' && typeof value === 'number'
        ? fieldValue >= value
        : String(fieldValue) >= String(value);

    case '$lt':
      return typeof fieldValue === 'number' && typeof value === 'number'
        ? fieldValue < value
        : String(fieldValue) < String(value);

    case '$lte':
      return typeof fieldValue === 'number' && typeof value === 'number'
        ? fieldValue <= value
        : String(fieldValue) <= String(value);

    case '$contains':
      return typeof fieldValue === 'string' && typeof value === 'string'
        ? fieldValue.includes(value)
        : false;

    case '$startsWith':
      return typeof fieldValue === 'string' && typeof value === 'string'
        ? fieldValue.startsWith(value)
        : false;

    case '$in':
      return Array.isArray(value) ? value.includes(fieldValue) : false;

    default:
      return true;
  }
}

/**
 * Apply all filter conditions to a data record.
 * Returns true if the record passes ALL conditions (AND logic).
 */
export function applyFilters(conditions: FilterCondition[], data: Record<string, unknown>): boolean {
  return conditions.every((cond) => evaluateCondition(data, cond));
}

/**
 * Sort an array of items by their data fields according to sort directives.
 */
export function applySorting<T extends { data: Record<string, unknown> }>(
  items: T[],
  directives: SortDirective[],
): T[] {
  if (directives.length === 0) return items;

  return [...items].sort((a, b) => {
    for (const { field, direction } of directives) {
      const aVal = getNestedValue(a.data, field);
      const bVal = getNestedValue(b.data, field);

      let cmp = 0;
      if (aVal == null && bVal == null) cmp = 0;
      else if (aVal == null) cmp = -1;
      else if (bVal == null) cmp = 1;
      else if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
      else cmp = String(aVal).localeCompare(String(bVal));

      if (cmp !== 0) {
        return direction === 'desc' ? -cmp : cmp;
      }
    }
    return 0;
  });
}

/**
 * Get a nested value from an object using dot notation.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
