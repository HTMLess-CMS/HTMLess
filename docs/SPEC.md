# HTMLess — Full Technical Specification

_Last updated: 2026-04-02_

## Executive Summary

HTMLess is a headless CMS inspired by WordPress, designed to retain WordPress's strongest content-authoring ergonomics and developer extension patterns, while removing assumptions about server-rendered themes. The core architectural move is to cleanly separate:

- **Content Management API (CMA)** — write-heavy, role-gated
- **Content Delivery API (CDA)** — read-only, cacheable, front-end friendly
- **Preview API** — draft-inclusive, secure

---

## The 5 Killer Features

### 1. Schema Builder (SUPER EASY)
Like Notion + Airtable combined. No dev friction. Drag-and-drop content type creation with instant validation and live preview.

### 2. Instant API (No Config)
REST + GraphQL auto-generated from your schema. Authentication built-in. The moment you create a content type, the API exists. Zero configuration.

### 3. Webhooks + Automations
Zapier-style triggers built into the core. Signed, retried, observable. The biggest pain point in headless CMS, solved properly.

### 4. Blazing Fast Admin UI
Cleaner than Strapi. Dark mode native. Keyboard-first. Every interaction responds in <100ms. Built with Next.js + Radix UI + Tailwind.

### 5. Multi-Site from Day One
Connect multiple websites from a single HTMLess instance. Shared infrastructure, isolated content. The agency play that Strapi doesn't have.

---

## Six WordPress Features Ported to Headless

### Feature 1: Schema-Driven Content Modeling

**WordPress anchor:** Post types (`register_post_type`), taxonomies, REST schema discovery.

**HTMLess implementation:**
- ContentType: `{ key, name, description, version, fields[], capabilities, indexes[] }`
- Field: `{ key, type, required, localized?, validations?, referenceTarget?, enumValues? }`
- Taxonomy: `{ key, hierarchical, allowedTypes[], labels }`
- Term: `{ id, taxonomyKey, slug, name, parentId? }`
- Entry: `{ id, typeKey, slug, fields{}, createdAt, updatedAt, state }`

**Endpoints:**
| Surface | Endpoint | Auth |
|---------|----------|------|
| CMA | `GET/POST/PATCH /cma/v1/schemas/types` | Schema admin |
| CMA | `POST /cma/v1/schemas/types/{key}/publish` | Schema admin |
| CDA | `GET /cda/v1/schemas/types` | Public/API token |
| Preview | `GET /preview/v1/schemas/types` | Preview token |

### Feature 2: Roles/Capabilities Authorization + Token Auth

**WordPress anchor:** Roles/capabilities, Application Passwords.

**HTMLess implementation:**
- User access tokens (interactive): OAuth2/JWT
- Scoped API tokens (machine): admin-created, scoped to actions/resources
- Preview tokens: short-lived, audience-limited, optionally single-entry

**OWASP compliance:**
- Object-level auth on every ID-bearing route (API1:2023)
- Property-level auth: editors change fields, not system metadata
- Default-deny policy model

**Endpoints:**
```
POST /cma/v1/auth/login
POST /cma/v1/api-tokens        (admin creates scoped token)
POST /cma/v1/preview-tokens    (create preview token)
```

### Feature 3: Editorial Workflow, Versioning, Scheduling, Preview

**WordPress anchor:** Post statuses, revisions, autosaves.

**HTMLess implementation:**
- Entry = stable object, EntryVersion = immutable snapshot
- EntryState tracks current draft, current published, scheduled time
- Concurrency via ETag/If-Match (RFC 7232)

**State machine:** `draft → published → archived` (with scheduling and revert)

**Endpoints:**
```
POST /cma/v1/entries/{id}:saveDraft
POST /cma/v1/entries/{id}:publish
POST /cma/v1/entries/{id}:unpublish
POST /cma/v1/entries/{id}:schedule    (with publishAt)
POST /cma/v1/entries/{id}:revert      (to prior version)
GET  /cma/v1/entries/{id}/versions
GET  /cda/v1/content/{typeKey}?slug=  (published only)
GET  /preview/v1/content/{typeKey}?slug= (draft-preferred)
```

### Feature 4: Media Library + Asset Delivery Pipeline

**WordPress anchor:** REST media endpoint (`/wp/v2/media`).

