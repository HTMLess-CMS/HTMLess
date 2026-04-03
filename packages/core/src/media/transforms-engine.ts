// ─── Image Transform Engine ──────────────────────────────────────────
//
// Provides a transform pipeline for image buffers. Currently a
// pass-through implementation that records requested transforms in
// response headers. Actual pixel manipulation (resize, format
// conversion) requires sharp/libvips which will be added later.

export interface FocalPoint {
  /** Horizontal focal point, 0-1 range (0 = left, 1 = right) */
  fp_x: number;
  /** Vertical focal point, 0-1 range (0 = top, 1 = bottom) */
  fp_y: number;
}

export interface TransformParams {
  /** Target width in pixels */
  w?: number;
  /** Target height in pixels */
  h?: number;
  /** Resize fit mode: cover, contain, fill, inside, outside */
  fit?: string;
  /** Output format: jpeg, png, webp, avif, gif */
  fm?: string;
  /** Quality (1-100) */
  q?: number;
  /** Focal point X (0-1) */
  fp_x?: number;
  /** Focal point Y (0-1) */
  fp_y?: number;
}

export interface TransformResult {
  buffer: Buffer;
  /** Headers describing which transforms were requested (for pass-through mode) */
  headers: Record<string, string>;
}

const VALID_FITS = ['cover', 'contain', 'fill', 'inside', 'outside'];
const VALID_FORMATS = ['jpeg', 'png', 'webp', 'avif', 'gif'];

/**
 * Transform an image buffer according to the given params.
 *
 * Currently a pass-through: returns the original buffer unchanged and
 * records the requested transforms in `headers`. Once sharp is added as
 * a dependency, this function will perform actual resize/format/quality
 * operations.
 */
export async function transformImage(
  buffer: Buffer,
  params: TransformParams,
): Promise<Buffer> {
  // Validate params
  if (params.w !== undefined && (params.w < 1 || params.w > 8192)) {
    throw new Error('Width must be between 1 and 8192');
  }
  if (params.h !== undefined && (params.h < 1 || params.h > 8192)) {
    throw new Error('Height must be between 1 and 8192');
  }
  if (params.fit !== undefined && !VALID_FITS.includes(params.fit)) {
    throw new Error(`Invalid fit mode: ${params.fit}. Must be one of: ${VALID_FITS.join(', ')}`);
  }
  if (params.fm !== undefined && !VALID_FORMATS.includes(params.fm)) {
    throw new Error(`Invalid format: ${params.fm}. Must be one of: ${VALID_FORMATS.join(', ')}`);
  }
  if (params.q !== undefined && (params.q < 1 || params.q > 100)) {
    throw new Error('Quality must be between 1 and 100');
  }
  if (params.fp_x !== undefined && (params.fp_x < 0 || params.fp_x > 1)) {
    throw new Error('Focal point X must be between 0 and 1');
  }
  if (params.fp_y !== undefined && (params.fp_y < 0 || params.fp_y > 1)) {
    throw new Error('Focal point Y must be between 0 and 1');
  }

  // Pass-through: return original buffer.
  // In the future, sharp-based transforms will go here:
  //   const img = sharp(buffer);
  //   if (params.w || params.h) img.resize(params.w, params.h, { fit, position });
  //   if (params.fm) img.toFormat(params.fm, { quality: params.q });
  //   return img.toBuffer();

  return buffer;
}

/**
 * Build response headers describing the transforms that were applied
 * (or requested in pass-through mode).
 */
export function buildTransformHeaders(params: TransformParams): Record<string, string> {
  const headers: Record<string, string> = {};

  if (params.w !== undefined) headers['X-Transform-Width'] = String(params.w);
  if (params.h !== undefined) headers['X-Transform-Height'] = String(params.h);
  if (params.fit) headers['X-Transform-Fit'] = params.fit;
  if (params.fm) headers['X-Transform-Format'] = params.fm;
  if (params.q !== undefined) headers['X-Transform-Quality'] = String(params.q);
  if (params.fp_x !== undefined) headers['X-Transform-FP-X'] = String(params.fp_x);
  if (params.fp_y !== undefined) headers['X-Transform-FP-Y'] = String(params.fp_y);

  return headers;
}

/**
 * Parse transform query params from a request query object.
 */
export function parseTransformParams(
  query: Record<string, string | undefined>,
): TransformParams {
  const params: TransformParams = {};

  if (query.w) params.w = parseInt(query.w, 10);
  if (query.h) params.h = parseInt(query.h, 10);
  if (query.fit) params.fit = query.fit;
  if (query.fm) params.fm = query.fm;
  if (query.q) params.q = parseInt(query.q, 10);
  if (query.fp_x) params.fp_x = parseFloat(query.fp_x);
  if (query.fp_y) params.fp_y = parseFloat(query.fp_y);

  return params;
}
