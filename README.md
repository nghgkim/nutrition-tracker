# Nutrition Tracker

A full-stack web app to track daily calorie intake based on logged foods.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Prisma 7 + PostgreSQL 16 + JWT auth.

## Local dev

```bash
# 1. Start the database
docker compose up -d

# 2. Install dependencies
npm install

# 3. Configure env
cp .env.example .env

# 4. Migrate + seed
npm run db:migrate
npm run seed

# 5. Run
npm run dev   # http://localhost:3000
```

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm run start` — production
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript
- `npm run test` — Vitest unit tests
- `npm run seed` — seed 20 common foods
- `npm run db:migrate` / `npm run db:deploy` — Prisma migrations

## Data sources

Calorie and macro values for seeded foods are approximate, sourced from:
- Bảng thành phần thực phẩm Việt Nam (National Institute of Nutrition, Vietnam Ministry of Health)
- USDA FoodData Central (fdc.nal.usda.gov)

Values vary by preparation method. Users can create custom foods with their own values.

## Spec

See `docs/specs/nutrition-tracker.md` (auto-approved, 93/100).

## SDLC

Delivered via the 4-phase pipeline (BA-PO -> DEV -> QC -> DEVOPS). See `AGENTS.md`.
