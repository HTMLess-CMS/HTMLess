# HTMLess + Nuxt Starter

Build a Nuxt 3 site powered by HTMLess as a headless CMS.

## Quick Start

```bash
npx nuxi@latest init my-site
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
composables/
  useHtmless.ts       # HTMLess composable with typed helpers
pages/
  [...slug].vue       # Dynamic catch-all page
server/
  api/revalidate.post.ts  # Webhook revalidation endpoint
```

## Usage

### Fetching entries in a page

```vue
<script setup lang="ts">
const { getEntries } = useHtmless();
const { data: posts } = await useAsyncData('posts', () =>
  getEntries('blog-post', { limit: 20 })
);
</script>

<template>
  <ul>
    <li v-for="post in posts?.items" :key="post.id">
      {{ post.data.title }}
    </li>
  </ul>
</template>
```

### Fetching a single entry by slug

```vue
<script setup lang="ts">
const route = useRoute();
const { getEntry } = useHtmless();

const { data: entry } = await useAsyncData(
  `page-${route.params.slug}`,
  () => getEntry('page', route.params.slug as string)
);
</script>

<template>
  <article v-if="entry">
    <h1>{{ entry.data.title }}</h1>
  </article>
</template>
```

## Preview Mode

### 1. Enable preview via API route

Create `server/api/preview.get.ts`:

```ts
export default defineEventHandler((event) => {
  const query = getQuery(event);

  if (query.secret !== useRuntimeConfig().htmlessPreviewSecret) {
    throw createError({ statusCode: 401, message: 'Invalid secret' });
  }

  setCookie(event, 'htmless-preview', 'true', { path: '/' });
  return sendRedirect(event, (query.slug as string) ?? '/');
});
```

### 2. Use preview mode in composable

The `useHtmless` composable automatically detects the preview cookie and
fetches draft content when preview mode is active.

## ISR / Hybrid Rendering

### Configure route rules in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  routeRules: {
    '/blog/**': { isr: 60 },  // Revalidate every 60 seconds
    '/': { isr: 300 },
  },
  runtimeConfig: {
    htmlessPreviewSecret: process.env.HTMLESS_PREVIEW_TOKEN,
    public: {
      htmlessApiUrl: process.env.HTMLESS_API_URL,
      htmlessSpaceId: process.env.HTMLESS_SPACE_ID,
    },
  },
});
```

### Webhook-triggered purge

Create `server/api/revalidate.post.ts`:

```ts
export default defineEventHandler(async (event) => {
  const secret = getHeader(event, 'x-revalidate-secret');
  if (secret !== useRuntimeConfig().htmlessPreviewSecret) {
    throw createError({ statusCode: 401, message: 'Invalid secret' });
  }

  // In Nuxt 3 with Nitro, you can purge cached routes
  // via the /__nuxt_cache/ storage or a deployment-specific API.
  return { revalidated: true };
});
```

## TypeScript

See `composables/useHtmless.ts` for fully typed helper functions that wrap the HTMLess SDK.
