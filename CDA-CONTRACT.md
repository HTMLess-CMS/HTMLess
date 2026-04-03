# HTMLess CDA Response Contract

_Version: 1.0 — Locked 2026-04-03_

## Overview

The Content Delivery API (CDA) serves **published content only** from the `published_documents` denormalized table. All references are pre-resolved at publish time.

## Response Format

### List: `GET /cda/v1/content/:typeKey`

```json
{
  "items": [
    {
      "id": "ent_...",
      "type": "article",
      "slug": "hello-world",
      "data": {
        "title": "Hello World",
        "body": [/* blocks */],
        "author": { "id": "ent_...", "name": "Jane" },
        "heroImage": { "id": "ast_...", "url": "/media/...", "alt": "..." }
      },
      "publishedAt": "2026-04-03T12:00:00.000Z",
      "createdAt": "2026-04-03T10:00:00.000Z",
      "updatedAt": "2026-04-03T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 42,
    "totalPages": 2
  }
}
```

### Single: `GET /cda/v1/content/:typeKey/:id`

Same shape as a single item from the list, without the `items` wrapper or pagination.

## Query Parameters

| Param | Example | Description |
|-------|---------|-------------|
| `slug` | `?slug=hello` | Filter by slug |
| `fields` | `?fields=title,slug` | Project specific fields (max 50) |
| `include` | `?include=author,hero` | Embed references (max 10, depth 3) |
| `page` | `?page=2` | Pagination page |
| `limit` | `?limit=10` | Items per page (max 100) |
| `sort` | `?sort=-publishedAt` | Sort field, prefix `-` for descending |
| `filter[field]` | `?filter[status][$eq]=active` | Filter by field value |
| `locale` | `?locale=en` | Resolve localized fields |

## Filter Operators

`$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$contains`, `$startsWith`, `$in`

## Headers

### Response Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Cache-Control` | `public, max-age=60, stale-while-revalidate=300` | CDN + browser cache |
| `ETag` | `W/"md5hash"` | Conditional request support |
| `Surrogate-Key` | `space:{id} type:{key} entry:{id}` | CDN purge targeting |
| `Content-Type` | `application/json` | Always JSON |

### Conditional Requests

Send `If-None-Match: <etag>` to get `304 Not Modified` when content hasn't changed.

## Publish / Invalidation Events

When content is published or unpublished, the following happens:

1. **Materialize** — Entry data with resolved references written to `published_documents`
2. **Cache invalidate** — Redis keys matching `cda:{spaceId}:{typeKey}:*` are deleted
3. **Webhook dispatch** — `entry.published` or `entry.unpublished` event sent to subscribed webhooks
4. **SSE broadcast** — Connected SSE clients on `/cma/v1/live` receive the event

### Event Payload (Webhook + SSE)

```json
{
  "eventId": "evt_...",
  "eventType": "entry.published",
  "occurredAt": "2026-04-03T12:00:00.000Z",
  "data": {
    "entryId": "ent_...",
    "contentTypeKey": "article",
    "slug": "hello-world",
    "spaceId": "sp_..."
  }
}
```

## Stability Promise

This contract is locked for v1. Breaking changes require a new API version (`/cda/v2`).
