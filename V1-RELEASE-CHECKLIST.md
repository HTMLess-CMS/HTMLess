# HTMLess v1.0 Release Checklist

All items must pass before tagging v1.0.0.

## Build & CI

- [x] `@htmless/core` compiles with zero TypeScript errors
- [x] `@htmless/admin` builds successfully
- [x] `@htmless/worker` builds successfully
- [x] GitHub Actions CI runs build + typecheck + tests
- [ ] CI passes on main branch (green badge)

## API

- [x] CMA: auth (login, JWT, API tokens, preview tokens)
- [x] CMA: schema CRUD (content types, fields)
- [x] CMA: entry lifecycle (create, save-draft, publish, unpublish, schedule, revert)
- [x] CMA: asset CRUD + file upload
- [x] CMA: webhook CRUD + delivery logs
- [x] CMA: block definitions + patterns
- [x] CMA: audit log query
- [x] CMA: extension management
- [x] CMA: TypeScript codegen
- [x] CDA: published content delivery from denormalized table
- [x] CDA: Redis caching with invalidation
- [x] CDA: field projection, includes, filtering, sorting
- [x] CDA: schema discovery + JSON Schema
- [x] Preview: draft-inclusive reads with scoped tokens
- [x] SSE: real-time events for CMA + Preview

## Security

- [x] JWT auth with bcrypt password hashing
- [x] RBAC with per-space role bindings
- [x] Preview token scope enforcement
- [x] If-Match required on publish (428/412)
- [x] Entry validation against content type schema
- [x] Rate limiting on login + API routes
- [x] Webhook HMAC-SHA256 signing
- [ ] Automated security tests passing

## Admin UI

- [x] Login with JWT
- [x] Dashboard with live stats
- [x] Content listing + editor (draft/publish/schedule/preview)
- [x] Schema builder (types + fields)
- [x] Block editor with pattern picker
- [x] Media library with upload
- [x] Webhook management with delivery viewer
- [x] API tokens + preview tokens
- [x] Extensions manager
- [x] Settings + codegen

## Documentation

- [x] README with accurate feature list
- [x] CONTRIBUTING.md
- [x] CONTRIBUTING-DEV.md
- [x] CDA-CONTRACT.md
- [x] .env.example
- [ ] API reference docs (auto-generated or manual)

## Deployment

- [x] Production Dockerfiles (api, admin, worker)
- [x] docker-compose.yml for one-command deploy
- [x] Health check endpoint
- [ ] Docker images published to registry

## Blocking for v1.0

- [ ] CI green on main
- [ ] Automated API tests passing in CI
- [ ] Security tests passing
- [ ] At least one real project running on HTMLess
- [ ] No P0 bugs in unit-testing.md
