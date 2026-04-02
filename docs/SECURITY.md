# HTMLess — Security Model

_Last updated: 2026-04-02_

## Threat Model

HTMLess is **API-exposed by default** — every operation goes through HTTP endpoints. This makes security the core constraint, not an afterthought. The design systematically addresses OWASP API Security Top 10.

## OWASP API Risk Coverage

### API1:2023 — Broken Object Level Authorization (BOLA)
**Mitigation:** Every route that accepts an ID (path, query, or body) performs object-level authorization at the data layer. No shortcut through routing.
- Entry reads check: user can access this entry's type + this specific entry
- Asset reads check: asset visibility (public vs draft-only)
- Token operations check: token belongs to requesting user/space
- `object-auth.ts` middleware runs on every CMA route

### API2:2023 — Broken Authentication
**Mitigation:** Three explicit, minimal auth flows:
1. **User tokens** — Login → session/JWT → used by editor UI
2. **API tokens** — Admin-created, scoped, expirable → used by builds/automation
3. **Preview tokens** — Short-lived, audience-limited → used by preview

No improvised token schemes. No shared secrets between flows.

### API3:2023 — Broken Object Property Level Authorization
**Mitigation:** Property-level filtering on every response:
- Editors see `fields.*` but not `system.ownerId` or security metadata
- API tokens with `cda:read` scope never see draft data
- Preview tokens only see the entry/route they're scoped to

### API5:2023 — Broken Function Level Authorization
**Mitigation:** RBAC capabilities per operation:
- `schema.admin` — create/mutate content types
- `entry.create`, `entry.publish`, `entry.delete` — per type
- `asset.upload`, `asset.delete`
- `webhook.manage`, `token.manage`
- Default-deny: no capability = no access

## Token Architecture

```
┌─────────────────────────────────────────────┐
│              Token Types                     │
├──────────────┬──────────────────────────────┤
│ User Token   │ Interactive editor sessions  │
│              │ JWT or session-based          │
│              │ Scoped to user's role/caps    │
│              │ Expires: configurable (hours) │
├──────────────┼──────────────────────────────┤
│ API Token    │ Machine-to-machine           │
│              │ Scoped: cda:read, cma:write   │
│              │ Created by admins             │
│              │ Expires: configurable (days)  │
│              │ Logged: lastUsedAt tracked    │
├──────────────┼──────────────────────────────┤
│ Preview Token│ Draft content access          │
│              │ Scoped to entry/route         │
│              │ Short-lived (minutes/hours)   │
│              │ Single-use optional           │
│              │ Never grants write access     │
└──────────────┴──────────────────────────────┘
```

## Webhook Security

- **Signing:** HMAC-SHA256 with per-webhook secret
- **Headers:**
  - `X-HTMLess-Signature: sha256=<hmac of timestamp + body>`
  - `X-HTMLess-Timestamp: <ISO 8601>`
- **Replay prevention:** Receivers should reject payloads with timestamps older than 5 minutes
- **Secret rotation:** Webhooks support updating signing secrets without downtime (dual-secret verification during rotation window)

## Concurrency Safety

- All mutable CMA resources include `ETag` response headers
- Write operations require `If-Match` header
- Mismatches return `412 Precondition Failed`
- Prevents silent overwrites from concurrent editors/automation

## Data Isolation (Multi-Site)

- Each space has isolated: content, schemas, assets, tokens, webhooks
- Cross-space access is impossible at the query layer
- API tokens are scoped per-space
- Admin users can be granted access to multiple spaces
