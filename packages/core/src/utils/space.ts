import type { Request, Response, NextFunction } from 'express';

export function extractSpaceId(req: Request, _res: Response, next: NextFunction): void {
  const spaceId = (req.params.spaceId || req.headers['x-space-id']) as string | undefined;
  if (spaceId) {
    req.params.spaceId = spaceId;
  }
  next();
}

export function requireSpace(req: Request, res: Response, next: NextFunction): void {
  const spaceId = req.params.spaceId || req.headers['x-space-id'];
  if (!spaceId) {
    res.status(400).json({ error: 'space_required', message: 'X-Space-Id header or spaceId param required' });
    return;
  }
  req.params.spaceId = spaceId as string;
  next();
}
