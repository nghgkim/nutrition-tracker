# Local Dev & Test Environment: [Project Name]

> Runbook to get a working local stack. Follow top-down; stop at the first
> step that fails and fix it before continuing.

## 1. Required Services

```bash
docker compose up -d postgres redis   # adjust to this repo's compose file
docker compose ps                     # both must be Up (healthy)
```

## 2. Environment Variables

Copy `.env.example` → `.env`. Minimum required keys:

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/app_test` | separate TEST database |
| `REDIS_URL` | `redis://localhost:6379/0` | idempotency store |
| ... | | |

NEVER commit real secrets. CI uses its own vault/env.

## 3. Seed Data

```bash
# Load minimal seed for integration tests:
<repo-specific seed command, e.g. uv run python scripts/seed_test_db.py>
```

## 4. Verify (must all pass before Gate 2/3 work)

```bash
<test command, e.g. uv run pytest -q>        # unit
<integration command>                          # needs services from step 1
```

If integration tests fail with connection errors, the environment is broken —
fix THIS file's steps first, never patch app config to dodge missing services.
