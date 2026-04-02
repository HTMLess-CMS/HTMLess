# HTMLess

**The open source headless CMS that doesn't suck.**

Schema builder like Notion. Instant REST & GraphQL APIs. Multi-site from day one. Self-host free forever.

## Quick Start

```bash
git clone https://github.com/pbieda/htmless.git
cd htmless
pnpm install
docker compose -f docker-compose.dev.yml up -d
pnpm --filter @htmless/core prisma migrate dev
pnpm --filter @htmless/core prisma db seed
pnpm dev
```

API running at `http://localhost:3000`, Admin at `http://localhost:3001`.

Default login: `admin@htmless.com` / `admin123`

## Architecture

Three API surfaces with strict separation:

- **CMA** (`/cma/v1`) — Content Management API for editors and automation
- **CDA** (`/cda/v1`) — Content Delivery API, read-only, cacheable, CDN-friendly
- **Preview** (`/preview/v1`) — Draft-inclusive reads with short-lived tokens

## Tech Stack

- **Backend:** Node.js + Express + Prisma
- **Database:** PostgreSQL
- **Cache:** Redis
- **Admin UI:** Next.js
- **Deployment:** Docker

## Features

- Visual schema builder (drag-and-drop content types)
- Instant REST API auto-generated from schemas
- Draft/publish workflow with version history
- Scoped API tokens and preview tokens
- Multi-site support (spaces)
- Webhook engine with HMAC signing and retries
- Media library with transform URLs

## License

MIT — see [LICENSE](LICENSE).
