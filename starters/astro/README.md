# HTMLess + Astro Starter

Build a fast, content-driven Astro site powered by HTMLess as a headless CMS.

## Quick Start

```bash
npm create astro@latest my-site
cd my-site
npm install @htmless/sdk
```

## Environment Variables

Create `.env`:

```env
HTMLESS_API_URL=https://your-instance.htmless.io
HTMLESS_API_TOKEN=hle_your_api_token_here
HTMLESS_SPACE_ID=your-space-id
HTMLESS_PREVIEW_TOKEN=hlp_your_preview_token
```

## Project Structure

```
src/
  lib/
    htmless.ts        # HTMLess client + typed helpers
  pages/
    [...slug].astro   # Dynamic page route
    blog/
      [slug].astro    # Blog post pages
    api/
      revalidate.ts   # Webhook endpoint (SSR mode)
```

## Usage

### Fetching entries in an Astro page

```astro
---
// src/pages/blog/index.astro
import { getEntries } from '../../lib/htmless';

const { items: posts } = await getEntries('blog-post', { limit: 20 });
---

<ul>
  {posts.map((post) => (
    <li>
      <a href={`/blog/${post.slug}`}>{post.data.title}</a>
    </li>
  ))}
</ul>
```

### Fetching a single entry

```astro
---
// src/pages/blog/[slug].astro
import { getEntry, getEntries } from '../../lib/htmless';

export async function getStaticPaths() {
  const { items } = await getEntries('blog-post', { limit: 100 });
  return items.map((item) => ({
    params: { slug: item.slug },
  }));
}

const { slug } = Astro.params;
const entry = await getEntry('blog-post', slug!);
---

<article>
  <h1>{entry.data.title}</h1>
  <time>{new Date(entry.publishedAt).toLocaleDateString()}</time>
</article>
```

## Output Modes

### Static (default) -- Pre-rendered at build time

```ts
// astro.config.mjs
export default defineConfig({
  output: 'static',
});
```

All pages are built at `astro build` time. Re-deploy to update content,
or use a webhook to trigger a rebuild on your hosting platform.

### Hybrid -- Static with some server routes

```ts
// astro.config.mjs
export default defineConfig({
  output: 'hybrid',
});
```

Most pages are pre-rendered, but you can mark specific pages as server-rendered:

```astro
---
export const prerender = false;
// This page fetches fresh content on every request
---
```

### Server (SSR) -- Rendered on every request

```ts
// astro.config.mjs
export default defineConfig({
  output: 'server',
});
```

## Preview Mode

For SSR/hybrid mode, you can implement preview by checking a query parameter:

```astro
---
import { getEntry, getPreview } from '../../lib/htmless';

export const prerender = false;

const { slug } = Astro.params;
const isPreview = Astro.url.searchParams.has('preview');

const entry = isPreview
  ? await getPreview('page', slug!)
  : await getEntry('page', slug!);
---
```

## Webhook Revalidation (SSR mode)

Create `src/pages/api/revalidate.ts`:

```ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const secret = request.headers.get('x-revalidate-secret');
  if (secret !== import.meta.env.HTMLESS_PREVIEW_TOKEN) {
    return new Response(JSON.stringify({ error: 'Invalid secret' }), { status: 401 });
  }

  // Astro static sites: trigger a rebuild via your CI/CD.
  // Astro SSR: content is fetched fresh on each request, no purge needed.
  return new Response(JSON.stringify({ ok: true }));
};
```

## TypeScript

See `src/lib/htmless.ts` for fully typed helper functions that wrap the HTMLess SDK.
