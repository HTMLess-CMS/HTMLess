# HTMLess + Next.js Starter

Build a Next.js site powered by HTMLess as a headless CMS.

## Quick Start

```bash
npx create-next-app@latest my-site --typescript
cd my-site
npm install @htmless/sdk
```

## Environment Variables

Create `.env.local`:

```env
HTMLESS_API_URL=https://your-instance.htmless.io
HTMLESS_API_TOKEN=hle_your_api_token_here
HTMLESS_SPACE_ID=your-space-id
HTMLESS_PREVIEW_SECRET=your-preview-secret
```

## Project Structure

```
lib/
  htmless.ts          # HTMLess client + typed helpers
app/
  [slug]/page.tsx     # Dynamic page rendering
  api/revalidate/     # Webhook-triggered ISR revalidation
```

## Usage: App Router (Server Components)

### Fetching entries in a Server Component

```tsx
import { getEntries } from '@/lib/htmless';

export default async function BlogPage() {
  const { items } = await getEntries('blog-post', { limit: 20 });

  return (
    <ul>
      {items.map((post) => (
        <li key={post.id}>{post.data.title as string}</li>
      ))}
    </ul>
  );
}
```

### Fetching a single entry by slug

```tsx
import { getEntry } from '@/lib/htmless';

export default async function PostPage({ params }: { params: { slug: string } }) {
  const entry = await getEntry('blog-post', params.slug);
  return <article>{entry.data.title as string}</article>;
}
```

## Usage: Pages Router (getStaticProps)

```tsx
import { getEntries, getEntry } from '../lib/htmless';

export async function getStaticProps({ params }) {
  const entry = await getEntry('blog-post', params.slug);
  return { props: { entry }, revalidate: 60 };
}

export async function getStaticPaths() {
  const { items } = await getEntries('blog-post', { limit: 100 });
  return {
    paths: items.map((item) => ({ params: { slug: item.slug } })),
    fallback: 'blocking',
  };
}
```

## Preview Mode (Draft Content)

HTMLess preview tokens let you see unpublished content in your frontend.

### Enable Draft Mode (App Router)

Create `app/api/draft/route.ts`:

```ts
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const slug = searchParams.get('slug');

  if (secret !== process.env.HTMLESS_PREVIEW_SECRET) {
    return new Response('Invalid secret', { status: 401 });
  }

  (await draftMode()).enable();
  redirect(slug ?? '/');
}
```

Then in your page component:

```tsx
import { draftMode } from 'next/headers';
import { getEntry, getPreview } from '@/lib/htmless';

export default async function Page({ params }: { params: { slug: string } }) {
  const { isEnabled } = await draftMode();

  const entry = isEnabled
    ? await getPreview('page', params.slug)
    : await getEntry('page', params.slug);

  return <article>{entry.data.title as string}</article>;
}
```

## ISR with Webhook Revalidation

### 1. Set revalidation time in fetch

The `htmless.ts` helper sets `next: { revalidate: 60 }` and cache tags automatically.

### 2. Create a revalidation API route

Create `app/api/revalidate/route.ts`:

```ts
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const secret = request.headers.get('x-revalidate-secret');

  if (secret !== process.env.HTMLESS_PREVIEW_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const contentType = body.data?.contentTypeKey;
  if (contentType) {
    revalidateTag(`htmless:${contentType}`);
  }

  revalidateTag('htmless');

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
```

### 3. Configure a webhook in HTMLess

In the HTMLess admin panel, create a webhook:

- **URL**: `https://your-site.com/api/revalidate`
- **Events**: `entry.published`, `entry.unpublished`
- **Headers**: `x-revalidate-secret: your-preview-secret`

Now publishing content in HTMLess automatically triggers ISR revalidation.

## TypeScript

See `lib/htmless.ts` for fully typed helper functions that wrap the HTMLess SDK.
