# Deploy HTMLess Admin to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/HTMLess-CMS/HTMLess)

Deploy the HTMLess admin UI to Netlify. The API must be hosted separately (Railway, Render, or self-hosted with Docker).

## Prerequisites

You need a running HTMLess API. Deploy it first using one of these options:

- [Railway](../railway/README.md) (recommended for quick setup)
- [Render](../render/README.md)
- [Self-hosted Docker](../../docker/docker-compose.hub.yml)

## Steps

1. Click the **Deploy to Netlify** button above
2. Connect your GitHub account and authorize the repository
3. Set the required environment variables in the Netlify dashboard:

   | Variable              | Description                          | Example                         |
   | --------------------- | ------------------------------------ | ------------------------------- |
   | `NEXT_PUBLIC_API_URL` | Public URL of your HTMLess API       | `https://htmless-api.up.railway.app` |

4. Deploy. Netlify will build the admin UI using the `netlify.toml` config.
5. Open the deployed URL and log in with your HTMLess credentials.

## Manual Setup

```bash
# Clone the repo
git clone https://github.com/HTMLess-CMS/HTMLess.git
cd HTMLess

# Install Netlify CLI
npm i -g netlify-cli

# Copy netlify.toml to the root
cp deploy/netlify/netlify.toml .

# Build and deploy
netlify deploy --prod
```

## Configuration

The `netlify.toml` in this directory configures:

- **Build command**: `pnpm --filter @htmless/admin build`
- **Publish directory**: `packages/admin/.next`
- **Node version**: 20
- **Next.js plugin**: `@netlify/plugin-nextjs` for optimized Next.js hosting

## Notes

- The admin UI is a Next.js app that communicates with the API via REST
- Make sure your API has CORS configured to allow requests from your Netlify domain
- Netlify's Next.js plugin handles SSR, ISR, and edge middleware automatically
