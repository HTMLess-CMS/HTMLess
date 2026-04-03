// ─── Dynamic Page Component ─────────────────────────────────────────
// Fetches an entry by slug from the HTMLess CDA and renders it using
// a simple block renderer. Supports draft mode for preview.

import { notFound } from 'next/navigation';
import { draftMode } from 'next/headers';
import { getEntry, getEntries, getPreview } from '../../lib/htmless';
import type { HtmlessEntry } from '../../lib/htmless';

// ─── Types ──────────────────────────────────────────────────────────

interface Block {
  type: string;
  data: Record<string, unknown>;
}

interface PageData {
  title: string;
  description?: string;
  blocks?: Block[];
  featuredImage?: { url: string; alt: string };
  author?: string;
  publishDate?: string;
}

// ─── Block Renderer ─────────────────────────────────────────────────

function renderBlock(block: Block, index: number) {
  switch (block.type) {
    case 'rich-text':
      return (
        <div
          key={index}
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: block.data.html as string }}
        />
      );

    case 'heading':
      const Tag = `h${block.data.level ?? 2}` as keyof JSX.IntrinsicElements;
      return <Tag key={index}>{block.data.text as string}</Tag>;

    case 'image':
      return (
        <figure key={index} className="my-8">
          <img
            src={block.data.url as string}
            alt={block.data.alt as string ?? ''}
            className="rounded-lg w-full"
          />
          {block.data.caption && (
            <figcaption className="text-sm text-gray-500 mt-2">
              {block.data.caption as string}
            </figcaption>
          )}
        </figure>
      );

    case 'code':
      return (
        <pre key={index} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <code>{block.data.code as string}</code>
        </pre>
      );

    case 'quote':
      return (
        <blockquote key={index} className="border-l-4 border-gray-300 pl-4 italic my-6">
          <p>{block.data.text as string}</p>
          {block.data.attribution && (
            <footer className="text-sm text-gray-500 mt-1">
              -- {block.data.attribution as string}
            </footer>
          )}
        </blockquote>
      );

    default:
      return (
        <div key={index} className="p-4 border border-dashed border-gray-300 rounded">
          <p className="text-sm text-gray-400">Unknown block type: {block.type}</p>
        </div>
      );
  }
}

// ─── Metadata ───────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const entry: HtmlessEntry<PageData> = await getEntry<PageData>('page', slug);
    return {
      title: entry.data.title,
      description: entry.data.description ?? '',
      openGraph: {
        title: entry.data.title,
        description: entry.data.description ?? '',
        ...(entry.data.featuredImage && {
          images: [{ url: entry.data.featuredImage.url }],
        }),
      },
    };
  } catch {
    return { title: 'Page Not Found' };
  }
}

// ─── Static Params (for SSG/ISR) ───────────────────────────────────

export async function generateStaticParams() {
  try {
    const { items } = await getEntries<PageData>('page', { limit: 100 });
    return items.map((item) => ({ slug: item.slug }));
  } catch {
    return [];
  }
}

// ─── Page Component ─────────────────────────────────────────────────

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { isEnabled: isDraft } = await draftMode();

  let entry: HtmlessEntry<PageData>;

  try {
    entry = isDraft
      ? await getPreview<PageData>('page', slug)
      : await getEntry<PageData>('page', slug);
  } catch {
    notFound();
  }

  const { data } = entry;
  const blocks = data.blocks ?? [];

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      {/* Draft mode banner */}
      {isDraft && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded mb-8 text-sm">
          Preview Mode -- You are viewing draft content.
        </div>
      )}

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-4xl font-bold mb-4">{data.title}</h1>

        {(data.author || data.publishDate || entry.publishedAt) && (
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {data.author && <span>By {data.author}</span>}
            {(data.publishDate || entry.publishedAt) && (
              <time dateTime={data.publishDate ?? entry.publishedAt}>
                {new Date(data.publishDate ?? entry.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
          </div>
        )}

        {data.description && (
          <p className="text-lg text-gray-600 mt-4">{data.description}</p>
        )}
      </header>

      {/* Featured Image */}
      {data.featuredImage && (
        <img
          src={data.featuredImage.url}
          alt={data.featuredImage.alt ?? data.title}
          className="w-full rounded-lg mb-10"
        />
      )}

      {/* Blocks */}
      <div className="space-y-6">
        {blocks.map((block, index) => renderBlock(block, index))}
      </div>
    </article>
  );
}
