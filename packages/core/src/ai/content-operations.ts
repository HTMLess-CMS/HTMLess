// ─── AI Content Operations (stubs — simple heuristics for now) ───
//
// Each function provides the framework and a basic fallback implementation.
// Wire to OpenAI/Anthropic via extension hooks when ready.

/**
 * Generate a summary from text content.
 * Stub: returns the first 200 characters followed by an ellipsis.
 */
export async function generateSummary(text: string): Promise<string> {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 200) return cleaned;
  return cleaned.slice(0, 200) + '...';
}

/**
 * Generate alt text for an image asset.
 * Stub: returns "Image: {filename}" with the extension stripped.
 */
export async function generateAltText(
  filename: string,
  _mimeType: string,
): Promise<string> {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  return `Image: ${nameWithoutExt}`;
}

/**
 * Generate SEO metadata from entry data.
 * Stub: extracts title, builds a description from the first text field,
 * and pulls keywords from field names.
 */
export async function generateMetadata(
  data: Record<string, unknown>,
): Promise<{ title: string; description: string; keywords: string[] }> {
  // Try to find a title
  const title = typeof data.title === 'string'
    ? data.title
    : typeof data.name === 'string'
      ? data.name
      : 'Untitled';

  // Build description from the first long text field
  let description = '';
  for (const value of Object.values(data)) {
    if (typeof value === 'string' && value.length > 20) {
      description = value.slice(0, 160);
      break;
    }
  }

  // Extract keywords from string values
  const keywords: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && value.length > 0 && value.length < 50) {
      keywords.push(value.toLowerCase());
    } else if (key && !keywords.includes(key)) {
      keywords.push(key);
    }
  }

  return { title, description, keywords: keywords.slice(0, 10) };
}

/**
 * Suggest tags for a piece of text.
 * Stub: extracts capitalized words (likely proper nouns / key terms).
 */
export async function suggestTags(text: string): Promise<string[]> {
  if (!text) return [];

  const words = text.split(/\s+/);
  const tags = new Set<string>();

  for (const word of words) {
    // Match words that start with a capital letter and are at least 3 chars
    const cleaned = word.replace(/[^a-zA-Z]/g, '');
    if (cleaned.length >= 3 && /^[A-Z]/.test(cleaned)) {
      tags.add(cleaned);
    }
  }

  return Array.from(tags).slice(0, 15);
}
