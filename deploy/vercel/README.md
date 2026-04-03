# Deploy HTMLess Admin to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FHTMLess-CMS%2FHTMLess&env=NEXT_PUBLIC_API_URL&envDescription=URL%20of%20your%20HTMLess%20API%20server&project-name=htmless-admin&repository-name=htmless-admin)

Deploy the HTMLess admin UI to Vercel. The API must be hosted separately (Railway, Render, or self-hosted with Docker).

## Prerequisites

You need a running HTMLess API. Deploy it first using one of these options:

- [Railway](../railway/README.md) (recommended for quick setup)
- [Render](../render/README.md)
- [Self-hosted Docker](../../docker/docker-compose.hub.yml)

## Steps

1. Click the **Deploy with Vercel** button above
2. Set the required environment variables:

   | Variable              | Description                          | Example                         |
   | --------------------- | ------------------------------------ | ------------------------------- |
   | `NEXT_PUBLIC_API_URL` | Public URL of your HTMLess API       | `https://htmless-api.up.railway.app` |

3. Deploy. Vercel will build the admin UI from the monorepo.
4. Open the deployed URL and log in with your HTMLess credentials.

## Manual Setup

```bash
# Clone the repo
git clone https://github.com/HTMLess-CMS/HTMLess.git
cd HTMLess

# Install Vercel CLI
npm i -g vercel

# Copy vercel.json to the root
cp deploy/vercel/vercel.json .

# Deploy
vercel --prod
```

## Configuration

The `vercel.json` in this directory configures:

- **Build command**: `pnpm --filter @htmless/admin build`
- **Output directory**: `packages/admin/.next`
- **Framework**: Next.js
- **Install command**: `pnpm install`

## Notes

- The admin UI is a Next.js app that communicates with the API via REST
- Make sure your API has CORS configured to allow requests from your Vercel domain
- For preview deployments, use environment variable overrides per branch
