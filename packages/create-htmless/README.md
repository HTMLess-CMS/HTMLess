# create-htmless

Scaffold a new [HTMLess](https://htmless.com) CMS project in seconds.

## Usage

```bash
npx create-htmless my-cms
cd my-cms
docker compose up -d
```

That's it. After boot:

- **Admin UI**: http://localhost:3001
- **API**: http://localhost:3000
- **Login**: `admin@htmless.com` / `admin123`

## What It Creates

```
my-cms/
  docker-compose.yml   # Full stack: API, Admin, Worker, PostgreSQL, Redis
  .env                 # Pre-generated secrets (JWT, DB password)
  .gitignore           # Sensible defaults
  package.json         # Convenience scripts (start, stop, logs)
```

## Options

```bash
npx create-htmless <project-name>
```

The project name is required and will be used as the directory name.

## Requirements

- Docker and Docker Compose
- Node.js 18+ (for running the scaffolder)

## What Happens Next

1. Start the stack: `docker compose up -d`
2. Initialize the database:
   ```bash
   docker compose exec api pnpm --filter @htmless/core prisma db push
   docker compose exec api pnpm --filter @htmless/core prisma db seed
   ```
3. Open http://localhost:3001 and log in
4. Create content types, add entries, and query the API

## License

MIT
