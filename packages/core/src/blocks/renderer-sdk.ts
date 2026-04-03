/**
 * HTMLess Renderer SDK Contract
 *
 * This module defines the types and interfaces that frontend renderers
 * must implement to render HTMLess block content.
 *
 * Usage in a Next.js/React frontend:
 *
 * ```tsx
 * import type { BlockInstance, BlockRenderer, BlockRendererMap } from '@htmless/core/blocks/renderer-sdk';
 *
 * const renderers: BlockRendererMap = {
 *   paragraph: ({ attrs }) => <p>{attrs.text}</p>,
 *   heading: ({ attrs }) => {
 *     const Tag = `h${attrs.level}` as keyof JSX.IntrinsicElements;
 *     return <Tag>{attrs.text}</Tag>;
 *   },
 *   image: ({ attrs }) => <img src={attrs.url} alt={attrs.alt || ''} />,
 *   callout: ({ attrs, children }) => (
 *     <aside className={`callout callout-${attrs.tone}`}>
 *       {attrs.title && <strong>{attrs.title}</strong>}
 *       <p>{attrs.body}</p>
 *       {children}
 *     </aside>
 *   ),
 *   // ... etc
 * };
 *
 * function RenderBlocks({ blocks }: { blocks: BlockInstance[] }) {
 *   return <>{blocks.map((block, i) => renderBlock(block, renderers, i))}</>;
 * }
 * ```
 */

// ─── Core Types ───

export interface BlockInstance {
  /** Block definition key (e.g. "paragraph", "heading", "image") */
  typeKey: string;
  /** Block definition version this instance was created with */
  version?: string;
  /** Block attributes — shape depends on the block definition's attributesSchema */
  attrs: Record<string, unknown>;
  /** Nested child blocks (for container blocks like callout, columns, etc.) */
  children?: BlockInstance[];
}

export interface BlockRendererProps {
  /** The block instance being rendered */
  block: BlockInstance;
  /** Block attributes (shortcut for block.attrs) */
  attrs: Record<string, unknown>;
  /** Rendered children (if the block has nested blocks) */
  children?: unknown;
  /** Block index in the parent array */
  index: number;
}

/** A function that renders a single block type */
export type BlockRenderer = (props: BlockRendererProps) => unknown;

/** Map of block type keys to their renderer functions */
export type BlockRendererMap = Record<string, BlockRenderer>;

// ─── Render Function ───

/**
 * Renders a single block using the provided renderer map.
 * Falls back to a default renderer if no matching renderer is found.
 */
export function renderBlock(
  block: BlockInstance,
  renderers: BlockRendererMap,
  index: number = 0,
): unknown {
  const renderer = renderers[block.typeKey];

  // Recursively render children first
  let children: unknown = undefined;
  if (block.children && block.children.length > 0) {
    children = block.children.map((child, i) => renderBlock(child, renderers, i));
  }

  if (!renderer) {
    // Default: return the block data as-is for debugging/fallback
    return {
      _fallback: true,
      typeKey: block.typeKey,
      attrs: block.attrs,
      children,
      index,
    };
  }

  return renderer({
    block,
    attrs: block.attrs,
    children,
    index,
  });
}

/**
 * Renders an array of blocks into an array of rendered outputs.
 */
export function renderBlocks(
  blocks: BlockInstance[],
  renderers: BlockRendererMap,
): unknown[] {
  return blocks.map((block, index) => renderBlock(block, renderers, index));
}

// ─── Helpers ───

/**
 * Extracts plain text from a block tree (useful for search indexing, excerpts).
 */
export function extractText(blocks: BlockInstance[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    const attrs = block.attrs;

    if (typeof attrs.text === 'string') parts.push(attrs.text);
    if (typeof attrs.body === 'string') parts.push(attrs.body);
    if (typeof attrs.title === 'string') parts.push(attrs.title);
    if (typeof attrs.code === 'string') parts.push(attrs.code);
    if (Array.isArray(attrs.items)) {
      for (const item of attrs.items) {
        if (typeof item === 'string') parts.push(item);
      }
    }

    if (block.children) {
      parts.push(extractText(block.children));
    }
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * Collects all asset IDs referenced in a block tree (for preloading, CDN hints).
 */
export function collectAssetIds(blocks: BlockInstance[]): string[] {
  const ids: string[] = [];

  for (const block of blocks) {
    if (typeof block.attrs.assetId === 'string') {
      ids.push(block.attrs.assetId);
    }
    if (block.children) {
      ids.push(...collectAssetIds(block.children));
    }
  }

  return [...new Set(ids)];
}
