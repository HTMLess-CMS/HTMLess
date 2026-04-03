# Deploy HTMLess on Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/HTMLess-CMS/HTMLess)

Deploy the full HTMLess stack (API, Admin, Worker, PostgreSQL, Redis) to Render using the Blueprint.

## What Gets Deployed

| Service           | Type     | Description                    |
| ----------------- | -------- | ------------------------------ |
| **htmless-api**   | Web      | Express API server             |
| **htmless-admin** | Web      | Next.js admin dashboard        |
| **htmless-worker**| Worker   | Background job processor       |
| **htmless-redis** | Redis    | Cache and queue backend        |
| **htmless-db**    | Database | PostgreSQL database            |

## Steps

### Option 1: One-Click Deploy

1. Click the **Deploy to Render** button above
2. Render reads `render.yaml` and provisions all services automatically
3. `JWT_SECRET` is auto-generated; `DATABASE_URL` and `REDIS_URL` are injected from the provisioned resources
4. Wait for all services to finish building and deploying
5. After first deploy, run the database setup:
   - Open the API service shell in the Render dashboard
   - Run:
     ```bash
     node packages/core/dist/cli/index.js db:push
     node packages/core/dist/cli/index.js db:seed
     ```
6. Open the admin URL and log in with `admin@htmless.com` / `admin123`

### Option 2: Manual Setup

```bash
# Clone the repo
git clone https://github.com/HTMLess-CMS/HTMLess.git
cd HTMLess

# Copy the blueprint to the root
cp deploy/render/render.yaml .

# Push to your GitHub repo and connect it in the Render dashboard
# Render will detect render.yaml and create all services
```

## Blueprint Details

The `render.yaml` in this directory defines:

- **API**: Docker build from `Dockerfile.api`, health check at `/health`
- **Admin**: Docker build from `Dockerfile.admin`, auto-linked to API URL
- **Worker**: Docker build from `Dockerfile.worker`, shares DB and Redis
- **Redis**: Render-managed Redis with `allkeys-lru` eviction
- **PostgreSQL**: Render-managed database named `htmless`

## Environment Variables

All environment variables are configured automatically by the Blueprint:

| Variable              | Service | Source                     |
| --------------------- | ------- | -------------------------- |
| `DATABASE_URL`        | API, Worker | Auto from htmless-db   |
| `REDIS_URL`           | API, Worker | Auto from htmless-redis |
| `JWT_SECRET`          | API     | Auto-generated             |
| `NEXT_PUBLIC_API_URL` | Admin   | Auto from htmless-api      |
| `NODE_ENV`            | All     | `production`               |

## Notes

- Render provides automatic HTTPS on all web services
- Free-tier databases and Redis instances have storage limits; upgrade for production
- Custom domains can be added in the Render dashboard after deploy
- The admin UI communicates with the API via the internal service URL
