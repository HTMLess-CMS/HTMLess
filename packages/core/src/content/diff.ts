// ─── Content Version Diff Engine ─────────────────────────────────────

export interface DiffResult {
  path: string;
  type: 'added' | 'removed' | 'changed';
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Deep recursive diff of two JSON objects.
 * Returns an array of DiffResult entries describing every difference
 * between versionA and versionB.
 */
export function diffVersions(
  versionA: Record<string, unknown>,
  versionB: Record<string, unknown>,
): DiffResult[] {
  const results: DiffResult[] = [];
  diffRecursive(versionA, versionB, '', results);
  return results;
}

function diffRecursive(
  a: unknown,
  b: unknown,
  path: string,
  results: DiffResult[],
): void {
  // Identical values (strict equality covers primitives and same references)
  if (a === b) return;

  // Both null/undefined — already covered by ===, but be explicit
  if (a === null && b === null) return;
  if (a === undefined && b === undefined) return;

  // One is null/undefined and the other is not
  if (a == null && b != null) {
    results.push({ path: path || '(root)', type: 'added', newValue: b });
    return;
  }
  if (a != null && b == null) {
    results.push({ path: path || '(root)', type: 'removed', oldValue: a });
    return;
  }

  const typeA = Array.isArray(a) ? 'array' : typeof a;
  const typeB = Array.isArray(b) ? 'array' : typeof b;

  // Different types — treat as changed
  if (typeA !== typeB) {
    results.push({ path: path || '(root)', type: 'changed', oldValue: a, newValue: b });
    return;
  }

  // Both arrays
  if (typeA === 'array') {
    const arrA = a as unknown[];
    const arrB = b as unknown[];
    const maxLen = Math.max(arrA.length, arrB.length);

    for (let i = 0; i < maxLen; i++) {
      const itemPath = path ? `${path}[${i}]` : `[${i}]`;

      if (i >= arrA.length) {
        results.push({ path: itemPath, type: 'added', newValue: arrB[i] });
      } else if (i >= arrB.length) {
        results.push({ path: itemPath, type: 'removed', oldValue: arrA[i] });
      } else {
        diffRecursive(arrA[i], arrB[i], itemPath, results);
      }
    }
    return;
  }

  // Both objects
  if (typeA === 'object') {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(objA), ...Object.keys(objB)]);

    for (const key of allKeys) {
      const childPath = path ? `${path}.${key}` : key;

      if (!(key in objA)) {
        results.push({ path: childPath, type: 'added', newValue: objB[key] });
      } else if (!(key in objB)) {
        results.push({ path: childPath, type: 'removed', oldValue: objA[key] });
      } else {
        diffRecursive(objA[key], objB[key], childPath, results);
      }
    }
    return;
  }

  // Primitives (string, number, boolean) — different values
  if (a !== b) {
    results.push({ path: path || '(root)', type: 'changed', oldValue: a, newValue: b });
  }
}
