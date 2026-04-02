# HTMLess — Architecture Decisions

_Last updated: 2026-04-02_

---

### D1 — Three separate API surfaces (CMA / CDA / Preview)
**Decision:** Expose content management, delivery, and preview as distinct API paths with different auth requirements and response shapes.
**Why:** Mixing management and delivery in one API leaks draft data, bloats responses, and makes caching impossible. Contentful proved this separation works at scale. CDA can sit behind a CDN; CMA never should.
**Trade-off:** More API surface to maintain. Worth it for security and cache correctness.

### D2 — PostgreSQL + Prisma over document stores
**Decision:** Use PostgreSQL as the primary store with Prisma ORM.
**Why:** Schema-driven CMS needs strong typing, migrations, and relational queries (content references, taxonomies, version history). Document stores add flexibility but remove safety. Prisma gives type-safe queries with zero boilerplate.
**Trade-off:** Less flexible than MongoDB for ad-hoc schemas, but we validate schemas at the application layer anyway.

### D3 — Open Core licensing model
**Decision:** MIT license for core CMS. Proprietary license for enterprise features (SSO, advanced RBAC, audit export, multi-region).
**Why:** MIT drives adoption and contributions. Enterprise features have clear value boundaries that justify a paywall. This is the proven model (GitLab, Supabase, Cal.com).
**Trade-off:** Must maintain clear boundary between open and closed features. Community may fork if boundary feels exploitative.

### D4 — Block-based content over raw HTML/Markdown
**Decision:** Store rich content as validated JSON block trees, not HTML or Markdown.
**Why:** Headless means content renders across web, mobile, email, etc. HTML is not portable. Structured blocks enable deterministic rendering per platform. Sanity's Portable Text proved this approach. WordPress blocks showed the editor UX can be great.
**Trade-off:** Higher complexity for simple content (a paragraph is now a JSON object). Worth it for multi-channel delivery.

### D5 — Schema-first with JSON Schema validation
**Decision:** Every content type publishes a JSON Schema. Entries are validated on write.
**Why:** Frontends need predictable shapes for type-safe rendering. Schema-first enables codegen (TypeScript types from schemas), documentation, and API contract stability. WordPress REST API's schema approach is a direct precedent.
**Trade-off:** Schema evolution requires migrations. We mitigate with versioned schemas and backwards-compatible field additions.

### D6 — ETag/If-Match for optimistic concurrency
**Decision:** All mutable CMA resources return ETags. Write operations require If-Match headers.
**Why:** Multiple editors and automations will update content concurrently. Without optimistic locking, last-write-wins causes silent data loss. ETags are HTTP-native (RFC 7232), well-supported by clients, and require zero custom protocol.
**Trade-off:** Clients must handle 412 Precondition Failed. Small UX cost for editors, negligible for automation.

### D7 — Webhook signing with HMAC + timestamp
**Decision:** Sign webhook payloads with HMAC-SHA256 using per-webhook secrets. Include timestamp header for replay prevention.
**Why:** Webhooks hit external endpoints over the internet. Without signing, receivers can't verify the payload came from HTMLess. Without timestamps, old payloads can be replayed. Contentful and Stripe both use this pattern.
**Trade-off:** Receivers must implement verification. We provide SDK helpers to make this trivial.

### D8 — Monorepo with workspaces (packages/core + packages/admin)
**Decision:** Single repository with Node.js workspaces for the API core and Next.js admin UI.
**Why:** Tight coupling between admin UI and API during rapid development. Shared TypeScript types. Single CI pipeline. Easy to split later if needed.
**Trade-off:** Repo size grows. Acceptable for early-stage.

### D9 — Docker-first deployment
**Decision:** The canonical deployment method is `docker compose up`. No bare-metal setup docs.
**Why:** Eliminates "works on my machine." Consistent dev/staging/prod environments. Our entire server infrastructure already runs on Docker + Traefik. One-command deployment is a competitive advantage over Strapi's setup ceremony.
**Trade-off:** Adds Docker as a hard dependency. Acceptable — it's 2026.

### D10 — Multi-site from day one (spaces)
**Decision:** Architecture supports multiple isolated "spaces" (websites/projects) from a single HTMLess instance.
**Why:** This is the key differentiator. Agencies and teams manage multiple sites. One install, multiple content stores. Reduces infra overhead. Mirrors how we already run multiple sites on this server.
**Trade-off:** Adds tenant isolation complexity early. But retrofitting multi-tenancy is 10x harder than building it in.

### D11 — UX over feature count
**Decision:** Ship fewer features, but make each one feel instant and intuitive. Admin UI must be cleaner than Strapi.
**Why:** Strapi's admin is functional but clunky. The CMS market is won on daily-use ergonomics, not feature checklists. Content editors (non-developers) are the real users. If the schema builder feels like Notion + Airtable, we win.
**Trade-off:** Slower feature velocity. Acceptable — quality compounds.

### D12 — Node.js over Go for v1
**Decision:** Backend in Node.js (not Go) for initial release.
**Why:** Faster iteration. Prisma is Node-native. Same language as admin frontend (TypeScript everywhere). Can rewrite hot paths in Go later if profiling shows bottlenecks. Most CMS workloads are I/O bound, not CPU bound.
**Trade-off:** Lower raw throughput than Go. Acceptable for v1 — optimize when it matters.
