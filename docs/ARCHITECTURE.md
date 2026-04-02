# HTMLess — Architecture

_Last updated: 2026-04-02_

## Overview

| Key         | Value                                      |
|-------------|--------------------------------------------|
| Directory   | `/home/pbieda/sites/htmless`               |
| Type        | Headless CMS (Open Source + SaaS)          |
| License     | Open Core (MIT core + proprietary modules) |
| Backend     | Node.js                                    |
| Database    | PostgreSQL                                 |
| ORM         | Prisma                                     |
| Frontend    | Next.js (Admin UI)                         |
| Cache/Queue | Redis                                      |
| Deployment  | Docker-first                               |
| Tenancy     | Multi-space (shared DB, isolated by scope) |

## Philosophy

HTMLess is a headless CMS inspired by WordPress's content-authoring ergonomics, stripped of server-rendered theme assumptions. The core principle: **UX > features**. Every feature ships clean or doesn't ship.

The MVP goal is not to become a full platform on day one. The MVP goal is to deliver the fastest path from:

- schema
- content
- API
- preview
- publish

...with minimal friction for developers, agencies, and SaaS builders.

## Three API Surfaces

HTMLess exposes three externally visible APIs with strict, documented semantics:

```text
                   ┌──────────────┐
                   │   Editor UI  │
                   └──────┬───────┘
                          │ Bearer user token
                          ▼
                   ┌──────────────┐
                   │  CMA /cma/v1 │ ◄── Write/read for editors & automation
                   └──────┬───────┘     Returns drafts, metadata, versions
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
     ┌────────────┐ ┌──────────┐ ┌──────────────┐
     │ Content    │ │ Event    │ │ Preview      │
     │ Store      │ │ Bus      │ │ /preview/v1  │ ◄── Draft-inclusive reads
     └─────┬──────┘ └────┬─────┘ │ Preview token│     for preview
           │              │       └──────────────┘
           ▼              ▼
     ┌──────────┐  ┌───────────────┐
     │ CDA      │  │ Webhook       │
     │ /cda/v1  │  │ Dispatcher    │ ──► signed POST + retries
     │ (public) │  └───────────────┘
     └──────────┘
       Read-only, published-only, cacheable, CDN-friendly

       
┌────────────────────────────────────────────────────┐
│                    HTMLess Stack                    │
├────────────────────────────────────────────────────┤
│ htmless-admin   │ Next.js admin application        │
│ htmless-api     │ CMA + CDA + Preview APIs         │
│ htmless-worker  │ Webhooks, async jobs, retries    │
│ postgres        │ Primary relational datastore     │
│ redis           │ Cache, queue, rate-limit state   │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                        PostgreSQL                          │
├────────────────────────────────────────────────────────────┤
│  spaces             │ Tenant / project boundary           │
│  users              │ Auth + profiles                     │
│  roles              │ Role definitions                    │
│  role_bindings      │ User-to-role per space             │
│  api_tokens         │ Scoped machine tokens               │
│  preview_tokens     │ Short-lived preview access          │
│                                                            │
│  content_types      │ Schema registry per space           │
│  fields             │ Per-type field definitions          │
│                                                            │
│  entries            │ Stable content object identity      │
│  entry_versions     │ Immutable snapshots (JSONB body)    │
│  entry_state        │ Current draft/published pointers    │
│                                                            │
│  assets             │ Media library metadata              │
│  asset_usages       │ Content-to-asset references         │
│                                                            │
│  webhooks           │ Outbound webhook config             │
│  webhook_deliveries │ Delivery attempts + status          │
│                                                            │
│  audit_logs         │ Security/content activity trail     │
└────────────────────────────────────────────────────────────┘

Internet
  │
  ▼
Traefik (SSL termination + routing)
  │
  ├──► htmless-admin   (Next.js)  :3001
  ├──► htmless-api     (Node.js)  :3000  ──► PostgreSQL
  │                                      └──► Redis
  └──► htmless-worker  (internal)         └──► Redis queues

  
htmless/
├── docs/                          # Documentation (you are here)
├── packages/
│   ├── core/                      # API runtime (CMA + CDA + Preview)
│   │   ├── src/
│   │   │   ├── api/               # Route handlers (cma/, cda/, preview/)
│   │   │   ├── auth/              # Login, tokens, middleware
│   │   │   ├── spaces/            # Tenant scoping, membership
│   │   │   ├── schema/            # Content type registry, validation
│   │   │   ├── content/           # Entry CRUD, versioning, publish flow
│   │   │   ├── media/             # Asset upload + metadata
│   │   │   ├── events/            # Internal event emitters
│   │   │   ├── webhooks/          # Signing, enqueue, dispatch policy
│   │   │   ├── cache/             # Cache keys + invalidation
│   │   │   └── utils/             # Shared helpers
│   │   ├── prisma/                # Schema + migrations
│   │   └── package.json
│   │
│   ├── worker/                    # Async jobs + webhook delivery
│   │   ├── src/
│   │   │   ├── jobs/
│   │   │   ├── queues/
│   │   │   └── runners/
│   │   └── package.json
│   │
│   └── admin/                     # Admin UI (Next.js)
│       ├── src/
│       │   ├── app/               # Next.js app router
│       │   ├── components/        # Schema builder, tables, forms
│       │   ├── features/          # Content, media, settings
│       │   └── lib/               # API client, auth helpers
│       └── package.json
│
├── docker-compose.yml             # Dev environment
├── Dockerfile.api                 # API production image
├── Dockerfile.admin               # Admin production image
├── Dockerfile.worker              # Worker production image
├── package.json                   # Monorepo root (workspaces)
└── pnpm-workspace.yaml            # Workspace definition