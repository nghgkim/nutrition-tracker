# System Architecture: [Project Name]

> Data-flow map. Read this BEFORE tracing any request. Directory trees show
> WHERE code lives; this file shows HOW data moves. 100% English.

## 1. Data Flow (canonical path)

```text
Client / Gateway
  -> API Routers (transport, DTO validation only)
  -> Domain Services (pure business logic, no I/O)
  -> Repositories (explicit queries, locks)
  -> Database
                    -> Event Dispatcher -> Message Broker -> Async Workers
```

Rules:
- NEVER call the database directly from workers, cron jobs, or HTTP clients.
  All persistence goes through Repositories.
- NEVER perform blocking I/O inside async request handlers (delegate to workers).
- Cross-boundary calls (service-to-service, webhooks) go through adapters in
  `core/` or `integrations/`, never inline in routers.

## 2. Runtime Topology

| Component | Runs where | Talks to | Notes |
|---|---|---|---|
| API | [e.g. k8s deployment `api`, 2 replicas] | DB via repo layer, broker via dispatcher | stateless, SIGTERM drain |
| Workers | [e.g. k8s deployment `worker`] | broker, DB via repo layer | idempotent handlers + Idempotency-Key |
| Cache | [e.g. Redis] | API + workers | cache-aside only, never source of truth |
| Scheduler | [e.g. cronjob] | API internal endpoints | no direct DB writes |

## 3. Boundaries (hard rules)

1. Transport NEVER imports persistence models.
2. Domain NEVER imports framework code (no FastAPI/Gin/Nest imports in domain/).
3. Async workers MUST be idempotent (safe retry) — see ADR idempotency rule.
