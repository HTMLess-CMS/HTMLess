# htmless

TypeScript SDK for [HTMLess](https://htmless.com) headless CMS.

Zero dependencies. Works in Node.js 18+, Deno, Bun, and all modern browsers.

## Install

```bash
npm install htmless
# or
pnpm add htmless
# or
yarn add htmless
```

## Quick Start

```typescript
import { HTMLessClient } from 'htmless';

const client = new HTMLessClient({
  baseUrl: 'https://your-cms.example.com',
  spaceId: 'your-space-id',
  apiToken: 'your-api-token', // optional for public content
});

// Fetch a list of blog posts
const { items, meta } = await client.getEntries('blog-post', {
  limit: 10,
  sort: '-createdAt',
});

console.log(`Found ${meta.total} posts`);
for (const post of items) {
  console.log(post.title, post.slug);
}
```

## API Reference

### `new HTMLessClient(options)`

| Option     | Type     | Required | Description                    |
| ---------- | -------- | -------- | ------------------------------ |
| `baseUrl`  | `string` | Yes      | Base URL of your HTMLess API   |
| `spaceId`  | `string` | Yes      | Space ID for multi-tenant auth |
| `apiToken` | `string` | No       | API token for authenticated access |

### Content Delivery (CDA)

```typescript
// List entries by content type
const result = await client.getEntries('blog-post', {
  slug: 'hello-world',       // filter by slug
  locale: 'en',              // locale
  sort: '-createdAt',        // sort field (prefix - for desc)
  fields: ['title', 'slug'], // sparse fieldsets
  include: ['author'],       // include relations
  page: 1,                   // pagination
  limit: 25,
  filters: { status: 'published' },
});

// Get a single entry by ID
const entry = await client.getEntry('blog-post', 'entry-id', {
  fields: ['title', 'body'],
  include: ['author', 'category'],
  locale: 'en',
});

// Get a single asset
const asset = await client.getAsset('asset-id');
```

### Schema Introspection

```typescript
// List all content types
const types = await client.getTypes();

// Get a specific content type with field definitions
const blogType = await client.getType('blog-post');
console.log(blogType.fields);
```

### Preview

```typescript
// Fetch draft content with a preview token
const draft = await client.getPreview('blog-post', 'my-draft-slug', 'preview-token');
```

### Error Handling

```typescript
import { HTMLessClient, HTMLessError } from 'htmless';

try {
  const entry = await client.getEntry('blog-post', 'missing-id');
} catch (err) {
  if (err instanceof HTMLessError) {
    console.error(`API error ${err.status}: ${err.body}`);
  }
  throw err;
}
```

## TypeScript

The SDK is written in TypeScript and ships with full type declarations. Use generics for typed responses:

```typescript
interface BlogPost {
  title: string;
  slug: string;
  body: string;
  publishedAt: string;
}

const { items } = await client.getEntries<BlogPost>('blog-post');
// items is BlogPost[]
```

## License

MIT
