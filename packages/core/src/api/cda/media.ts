import { Router } from 'express';
import type { Router as IRouter, Request, Response } from 'express';
import { existsSync, readFileSync } from 'fs';
import { LocalStorageProvider, getStorageProvider } from '../../media/storage.js';
import {
  transformImage,
  parseTransformParams,
  buildTransformHeaders,
} from '../../media/transforms-engine.js';
import { getPreset } from '../../media/presets.js';

const router: IRouter = Router();

// ─── MIME to extension fallback map ─────────────────────────────────

const EXTENSION_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

function guessMime(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return 'application/octet-stream';
  const ext = filename.slice(dot).toLowerCase();
  return EXTENSION_TO_MIME[ext] ?? 'application/octet-stream';
}

// ─── GET /media/* ───────────────────────────────────────────────────
// Serves a stored file by its storage key.
// Supports optional transform query params (w, h, fm) that are
// currently no-ops but reserved for future server-side transforms.

router.get('/*', async (req: Request, res: Response): Promise<void> => {
  // Express 5 puts the wildcard portion in req.params[0]
  const storageKey = (req.params as Record<string, string>)[0];

  if (!storageKey) {
    res.status(400).json({ error: 'validation_error', message: 'Storage key is required' });
    return;
  }

  const provider = getStorageProvider();

  // For LocalStorageProvider we can resolve the path directly
  let filePath: string;
  if (provider instanceof LocalStorageProvider) {
    filePath = provider.resolve(storageKey);
  } else {
    // Future: stream from S3 / GCS etc.
    res.status(501).json({ error: 'not_implemented', message: 'Remote storage delivery not yet implemented' });
    return;
  }

  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'not_found', message: 'File not found' });
    return;
  }

  const contentType = guessMime(storageKey);
  const fileBuffer = readFileSync(filePath);

  // Parse transform query params (w, h, fit, fm, q, fp_x, fp_y, preset)
  const query = req.query as Record<string, string | undefined>;

  // If a preset is specified, merge its params (explicit params override preset)
  let transformParams = parseTransformParams(query);
  if (query.preset) {
    const preset = getPreset(query.preset);
    if (preset) {
      transformParams = {
        w: preset.w,
        h: preset.h,
        fit: preset.fit,
        fm: preset.fm,
        q: preset.q,
        ...Object.fromEntries(
          Object.entries(transformParams).filter(([, v]) => v !== undefined),
        ),
      };
    }
  }

  const hasTransforms =
    transformParams.w !== undefined ||
    transformParams.h !== undefined ||
    transformParams.fit !== undefined ||
    transformParams.fm !== undefined ||
    transformParams.q !== undefined;

  let outputBuffer: Buffer = fileBuffer;

  if (hasTransforms) {
    try {
      outputBuffer = await transformImage(Buffer.from(fileBuffer), transformParams);
    } catch (err) {
      res.status(400).json({
        error: 'transform_error',
        message: err instanceof Error ? err.message : 'Invalid transform parameters',
      });
      return;
    }
  }

  // Build transform headers (describes requested/applied transforms)
  const transformHeaders = hasTransforms ? buildTransformHeaders(transformParams) : {};

  res
    .set('Content-Type', contentType)
    .set('Content-Length', String(outputBuffer.length))
    .set('Cache-Control', 'public, max-age=31536000, immutable')
    .set(transformHeaders)
    .end(outputBuffer);
});

export default router;
