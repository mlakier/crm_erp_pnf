# Nightly Exchange Rate Sync

This repo now carries an explicit nightly FX schedule.

- workflow: `.github/workflows/nightly-exchange-rates.yml`
- trigger:
  - nightly cron
  - manual `workflow_dispatch`
- endpoint:
  - `GET /api/exchange-rates/sync?triggerType=scheduled`

## Required GitHub Secrets

Configure these in the GitHub repo or environment:

- `APP_BASE_URL`
  - deployed app base URL, for example `https://erp.example.com`
- `EXCHANGE_RATE_SYNC_TOKEN`
  - shared scheduler token

## Required App Environment Variable

Set this in the deployed application environment:

- `EXCHANGE_RATE_SYNC_TOKEN`

The value must match the GitHub secret. The scheduler endpoint already enforces this in:

- `src/app/api/exchange-rates/sync/route.ts`

## What the Nightly Job Does

- calls the existing scheduler-ready FX sync endpoint
- records a `runHeader` row with `runType = fx_ingestion`
- records `runItem` rows for each requested date
- writes `integrationLog` entries for success/failure
- uses `triggerType = scheduled`

## Notes

- The cron is currently `08:05 UTC`.
- That is `00:05` Pacific during standard time and `01:05` Pacific during daylight time.
- If you want a different nightly business window, update the cron expression in the workflow.
