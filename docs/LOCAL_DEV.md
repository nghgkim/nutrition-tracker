# Local Development

## Prerequisites
- Docker (for Postgres)
- Node.js 20+
- npm 10+

## Setup
```bash
docker compose up -d          # Postgres on :5440
cp .env.example .env
npm install
npm run db:migrate
npm run seed                  # 20 common foods
```

## Run
```bash
npm run dev                   # http://localhost:3000
```

## Access hosts
- `http://localhost:3000` (loopback)
- `http://dev-vm:3000` (configured dev host — must work, see allowedDevOrigins in next.config.ts)

## Smoke test (run after any change)
```bash
bash scripts/smoke.sh
```
The smoke test runs through `dev-vm:3000` (not localhost) to catch cross-origin / host config regressions. It exits non-zero on any failure.

## Checks before handoff to QC
- `npm run build` (exit 0)
- `npm run typecheck` (exit 0)
- `npm run lint` (0 errors)
- `npm run test` (all green)
- `bash scripts/smoke.sh` (all green)
