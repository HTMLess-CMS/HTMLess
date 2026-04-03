// ─── Google Sheets → CMS Integration ───
//
// Works with the public CSV-export URL — no Google API key required.
// Users publish their sheet, paste the URL, and we turn rows into entries.

// ─── Public types ──────────────────────────────────────────────────────

export interface ParsedSheetUrl {
  spreadsheetId: string;
  gid?: string;
}

export interface SheetToEntriesResult {
  entries: Record<string, unknown>[];
  unmappedColumns: string[];
  headers: string[];
}

// ─── URL parsing ───────────────────────────────────────────────────────

/**
 * Extract spreadsheet ID and optional GID from a Google Sheets URL.
 * Accepts standard share links, /edit links, and /pub links.
 */
export function parseSheetUrl(url: string): ParsedSheetUrl {
  // Match the spreadsheet ID from various URL formats
  const idMatch = url.match(
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
  );
  if (!idMatch) {
    throw new Error('Invalid Google Sheets URL — could not extract spreadsheet ID');
  }

  const spreadsheetId = idMatch[1];

  // Try to extract GID from hash or query param
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : undefined;

  return { spreadsheetId, gid };
}

/**
 * Convert a Google Sheets URL into its public CSV-export URL.
 */
export function buildCsvExportUrl(url: string): string {
  const { spreadsheetId, gid } = parseSheetUrl(url);
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  return gid ? `${base}&gid=${gid}` : base;
}

/**
 * Fetch sheet contents as raw CSV text via the public export endpoint.
 */
export async function fetchSheetAsCsv(url: string): Promise<string> {
  const csvUrl = buildCsvExportUrl(url);

  const response = await fetch(csvUrl, {
    headers: { Accept: 'text/csv' },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch sheet (HTTP ${response.status}). Make sure the sheet is published to the web.`,
    );
  }

  return response.text();
}

// ─── CSV parsing (lightweight, no dependency) ──────────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip the second quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

function parseCsv(csv: string): string[][] {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.map(parseCsvLine);
}

// ─── Column header → field key mapping ─────────────────────────────────

function headerToCamelCase(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[^a-z]/, (c) => c.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

// ─── Sheet → Entries ───────────────────────────────────────────────────

/**
 * Convert parsed CSV data into entry objects.
 *
 * @param csv           Raw CSV string
 * @param contentTypeKey  Used for context in the result (not embedded in entries)
 * @param fieldMapping  Optional override: column header → field key
 */
export function sheetToEntries(
  csv: string,
  _contentTypeKey: string,
  fieldMapping?: Record<string, string>,
): SheetToEntriesResult {
  const rows = parseCsv(csv);

  if (rows.length < 2) {
    return { entries: [], unmappedColumns: [], headers: [] };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Build mapping: column index → field key
  const mapping: (string | null)[] = headers.map((header) => {
    if (fieldMapping && fieldMapping[header]) {
      return fieldMapping[header];
    }
    const camel = headerToCamelCase(header);
    return camel || null;
  });

  // Track unmapped columns
  const unmappedColumns: string[] = [];
  headers.forEach((header, idx) => {
    if (mapping[idx] === null) {
      unmappedColumns.push(header);
    }
  });

  // Convert rows to entry objects
  const entries: Record<string, unknown>[] = [];

  for (const row of dataRows) {
    const entry: Record<string, unknown> = {};
    let hasData = false;

    for (let i = 0; i < headers.length; i++) {
      const fieldKey = mapping[i];
      if (!fieldKey) continue;

      const rawValue = row[i] ?? '';

      // Basic type coercion
      const value = coerceValue(rawValue);
      if (value !== '' && value !== null) {
        hasData = true;
      }
      entry[fieldKey] = value;
    }

    if (hasData) {
      entries.push(entry);
    }
  }

  return {
    entries,
    unmappedColumns,
    headers,
  };
}

// ─── Value coercion ────────────────────────────────────────────────────

function coerceValue(raw: string): unknown {
  if (raw === '') return '';

  // Boolean
  if (raw.toLowerCase() === 'true') return true;
  if (raw.toLowerCase() === 'false') return false;

  // Number
  const num = Number(raw);
  if (!isNaN(num) && raw.trim() !== '') return num;

  // ISO date
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return raw;
}

// ─── Infer field types from sheet data ─────────────────────────────────

export interface InferredSheetField {
  key: string;
  name: string;
  type: string;
  samples: unknown[];
}

/**
 * Analyze CSV data and infer field types for schema generation.
 */
export function inferFieldsFromCsv(csv: string): InferredSheetField[] {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const dataRows = rows.slice(1, 11); // sample first 10

  return headers.map((header, colIdx) => {
    const key = headerToCamelCase(header);
    const samples = dataRows.map((row) => coerceValue(row[colIdx] ?? ''));
    const type = inferColumnType(samples);

    return {
      key: key || header.toLowerCase().replace(/\s+/g, '_'),
      name: header.trim(),
      type,
      samples: samples.slice(0, 3),
    };
  });
}

function inferColumnType(samples: unknown[]): string {
  const types = samples
    .filter((s) => s !== '' && s !== null && s !== undefined)
    .map((s) => {
      if (typeof s === 'boolean') return 'boolean';
      if (typeof s === 'number') return 'number';
      if (typeof s === 'string') {
        if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return 'date';
        if (/^https?:\/\//i.test(s) && /\.(jpe?g|png|gif|webp|svg)/i.test(s)) return 'media';
        if (s.length > 500) return 'richtext';
        return 'text';
      }
      return 'text';
    });

  if (types.length === 0) return 'text';

  // Majority vote
  const counts = new Map<string, number>();
  for (const t of types) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  let best = 'text';
  let bestCount = 0;
  for (const [t, c] of counts) {
    if (c > bestCount) {
      best = t;
      bestCount = c;
    }
  }

  return best;
}
