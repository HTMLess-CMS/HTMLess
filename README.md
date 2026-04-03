# HTMLess

[![CI](https://github.com/HTMLess-CMS/HTMLess/actions/workflows/ci.yml/badge.svg)](https://github.com/HTMLess-CMS/HTMLess/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-orange.svg)](package.json)
[![Website](https://img.shields.io/badge/Website-htmless.com-111827?logo=googlechrome&logoColor=white)](https://htmless.com)

[Website](https://htmless.com) · [Roadmap](docs/ROADMAP.md) · [Architecture](docs/ARCHITECTURE.md) · [Contributing](CONTRIBUTING.md) · [Developer Guide](CONTRIBUTING-DEV.md)

Live site: https://htmless.com

HTMLess is an open source headless CMS for developers, designers, editors, and agencies who want structured content, clean APIs, and Docker-first self-hosting without getting trapped in a bloated platform.

It is designed around a simple idea: content teams should have an interface they can actually use, and frontend teams should get predictable APIs that fit modern websites, apps, and multi-site setups.

> Status: active development. The monorepo, Docker workflow, core API surfaces, admin app, and worker architecture are in place today, with the roadmap tracking the remaining hardening and advanced CMS features.

## Why HTMLess

- Structured content instead of page-builder lock-in
- Clean separation between management, delivery, and preview APIs
- Self-hosting with Docker and an MIT-licensed core
- A foundation for multi-site, agency, and team workflows
- A simpler mental model for both developers and less technical collaborators

## Who It Is For

- Developers who want predictable content APIs, versioned workflows, and a CMS that does not fight their frontend stack
- Designers and editors who want a more visual content workflow, reusable media, and preview before publishing
- Agencies that need one content platform for multiple clients, brands, or websites

## What You Get In This Repo

- `@htmless/core` for the API layer built on Express, Prisma, PostgreSQL, and Redis
- `@htmless/admin` for the Next.js admin experience
- `@htmless/worker` for background jobs and event-driven processing
- Dockerfiles and Compose files for local development and self-hosted deployment
- Project docs covering architecture, security, roadmap, and product direction

## Quick Start With Docker

The fastest way to evaluate HTMLess is to run the full stack locally with Docker.

```bash
git clone https://github.com/HTMLess-CMS/HTMLess.git htmless
cd htmless
cp .env.example .env
docker compose up -d --build
docker compose exec api pnpm --filter @htmless/core prisma db push
docker compose exec api pnpm --filter @htmless/core prisma db seed
```

After boot:

- API: `http://localhost:3000`
- Admin: `http://localhost:3001`
- Default login: `admin@htmless.com` / `admin123`

Before using HTMLess outside local evaluation, update the secrets in `.env`.

## Local Development

For day-to-day development, use Docker for infrastructure and run the apps from the workspace.

```bash
git clone https://github.com/HTMLess-CMS/HTMLess.git htmless
cd htmless
pnpm install
docker compose -f docker-compose.dev.yml up -d
pnpm db:push
pnpm db:seed
pnpm dev
```

Then start the admin app in a second terminal:

```bash
pnpm dev:admin
```

Useful commands:

- `pnpm dev` starts the core API and ensures Docker services are up
- `pnpm dev:admin` starts the admin UI on `http://localhost:3101`
- `pnpm dev:all` runs API, admin, and worker together
- `pnpm build` builds every package in the workspace
- `pnpm lint` runs package linters

## Product Shape

HTMLess is built around three API surfaces with clear responsibilities:

- **CMA** at `/cma/v1` for content management, editorial actions, and automation
- **CDA** at `/cda/v1` for read-only content delivery to websites and apps
- **Preview** at `/preview/v1` for draft-aware rendering and review flows

This separation keeps editorial operations safer while giving frontend teams a delivery-oriented API they can cache and integrate cleanly.

## Architecture At A Glance

| Package | Role | Default port |
| --- | --- | --- |
| `@htmless/core` | API server, auth, schema, entries, delivery, preview | `3000` |
| `@htmless/admin` | Admin dashboard and editorial UI | `3001` in Docker, `3101` in local dev |
| `@htmless/worker` | Background jobs, queue processing, async workflows | none |
| `postgres` | Primary relational database | `5432` in Docker, `5434` in dev compose |
| `redis` | Cache and queue backend | `6379` in Docker, `6380` in dev compose |

## Documentation

- [docs/ROADMAP.md](docs/ROADMAP.md) for current product phases and missing capabilities
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the high-level system design
- [docs/SPEC.md](docs/SPEC.md) for the API and behavior contract
- [docs/SECURITY.md](docs/SECURITY.md) for security decisions and operational concerns
- [CONTRIBUTING.md](CONTRIBUTING.md) for setup, code style, and pull request workflow
- [CONTRIBUTING-DEV.md](CONTRIBUTING-DEV.md) for routes, migrations, Docker, testing, and troubleshooting

## Why Install It Now

HTMLess is a good fit if you want to:

- self-host your CMS instead of renting your content layer forever
- keep content structured so it can power websites, apps, and campaigns from one backend
- start with an open source core and grow into a more advanced editorial platform
- join a project early enough to shape the roadmap with real use cases

## Contributing

Issues, feedback, architecture suggestions, and implementation help are all welcome. If you want to contribute, start with the roadmap and the docs, then open an issue or pull request in the main repository:

`https://github.com/HTMLess-CMS/HTMLess`

## Deploy

### Docker (self-hosted)

```bash
npx create-htmless my-cms
cd my-cms
docker compose up -d
```

Or use pre-built images from Docker Hub:

```bash
curl -sL https://raw.githubusercontent.com/HTMLess-CMS/HTMLess/main/docker/docker-compose.hub.yml -o docker-compose.yml
docker compose up -d
```

### 1-Click Cloud Deploy

| Platform | What It Deploys | Link |
| --- | --- | --- |
| **Railway** | API + Worker + PostgreSQL + Redis | [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/htmless?referralCode=htmless) |
| **Render** | API + Admin + Worker + PostgreSQL + Redis | [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/HTMLess-CMS/HTMLess) |
| **Vercel** | Admin UI (Next.js) | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FHTMLess-CMS%2FHTMLess&env=NEXT_PUBLIC_API_URL&project-name=htmless-admin) |
| **Netlify** | Admin UI (Next.js) | [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/HTMLess-CMS/HTMLess) |

See the [deploy/](deploy/) directory for platform-specific guides.

### npm Packages

```bash
npm install @htmless/core    # API server and CLI
npm install htmless           # TypeScript SDK
npx create-htmless my-cms    # Project scaffolder
```

## License

HTMLess is released under the [MIT License](LICENSE).
