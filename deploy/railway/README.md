# Deploy HTMLess API on Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/htmless?referralCode=htmless)

Deploy the full HTMLess stack (API + Worker + PostgreSQL + Redis) to Railway with one click.

## What Gets Deployed

| Service    | Image / Source       | Description                    |
| ---------- | -------------------- | ------------------------------ |
| **API**    | `Dockerfile.api`     | Express API server             |
| **Worker** | `Dockerfile.worker`  | Background job processor       |
| **Postgres** | Railway plugin     | PostgreSQL 16 database         |
| **Redis**  | Railway plugin       | Redis 7 for cache and queues   |

## Steps

### Option 1: One-Click Deploy

1. Click the **Deploy on Railway** button above
2. Railway will provision PostgreSQL and Redis automatically
3. Set the following environment variables on the API service:

   | Variable        | Description                    | Value                              |
   | --------------- | ------------------------------ | ---------------------------------- |
   | `DATABASE_URL`  | PostgreSQL connection string   | Set automatically by Railway       |
   | `REDIS_URL`     | Redis connection string        | Set automatically by Railway       |
   | `JWT_SECRET`    | Secret for signing JWT tokens  | Generate a random 64-char string   |
   | `NODE_ENV`      | Environment                    | `production`                       |
   | `PORT`          | API port                       | `3000`                             |

4. After deploy, run the database migration:
   ```bash
   railway run pnpm --filter @htmless/core prisma db push
   railway run pnpm --filter @htmless/core prisma db seed
   ```

5. Your API is live at the Railway-assigned URL

### Option 2: Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create project
railway init

# Add PostgreSQL and Redis
railway add --plugin postgresql
railway add --plugin redis

# Deploy
railway up
```

## Admin UI

After the API is running, deploy the admin UI to:

- [Vercel](../vercel/README.md) (recommended)
- [Netlify](../netlify/README.md)

Set `NEXT_PUBLIC_API_URL` to your Railway API URL.

## Environment Variables

Railway automatically injects `DATABASE_URL` and `REDIS_URL` when you use their PostgreSQL and Redis plugins. You only need to manually set:

- `JWT_SECRET` -- A strong random string for signing auth tokens
- `NODE_ENV` -- Set to `production`

## Notes

- Railway provides automatic HTTPS with custom domains
- The health check endpoint is `/health`
- Worker service shares the same DATABASE_URL and REDIS_URL
- Railway sleeps free-tier services after inactivity; upgrade for production use
