# thuypn by kimnh

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

Seeded food data (1,590 items) from **Bảng thành phần thực phẩm Việt Nam 2026**, updated per **Thông tư 30/2026/TT-BYT** (effective 10/07/2026):
- https://dulieuphapluat.vn/cong-cu/gia-tri-dinh-duong-thuc-pham.html (849 nguyên liệu)
- https://dulieuphapluat.vn/cong-cu/gia-tri-dinh-duong-mon-an.html (741 món ăn chế biến)

Values are per 100g edible portion. Source field: `NIN2026` / `NIN2026-dish`. Regenerate with `python3 scripts/scrape-nin2026.py`.


## Spec

See `docs/specs/nutrition-tracker.md` (auto-approved, 93/100).

## SDLC

Delivered via the 4-phase pipeline (BA-PO -> DEV -> QC -> DEVOPS). See `AGENTS.md`.
