# Architecture

## Request flow

1. `build/worker.ts` is the Cloudflare Worker entry. It:
   - rejects requests whose origin differs from `PUBLIC_ORIGIN` (when set);
   - allows only loopback access in demo mode;
   - sends `/api/*` to `handle()` and everything else to the Vinext fetch handler;
   - adds security headers (`responseSecurity` in `lib/outsea/runtime.ts`).
2. `handle()` in `lib/outsea/server.ts`:
   - parses `/api/<segments>` and requires same-origin for non-GET requests;
   - bootstraps accounts from `BOOTSTRAP_ACCOUNTS` and authenticates the `outsea_session` cookie;
   - dispatches to the domain routers (`mail`, `revisions`, `business`, `acquisition`, `runtime`, `workflow`, `credits`, `pilot`) before its own auth, jobs and admin routes.
3. After a successful job submission or retry, the worker calls `backgroundDrain()` via `ctx.waitUntil`, which processes for about 23 s. Anything left over is picked up by `/api/maintenance`.

## Job processing

- A job (`jobs`) has one result row per target language (`results`).
- `processJob()` takes a 10-minute lease on the job and a global provider lock (`settings.pilot_provider_lock`), so provider calls run one at a time.
- Images use a synchronous `ImageTranslationStandard` call. Videos use an asynchronous `VideoTranslation` task, polled with `QueryAsyncTaskResult`.
- Every provider call is recorded in `pilot_calls` with a status: `started`, then `succeeded`, `failed` or `unknown`.
  - An `unknown` call (network failure after submission) is never retried automatically.
  - Its credits stay frozen until an admin records an outcome.
- Results are fetched only from Aliyun domains, capped at 30 MB, checked by magic bytes and stored in R2.

## Scheduler

- `ops/scheduler/worker.mjs` is a separate Worker on a `* * * * *` cron.
- It POSTs `/api/maintenance` with `Authorization: Bearer <MAINTENANCE_TOKEN>`. The app compares the token's SHA-256 against `MAINTENANCE_TOKEN_HASH`.
- Maintenance does housekeeping (expired sessions, rate-limit keys, retention cleanup), drains jobs, records a heartbeat and returns monitor counters.
- The scheduler keeps incident state in KV and can POST generic JSON alerts to `ALERT_WEBHOOK`.
- Locally, `scripts/start-local.mjs` makes the same call every minute with an in-memory token.

## Credits ledger

- Credits come in two pools, welcome and paid (`credit_entries`, `credit_allocations`). Paid credits are mapped FIFO to purchase lots (`credit_lots`), so revenue per job can be computed later.
- Lifecycle:
  1. **Reserve** on submit, atomically with job creation.
  2. **Spend** on success.
  3. **Release** on a definite failure.
  4. **Freeze** while the provider state is unknown.
- Uploads carry a client request ID, so retries reuse the same job instead of reserving credits twice.
- Money is stored as integer cents (orders) or integer micro-yuan (accounting) to avoid float errors.

## Data

All tables are defined in `db/schema.ts` (Drizzle, SQLite dialect). Migrations are in `drizzle/` and are applied in filename order. Tables are never created at request time.

## Security notes

- Passwords use PBKDF2-SHA256 with 100k iterations (the Workers limit).
- Sessions are random tokens, stored hashed, in `HttpOnly; SameSite=Strict` cookies.
- Rate limits are stored in the `limits` table: login per IP and per user, registration per IP.
- Provider and mail credentials are AES-GCM encrypted with a key derived from `SESSION_SECRET`.
- CSV exports neutralize spreadsheet formulas.
