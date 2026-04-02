# HTMLess — Data Flow

_Last updated: 2026-04-02_

## 1. Content Creation Flow (Editor → CMA → Store)

```
Editor UI
  │
  │ POST /cma/v1/entries
  │ Authorization: Bearer <user_token>
  │ Content-Type: application/json
  │ { typeKey: "article", fields: { title: "Hello", body: [...blocks] } }
  │
  ▼
CMA Router
  │
  ├─ 1. Auth middleware: validate token, extract user
  ├─ 2. RBAC check: user.can("create", "article")
  ├─ 3. Schema validation: validate fields against article schema
  ├─ 4. Block validation: validate body blocks against block definitions
  │
  ▼
Content Service
  │
  ├─ 5. Create entry record (entries table)
  ├─ 6. Create entry_version (kind: "draft", snapshot of fields)
  ├─ 7. Create entry_state (draftVersionId → new version, status: "draft")
  │
  ▼
Event Bus
  │
  ├─ Emit: entry.created { entryId, typeKey, createdBy }
  ├─ Emit: entry.draftSaved { entryId, versionId }
  │
  ▼
Webhook Dispatcher (async)
  │
  └─ For each webhook subscribed to entry.created:
     POST <webhook_url>
     X-HTMLess-Signature: sha256=<hmac>
     X-HTMLess-Timestamp: 2026-04-02T15:10:00Z
     { eventType: "entry.created", data: { entryId, typeKey } }
```

## 2. Publish Flow (Draft → Published)

```
Editor UI
  │
  │ POST /cma/v1/entries/{id}:publish
  │ Authorization: Bearer <user_token>
  │ If-Match: "ent_123:v_5"
  │
  ▼
CMA Router
  │
  ├─ 1. Auth middleware: validate token
  ├─ 2. RBAC: user.can("publish", "article")
  ├─ 3. Concurrency: compare If-Match ETag with current draftVersionId
  │     └─ 412 if mismatch
  │
  ▼
Workflow Service
  │
  ├─ 4. Validate entry is publishable (required fields present)
  ├─ 5. Create entry_version (kind: "published", copy of current draft data)
  ├─ 6. Update entry_state:
  │     publishedVersionId → new published version
  │     status: "published"
  │
  ▼
Event Bus
  │
  ├─ Emit: entry.published { entryId, publishedVersionId, slug }
  │
  ├──► Cache invalidation: purge CDA cache for this entry
  ├──► Webhook dispatch: notify subscribers (build triggers, search indexers)
  └──► CDA now returns this entry for public reads
```

## 3. Preview Flow (Frontend → Preview API)

```
Editor clicks "Preview"
  │
  │ 1. Editor UI requests preview token from CMA
  │    POST /cma/v1/preview-tokens
  │    { entryId: "ent_123", expiresIn: 3600 }
  │
  │ 2. CMA returns: { token: "prev_abc...", expiresAt: "..." }
  │
  │ 3. Editor UI opens preview URL with token
  │    https://preview.mysite.com/articles/hello-world?token=prev_abc...
  │
  ▼
Frontend Preview App
  │
  │ GET /preview/v1/content/article?slug=hello-world
  │ Authorization: Bearer prev_abc...
  │
  ▼
Preview Router
  │
  ├─ 1. Validate preview token (not expired, correct scope)
  ├─ 2. Fetch entry_state for matching entry
  ├─ 3. Return draft version data (not published version)
  ├─ 4. Resolve references using draft versions (not published)
  │
  ▼
Response: full draft entry with draft-resolved references
  │
  └─ Frontend renders using same components as production
     but with draft content visible
```

## 4. CDA Read Flow (Public Frontend → CDN → CDA)

