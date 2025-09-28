# Davies CQ × AI Scheduler

Monorepo containing a Next.js PWA dashboard and Node services (API Gateway, CQ Middleware, Comms, Scheduler, Routing, Worker).
See `services/api-gateway/openapi.yaml` for the contract aligned to your specification.

## Quick Start
1. Copy `.env.example` to each service's `.env` as needed.
2. `pnpm i`
3. `docker compose up -d`
4. `pnpm dev`

## Services
- `api-gateway`: single entry for the web app; exposes OpenAPI.
- `cq-middleware`: integrates with Davies CQ / CoreLogic / XactAnalysis.
- `comms-service`: SMS/Email providers + consent handling.
- `scheduler-service`: slot proposals, reminders, reconciliation.
- `routing-service`: route optimization + weather lookups.
- `worker`: BullMQ processors for queues.

## Compliance
- SAML/OIDC user SSO; OAuth2 client-credentials between services.
- Audit log for all actions.
- SMS STOP/START/HELP honored and persisted.
- Idempotent writes and conflict handling.
