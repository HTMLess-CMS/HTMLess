// ─── Editorial Comments CRUD ───

import { Router } from 'express';
import type { Router as IRouter, Request, Response } from 'express';
import { prisma } from '../../db.js';
import { requireScope } from '../../auth/middleware.js';

const router: IRouter = Router();

function getSpaceId(req: Request): string | undefined {
  return (req.params as Record<string, string>).spaceId ?? (req.headers['x-space-id'] as string | undefined);
}

// ── GET /entries/:id/comments — list comments for entry (threaded) ──
router.get(
  '/entries/:id/comments',
  requireScope('cma:read', 'cma:write'),
  async (req: Request, res: Response): Promise<void> => {
    const spaceId = getSpaceId(req);
    if (!spaceId) {
      res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
      return;
    }

    const entryId = req.params.id as string;

    // Fetch all comments for the entry, then build thread tree in memory
    const comments = await prisma.comment.findMany({
      where: { spaceId, entryId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Build threaded structure: top-level comments with nested replies
    const commentMap = new Map<string, Record<string, unknown>>();
    const topLevel: Record<string, unknown>[] = [];

    for (const c of comments) {
      const node: Record<string, unknown> = {
        id: c.id,
        entryId: c.entryId,
        body: c.body,
        resolved: c.resolved,
        parentId: c.parentId,
        user: c.user,
        replies: [],
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
      commentMap.set(c.id, node);
    }

    for (const c of comments) {
      const node = commentMap.get(c.id)!;
      if (c.parentId && commentMap.has(c.parentId)) {
        const parent = commentMap.get(c.parentId)!;
        (parent.replies as Record<string, unknown>[]).push(node);
      } else {
        topLevel.push(node);
      }
    }

    res.json({ items: topLevel, total: comments.length });
  },
);

// ── POST /entries/:id/comments — create comment ──
router.post(
  '/entries/:id/comments',
  requireScope('cma:write'),
  async (req: Request, res: Response): Promise<void> => {
    const spaceId = getSpaceId(req);
    if (!spaceId) {
      res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
      return;
    }

    const entryId = req.params.id as string;
    const { body, parentId } = req.body as { body?: string; parentId?: string };

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      res.status(400).json({ error: 'validation_error', message: 'body is required' });
      return;
    }

    // Validate parent comment exists if provided
    if (parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: parentId, entryId, spaceId },
      });
      if (!parent) {
        res.status(404).json({ error: 'not_found', message: 'Parent comment not found' });
        return;
      }
    }

    const comment = await prisma.comment.create({
      data: {
        spaceId,
        entryId,
        userId: req.auth!.userId,
        body: body.trim(),
        parentId: parentId ?? null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    res.status(201).json({
      id: comment.id,
      entryId: comment.entryId,
      body: comment.body,
      resolved: comment.resolved,
      parentId: comment.parentId,
      user: comment.user,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    });
  },
);

// ── PATCH /comments/:id — edit comment body, resolve/unresolve ──
router.patch(
  '/comments/:id',
  requireScope('cma:write'),
  async (req: Request, res: Response): Promise<void> => {
    const spaceId = getSpaceId(req);
    if (!spaceId) {
      res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
      return;
    }

    const commentId = req.params.id as string;
    const { body, resolved } = req.body as { body?: string; resolved?: boolean };

    const existing = await prisma.comment.findFirst({
      where: { id: commentId, spaceId },
    });
    if (!existing) {
      res.status(404).json({ error: 'not_found', message: 'Comment not found' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (body !== undefined) {
      if (typeof body !== 'string' || body.trim().length === 0) {
        res.status(400).json({ error: 'validation_error', message: 'body must be a non-empty string' });
        return;
      }
      updateData.body = body.trim();
    }
    if (resolved !== undefined) {
      updateData.resolved = Boolean(resolved);
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    res.json({
      id: updated.id,
      entryId: updated.entryId,
      body: updated.body,
      resolved: updated.resolved,
      parentId: updated.parentId,
      user: updated.user,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  },
);

// ── DELETE /comments/:id — delete comment ──
router.delete(
  '/comments/:id',
  requireScope('cma:write'),
  async (req: Request, res: Response): Promise<void> => {
    const spaceId = getSpaceId(req);
    if (!spaceId) {
      res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
      return;
    }

    const commentId = req.params.id as string;

    const existing = await prisma.comment.findFirst({
      where: { id: commentId, spaceId },
    });
    if (!existing) {
      res.status(404).json({ error: 'not_found', message: 'Comment not found' });
      return;
    }

    await prisma.comment.delete({ where: { id: commentId } });

    res.status(204).end();
  },
);

export default router;
