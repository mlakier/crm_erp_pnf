# Monorepo Structure Recommendation

## Why a monorepo
This product will share:
- domain types across modules
- shared auth and permission logic
- metadata and workflow primitives
- reporting contracts
- UI components
- integration clients

A monorepo will keep those shared assets versioned together and reduce drift.

## Proposed structure
```text
crm_erp_pnf/
  apps/
    web/
    api/
    worker/
  packages/
    domain/
    ui/
    config/
    workflow/
    reporting/
    integrations/
  infra/
    docker/
    db/
    scripts/
  docs/
    architecture/
    product/
    engineering/
```

## Application responsibilities
### apps/web
- system UI
- dashboards
- transactional screens
- report builder UI
- admin configuration UI

### apps/api
- REST API
- auth endpoints
- module services
- document generation
- reporting endpoints
- integration endpoints/webhooks

### apps/worker
- OCR jobs
- email ingestion processing
- billing runs
- posting jobs
- revenue/amortization calculations
- notification delivery
- retry and dead-letter handling

## Package responsibilities
### packages/domain
- shared enums
- DTO contracts
- event names
- status models
- posting and metadata interfaces

### packages/workflow
- approval models
- condition evaluation
- state transitions
- reusable workflow primitives

### packages/reporting
- metric definitions
- dataset/query contracts
- reusable aggregation helpers

### packages/integrations
- BambooHR client
- Concur client
- OCC adapters
- DocuSign client
- JIRA client

## Initial implementation recommendation
Start with the following deliverables:
- bootstrap monorepo tooling
- create web, api, and worker apps
- add a shared domain package
- add linting, formatting, environment config, and Docker
- add initial CI workflow
