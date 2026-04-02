# HTMLess — Modules

_Last updated: 2026-04-02_

## Core API Modules (`packages/core/src/`)

### api/ — Route Handlers
Organized by API surface. Each surface has its own router with middleware.

- **api/cma/** — Content Management API routes
  - `schemas.ts` — CRUD for content types, fields, taxonomies
  - `entries.ts` — Entry CRUD, draft save, publish, unpublish, schedule, revert
  - `versions.ts` — Version history, autosave retrieval
  - `assets.ts` — Media upload, metadata update
  - `tokens.ts` — API token and preview token management
  - `webhooks.ts` — Webhook registration, delivery logs
  - `blocks.ts` — Block definition and pattern management
  - `extensions.ts` — Extension listing, namespaced route proxy

- **api/cda/** — Content Delivery API routes
  - `content.ts` — Published entries by type, slug, ID
  - `schemas.ts` — Published content type schemas (read-only)
  - `assets.ts` — Asset metadata and delivery URLs
  - `blocks.ts` — Block definitions (for renderer SDKs)
  - `patterns.ts` — Published patterns/templates

- **api/preview/** — Preview API routes
  - `content.ts` — Draft-inclusive entry reads
  - `assets.ts` — Draft/private asset access
  - `schemas.ts` — Schema reads (same as CDA)

### auth/ — Authentication & Authorization
- `middleware.ts` — Token extraction, session validation
- `rbac.ts` — Role-based access control engine
- `object-auth.ts` — Object-level authorization (OWASP API1)
- `property-auth.ts` — Property-level field filtering
- `tokens.ts` — JWT issuance, API token validation, preview token validation
- `password.ts` — Hashing, verification

### schema/ — Content Type Registry
- `registry.ts` — In-memory schema cache, reload from DB
- `validator.ts` — JSON Schema validation for entries
- `migration.ts` — Schema versioning, field additions/removals
- `codegen.ts` — TypeScript type generation from schemas

### content/ — Entry Lifecycle
- `crud.ts` — Create, read, update, delete entries
- `versioning.ts` — Version snapshot creation, history queries
- `workflow.ts` — State machine (draft → published → archived)
- `scheduling.ts` — Scheduled publish/unpublish background jobs
- `concurrency.ts` — ETag generation, If-Match validation

### media/ — Asset Pipeline
- `upload.ts` — Multipart upload handler, presigned URL generation
- `metadata.ts` — EXIF extraction, dimension detection
- `transforms.ts` — URL-based image transforms (w, h, fit, fm, q)
- `providers/` — Storage abstraction
  - `local.ts` — Local filesystem provider
  - `s3.ts` — S3-compatible provider
- `delivery.ts` — CDN-friendly URL generation

### blocks/ — Block System
- `registry.ts` — Block definition storage, version management
- `validator.ts` — Block tree validation against definitions
- `patterns.ts` — Pattern CRUD, constraint enforcement
- `core-blocks.ts` — Built-in blocks (paragraph, heading, image, etc.)

### hooks/ — Internal Event Bus
- `emitter.ts` — Typed event emission
- `handlers.ts` — Built-in event handlers (cache invalidation, etc.)
- `types.ts` — Event type definitions

### webhooks/ — Outbound Dispatch
- `dispatcher.ts` — HTTP POST with signing + timestamp
- `signing.ts` — HMAC-SHA256 signature generation/verification
- `retry.ts` — Exponential backoff retry policy
- `logs.ts` — Delivery attempt logging

### extensions/ — Plugin System
- `loader.ts` — Extension manifest parsing, validation
- `router.ts` — Namespaced route mounting (`/cma/v1/ext/{key}/...`)
- `sandbox.ts` — Permission boundary enforcement

---

## Admin UI Modules (`packages/admin/src/`)

### app/ — Next.js App Router
- `(auth)/login/` — Login page
- `(dashboard)/` — Main dashboard layout
- `(dashboard)/content/` — Content listing and editing
- `(dashboard)/schemas/` — Schema builder (the killer feature)
- `(dashboard)/media/` — Media library
- `(dashboard)/settings/` — Webhooks, tokens, users, roles

### components/ — UI Components
- `schema-builder/` — Drag-and-drop content type designer (Notion + Airtable feel)
- `content-editor/` — Block-based editor with draft/publish controls
- `media-library/` — Upload, browse, search, inline picker
- `version-history/` — Diff viewer, revert controls
- `preview-button/` — Token generation + preview URL launcher

### lib/ — Shared Utilities
- `api-client.ts` — Typed CMA client
- `auth.ts` — Session management, token refresh
- `hooks.ts` — React hooks for data fetching
