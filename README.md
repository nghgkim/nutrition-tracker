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

Seeded food data is from the official **Vietnamese Food Composition Table 2007** (Bảng thành phần thực phẩm Việt Nam), published by the National Institute of Nutrition (Viện Dinh dưỡng), Ministry of Health (Bộ Y tế), Medical Publishing House, Hanoi. 526 foods across 14 food groups with energy, protein, fat, carbohydrate, and fiber per 100g edible portion.

Source: FAO/INFOODS — https://www.fao.org/food-composition/tables-and-databases/detail/(viet-nam--2007)-vietnamese-food-composition-table/en

Values are per 100g edible portion and may vary by preparation method. Users can create custom foods with their own values.

## Spec

See `docs/specs/nutrition-tracker.md` (auto-approved, 93/100).

## SDLC

Delivered via the 4-phase pipeline (BA-PO -> DEV -> QC -> DEVOPS). See `AGENTS.md`.