```
Visitor browser / SSG build
  │
  │ GET /cda/v1/content/article?slug=hello-world
  │    &include=author,heroImage
  │    &fields=title,body,slug,author.name,heroImage.url
  │ Authorization: Bearer <api_token>  (or public if configured)
  │
  ▼
CDN / Cache Layer
  │
  ├─ Cache HIT → return cached response
  ├─ Cache MISS ▼
  │
  ▼
CDA Router
  │
  ├─ 1. Token validation (API token with cda:read scope)
  ├─ 2. Query content store: published entries only
  ├─ 3. Apply includes: embed author + heroImage (max depth enforced)
  ├─ 4. Apply field selection: project only requested fields
  ├─ 5. Return with cache headers (ETag, Cache-Control)
  │
  ▼
Response:
{
  "id": "ent_123",
  "type": "article",
  "slug": "hello-world",
  "fields": {
    "title": "Hello World",
    "body": [ ...published blocks... ],
    "author": { "name": "Jane" },
    "heroImage": { "url": "https://assets.htmle.ss/ast_9f3c/photo.jpg?w=1200&fm=webp" }
  }
}
```

## 5. Media Upload Flow

```
Editor UI (drag & drop or file picker)
  │
  │ POST /cma/v1/assets
  │ Authorization: Bearer <user_token>
  │ Content-Type: multipart/form-data
  │ [file data + metadata (alt, caption)]
  │
  ▼
Media Service
  │
  ├─ 1. Auth + RBAC: user.can("upload", "asset")
  ├─ 2. Validate file (type, size limits)
  ├─ 3. Extract metadata (EXIF, dimensions, mime)
  ├─ 4. Store original via provider (local / S3)
  ├─ 5. Create asset record in DB
  │
  ▼
Event Bus → Emit: asset.created
  │
  ▼
Response: asset metadata + delivery URL template
{
  "id": "ast_9f3c",
  "filename": "photo.jpg",
  "mimeType": "image/jpeg",
  "width": 4000,
  "height": 3000,
  "url": "https://assets.htmle.ss/ast_9f3c/photo.jpg",
  "transforms": "?w={w}&h={h}&fit={fit}&fm={fm}&q={q}"
}
```

## 6. Webhook Dispatch Flow

```
Event Bus emits: entry.published
  │
  ▼
Webhook Dispatcher
  │
  ├─ 1. Query webhooks subscribed to "entry.published"
  ├─ 2. For each webhook:
  │     │
  │     ├─ Build payload: { eventId, eventType, occurredAt, data }
  │     ├─ Sign: HMAC-SHA256(secret, timestamp + body)
  │     ├─ POST to webhook URL with headers:
  │     │   X-HTMLess-Event-Id: evt_...
  │     │   X-HTMLess-Timestamp: 2026-04-02T15:55:00Z
  │     │   X-HTMLess-Signature: sha256=...
  │     │
  │     ├─ On 2xx: log success → done
  │     ├─ On 429/5xx: retry with backoff
  │     │   Attempt 1: immediate
  │     │   Attempt 2: +30s
  │     │   Attempt 3: +30s
  │     │   After max retries: log failure, mark delivery as failed
  │     │
  │     └─ Log every attempt to webhook_logs table
  │
  ▼
Admin UI: GET /cma/v1/webhooks/{id}/deliveries
  Shows: timestamp, status code, response time, retry count, payload
```

## 7. Schema Evolution Flow

```
Developer / Admin
  │
  │ PATCH /cma/v1/schemas/types/article
  │ { addFields: [{ key: "subtitle", type: "string" }] }
  │
  ▼
Schema Service
  │
  ├─ 1. Auth: user.can("admin", "schema")
  ├─ 2. Validate: new field doesn't conflict with existing
  ├─ 3. Update content_type version
  ├─ 4. Run Prisma migration (if relational columns needed)
  ├─ 5. Update in-memory schema cache
  │
  ▼
Event Bus → Emit: schema.typePublished
  │
  ├──► CDA schema endpoint now returns updated schema
  ├──► Codegen can regenerate TypeScript types
  └──► Webhook: notify build systems to update
```