**HTMLess implementation:**
- Asset: `{ id, kind, filename, mimeType, bytes, checksum, width?, height?, alt?, caption? }`
- Upload: multipart or resumable/presigned
- Delivery: CDN-friendly URLs with transform parameters

**Transform URL pattern:**
```
https://assets.htmle.ss/{assetId}/{filename}?w=800&h=450&fit=crop&fm=webp&q=75
```

**Endpoints:**
```
POST  /cma/v1/assets              (multipart upload)
POST  /cma/v1/assets/uploads      (create upload session)
PATCH /cma/v1/assets/{id}         (alt/caption metadata)
GET   /cda/v1/assets/{id}         (public metadata)
GET   /preview/v1/assets/{id}     (draft/private access)
```

### Feature 5: Structured Rich Content Blocks + Patterns

**WordPress anchor:** Block Editor, `block.json`, block patterns.

**HTMLess implementation:**
- BlockDefinition: `{ key, version, title, icon?, attributesSchema, allowedChildren? }`
- BlockInstance: `{ typeKey, version, attrs, children[] }`
- Pattern: `{ id, title, blockTree, constraints? }`
- Stored as validated JSON trees, not HTML

**Core blocks:** paragraph, heading, image, callout, embed, list, code

**Endpoints:**
```
POST  /cma/v1/blocks/definitions
PATCH /cma/v1/blocks/definitions/{key}?version=1.0.0
POST  /cma/v1/patterns
GET   /cda/v1/blocks/definitions
GET   /cda/v1/patterns?typeKey=article
```

### Feature 6: Extensibility, Custom APIs, Webhooks

**WordPress anchor:** Hooks (actions/filters), `register_rest_route`.

**HTMLess implementation:**
- Internal events: `entry.published`, `asset.created`, `schema.typePublished`, etc.
- Extension manifests with namespaced endpoints: `/cma/v1/ext/{extensionKey}/...`
- Outbound webhooks with HMAC-SHA256 signing + timestamp + retry policy

**Webhook headers:**
```
X-HTMLess-Event-Id: evt_...
X-HTMLess-Timestamp: 2026-04-02T15:55:00Z
X-HTMLess-Signature: sha256=...
```

**Retry policy:** 3 attempts, 30s backoff, log every delivery attempt.

---

## Cross-Cutting Requirements

| Requirement | Implementation |
|-------------|---------------|
| Object auth | Every ID-bearing route checks access at data layer |
| Property auth | Response filtering based on token scope/role |
| Concurrency | ETag/If-Match on all mutable CMA resources |
| Response shaping | `fields=` (projection) + `include=` (bounded expansion) |
| Webhook signing | HMAC-SHA256 + timestamp TTL (5min replay window) |
| Caching | CDA responses include Cache-Control + ETag |

---

## Implementation Phases

| Phase | Scope | Complexity |
|-------|-------|-----------|
| 1. Foundation | API skeleton, schema registry, entry CRUD, RBAC, API tokens | High |
| 2. Editorial Core | Draft/publish, versions, preview tokens, scheduling, ETags | High |
| 3. Media | Upload, metadata, transforms, provider abstraction, delivery URLs | Medium-High |
| 4. Structured Content | Block registry, validation, patterns, core blocks, editor | High |
| 5. Integrations | Event bus, extensions, webhooks (signing/retries/logs) | Medium-High |
| 6. Hardening | Audit logs, rate limits, codegen, GraphQL, CLI, docs | Medium |

---

## WordPress vs HTMLess Comparison

| Feature | WordPress | HTMLess |
|---------|-----------|---------|
| Content modeling | `register_post_type` + `show_in_rest` | Versioned schema registry + JSON Schema + GraphQL introspection |
| Auth | Roles/capabilities + Application Passwords | RBAC + object/property auth + scoped API tokens + preview tokens |
| Workflow | Post statuses + revisions REST | Draft/published versions + Preview API + scheduling + ETag concurrency |
| Media | `/wp/v2/media` | Asset service + transform-by-URL + provider abstraction |
| Rich content | Block editor + `block.json` | Validated block trees + versioned definitions + patterns |
| Extensibility | Hooks + `register_rest_route` | Event bus + extension manifests + signed webhooks with retries |
