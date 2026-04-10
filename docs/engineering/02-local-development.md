# Local Development

## Prerequisites
- Node.js 20+
- Docker Desktop
- npm

## First-time setup
1. Copy `.env.example` to `.env`
2. Start Postgres:
   - `docker compose -f infra/docker/docker-compose.yml up -d`
3. Install dependencies:
   - `npm install`
4. Generate Prisma client:
   - `npm run db:generate`

## Run services
- Web: `npm run dev:web`
- API: `npm run dev:api`
- Worker: `npm run dev:worker`

## First URLs
- Web: `http://localhost:3000`
- API health: `http://localhost:4000/api/health`
- API platform summary: `http://localhost:4000/api/platform/summary`

## Next implementation target
Build the platform foundation in this order:
1. auth + users + roles
2. metadata/custom field APIs
3. workflow definitions and runtime events
4. customer/vendor/item master records
