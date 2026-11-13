# Data Model & Schema: [Project Name]

> Single source of truth for tables, keys, and indexes. Read this BEFORE writing
> any query or migration. ORM code is implementation; this file is the contract.
> Regenerate after every merged migration touching tables/indexes.

## 1. Conventions

- IDs: [UUIDv7 / BIGINT — pick one, never mix]
- Audit columns on every table: `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ`
- Soft delete? [yes via `deleted_at` / no — hard delete]
- Money: `NUMERIC(12,2)`, never FLOAT.

## 2. Core Tables

| Table | Primary Key | Foreign Keys | Notes |
|---|---|---|---|
| `users` | `id` | — | auth identity |
| `orders` | `id` | `user_id → users.id` | idempotency key UNIQUE |
| ... | | | |

## 3. Indexes & Constraints

| Index | Columns (in order) | Purpose |
|---|---|---|
| `orders_user_created_idx` | `(user_id, created_at DESC)` | keyset pagination feed |
| ... UNIQUE (...) | ... | dedup / idempotency |

Equality columns first, range/sort last (ESR). Every `SELECT FOR UPDATE`
MUST hit a PK/unique index (else full-table lock — see database skill).

## 4. Migration History (latest first)

| Version | Change | Zero-downtime? |
|---|---|---|
| `a1b2c3` | add `orders.idempotency_key UNIQUE` | yes (expand→backfill→contract) |
