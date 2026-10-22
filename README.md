<p align="right"><b>English</b> | <a href="./README.zh-CN.md">简体中文</a></p>

# Sailingo (译帆) — `outsea`

[![CI](https://github.com/HansenUp/outsea/actions/workflows/ci.yml/badge.svg)](https://github.com/HansenUp/outsea/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

> An image and short-video text-translation workflow for cross-border e-commerce sellers, built on Cloudflare Workers + D1 + R2 with Alibaba Cloud Aidge as the translation provider.

> [!NOTE]
> **Status: experimental, no longer actively commercialized.** This project was built as a commercial pilot and is open-sourced as a **reference implementation**. It has never been run against real customers or paid provider traffic. Expect rough edges (see [Known limitations](#known-limitations--roadmap)).

## What it is

Sailingo lets a seller upload Chinese product images (PNG/JPG/WebP) or short MP4 clips (≤ 5 s), pick up to 3 target languages, and receive translated versions with the original layout kept. The translation is done by [Alibaba Cloud Aidge](https://help.aliyun.com/zh/aidge/image-translation) (`ImageTranslationStandard`, `VideoTranslation`). Most of the code is the work *around* the model call. It covers accounts, a credits ledger, async jobs, quality checks, revisions with customer acceptance, and manual order/refund bookkeeping, so the output can actually be delivered and billed.

Much of the plumbing is generic. If you are building a "credits + async AI jobs + human review" product on Cloudflare, parts of this repo may be useful to read.

## Features

- **Accounts & security**: email/username registration and login, PBKDF2 password hashing, HttpOnly sessions, login/registration rate limits, same-origin checks, forced admin password rotation, email verification and password reset.
- **Credits ledger**: welcome credits plus purchased credits, atomic reservation on submit, settle on success, release on definite failure, freeze when the provider state is unknown, and idempotent upload requests.
- **Async jobs + scheduler**: jobs and per-language sub-results persisted in D1 with leases; background drain via `waitUntil`; a separate Cloudflare cron Worker (`ops/scheduler/`) calls `/api/maintenance` every minute with a service token.
- **Term protection & checks**: per-language brand/model "keep as-is" rules and preferred translations (glossary), plus automatic checks of numbers, units, dimensions and brand casing against the provider's text layers.
- **Revision + customer acceptance**: users annotate issues; admins upload a reworked version; only the owning customer can accept or reject; full version history.
- **Orders, refunds & cost accounting**: manual payment confirmation with unique receipts, refunds, provider-call cost reservation and daily budget, per-job revenue/cost "contribution" that stays *incomplete* when any cost is unknown.
- **Acquisition attribution**: consent-based first-touch UTM tracking, signup → upload → paid → repeat funnel, CAC per campaign.
- **Transactional mail** via [Resend](https://resend.com) (API key stored encrypted, server-side).
- **Super-admin console**: users, credits, orders, provider config, launch readiness checks, operations/leads, CSV export (formula-injection safe).
- **i18n**: Simplified Chinese and English UI (`app/locales/en.json` + `scripts/check-locales.mjs`).
- **Demo mode**: loopback-only, isolated local D1/R2, watermarked fake results, provider calls hard-blocked. Lets you try the full flow without any Aidge keys.

## Architecture

```mermaid
flowchart LR
  B[Browser<br/>app/*.tsx] -->|/api/*| W[Worker entry<br/>build/worker.ts]
  W --> R[app/api/[...path]/route.ts]
  R --> S[lib/outsea/server.ts<br/>handle + processJob]
  S --> M[lib/outsea/*<br/>credits · pilot · business · revisions<br/>workflow · mail · acquisition · runtime]
  S --> D[(D1<br/>db/schema.ts · drizzle/)]
  S --> O[(R2 bucket)]
  S -->|signed HTTPS| A[Alibaba Aidge + OSS<br/>lib/outsea/provider.ts]
  C[Cron Worker<br/>ops/scheduler/worker.mjs] -->|Bearer token<br/>POST /api/maintenance| W
```

| Path | Role |
|---|---|
| `build/worker.ts` | Cloudflare Worker entry: origin check, demo guard, routes `/api/*` to the API handler, starts background processing, adds security headers |
| `app/api/[...path]/route.ts` | Catch-all API route, delegates to `handle` |
| `lib/outsea/server.ts` | Main API router, auth, job submission, `processJob` / `drain` / `backgroundDrain` |
| `lib/outsea/*.ts` | Domain modules (credits, pilot/orders, business accounting, revisions, workflow/glossary, checks, mail, acquisition, runtime/health, demo, provider, media inspection, zip) |
| `db/schema.ts`, `drizzle/` | Drizzle schema and SQL migrations (SQLite / D1) |
| `ops/scheduler/` | Standalone cron Worker for unattended maintenance and alerting |
| `app/` | React UI (workbench, admin, credits, landing, service terms) |
| `scripts/` | Local start / demo / backup / production-config helpers |
| `tests/` | `node:test` suites with an in-memory SQLite D1 mock and a mocked provider |

## Tech stack

- [Vinext](https://www.npmjs.com/package/vinext) (Vite-based Next.js-compatible framework, **beta**) · React 19 · TypeScript
- Cloudflare Workers, D1, R2 (and KV for the scheduler) · Wrangler
- Drizzle ORM / drizzle-kit
- Tailwind CSS 4 + shadcn/ui components
- Node.js built-in test runner (`node:test`, `node:sqlite`)

## Getting started

### Prerequisites

- Node.js **>= 22.13** (see `engines` in `package.json`)
- npm
- No Cloudflare account or Aidge keys are needed for local demo mode.

### 1. Install

```sh
npm ci
```

### 2. Create local credentials

`scripts/create-accounts.mjs` generates a local `.dev.vars` (a random `SESSION_SECRET` plus three hashed bootstrap accounts: `admin`, `trial01`, `trial02`). It writes their random passwords to `outputs/accounts.md`. Both paths are git-ignored. The script refuses to overwrite an existing `.dev.vars`.

```sh
node scripts/create-accounts.mjs
```

Alternatively copy `.dev.vars.example` to `.dev.vars` and fill it in manually.

### Environment variables

| Name | Where | Required | Description |
|---|---|---|---|
| `SESSION_SECRET` | Worker secret / `.dev.vars` | yes | Random secret (≥ 32 chars). Also used to derive the AES-GCM key that encrypts provider and mail settings in D1. Rotating it requires re-entering those settings. |
| `BOOTSTRAP_ACCOUNTS` | Worker secret / `.dev.vars` | yes | JSON array of `{id, username, name, role, password}` where `password` is `salt:pbkdf2hex` (see `scripts/create-accounts.mjs`). Inserted with `INSERT OR IGNORE`. |
| `MAINTENANCE_TOKEN_HASH` | Worker secret | prod | SHA-256 hex of the scheduler's token. Injected automatically by `scripts/start-local.mjs` locally. |
| `PUBLIC_ORIGIN` | Worker var | prod | Exact production origin, e.g. `https://app.example.com`; other origins get 403. |
| `DB` | D1 binding | yes | D1 database (local binding defined in `vite.config.ts`). |
| `BUCKET` | R2 binding | yes | R2 bucket for sources and results. |
| `LOCAL_DEMO_MODE`, `LOCAL_DEMO_STORAGE` | injected by `npm run demo` | — | Enable demo mode. Do not set these by hand or in production. |
| `SITE_URL` | scheduler var | scheduler | Production HTTPS origin the cron Worker calls. |
| `MAINTENANCE_TOKEN` | scheduler secret | scheduler | Plain token; its SHA-256 must match `MAINTENANCE_TOKEN_HASH`. |
| `STATUS_KV` | scheduler KV binding | scheduler | Stores incident state for alert deduplication. |
| `ALERT_WEBHOOK` | scheduler secret | optional | HTTPS endpoint that receives generic JSON alerts. |

Aidge/OSS credentials and the Resend API key are **not** environment variables. An admin enters them in the admin console, and they are stored encrypted in D1.

### 3. Build

The local launchers run Wrangler against the build output, so build first (and again after code changes):

```sh
npm run build
```

### 4. Run in demo mode (no provider keys)

```sh
npm run demo
```

This applies all `drizzle/*.sql` migrations to an isolated `.wrangler/demo-state`, then starts the app at <http://127.0.0.1:5174/> (loopback only). A local maintenance tick runs every minute. Log in with the accounts from step 2. Results are watermarked placeholders, and every payment, refund and receipt is simulated (`DEMO-` prefixed).

### 5. Run in normal local mode

```sh
npm run db:migrate:local   # applies new drizzle/*.sql files to .wrangler/state (needs a prior build)
npm start -- --port 5174
```

For real translation you need an Aidge account, a private OSS bucket and a dedicated RAM key, plus an explicitly enabled test budget (see [Configuration](#configuration--feature-flags)). There is also a Vite dev server via `npm run dev`.

### Tests and checks

```sh
npm test        # node:test suites: core, checks, integration, demo, workflow, commercial, mail-runtime
npm run check   # tsc --noEmit + locale catalog check
npm run lint    # currently warnings only, see Known limitations
```

Tests use an in-memory SQLite database built from `drizzle/*.sql`, an in-memory object store and a mocked provider. They need no build, network or credentials.

## Deployment (Cloudflare)

Full walkthrough: [docs/deployment.md](docs/deployment.md). Summary:


1. Create a D1 database and an R2 bucket in your Cloudflare account.
2. `npm run build`
3. Generate a reviewable production config (writes to the git-ignored `outputs/production/`):
   ```sh
   npm run production:prepare -- --origin https://app.example.com --d1-id <D1_UUID> --d1-name <d1-name> --bucket <bucket-name> --name <worker-name>
   ```
4. Generate production secrets (written to `outputs/production/credentials-*.json`, mode 0600, never printed):
   ```sh
   npm run production:secrets
   ```
   Set `SESSION_SECRET`, `BOOTSTRAP_ACCOUNTS` and `MAINTENANCE_TOKEN_HASH` with `wrangler secret put`.
5. Apply all `drizzle/*.sql` migrations to the remote D1 database in order, then `wrangler deploy --config outputs/production/wrangler.json`.
6. Deploy the scheduler: edit `ops/scheduler/wrangler.toml` (`SITE_URL`, `STATUS_KV` id), set `MAINTENANCE_TOKEN` (and optionally `ALERT_WEBHOOK`) as secrets, then deploy it. See `ops/scheduler/README.md`.
7. Log in as `admin`, rotate the password (admin writes are blocked until you do), then configure the provider, mail and launch settings.

## Configuration & feature flags

Everything that costs money or touches customers **defaults to off** (`pilotDefaults` in `lib/outsea/pilot.ts`):

| Setting | Default | Meaning |
|---|---|---|
| `testingEnabled` | `false` | Allow real provider calls at all |
| `dailyBudgetCents`, `imageReserveCents`, `videoReserveCents` | `0` | Provider cost reservation / daily cap; real calls are rejected while these are 0 |
| `allowTrials` | `false` | Let self-registered trial accounts submit jobs |
| `paidEnabled` | `false` | Open credit purchases; also requires every launch-readiness check to pass |
| `languages` | `['en']` | Enabled target languages |
| `welcomeCredits` / `imageCredits` | `3` / `1` | Welcome credits per new account / credits per image-language result |
| `creditPackages` | one example package, disabled | Purchasable packages (CNY, integer cents) |

The launch-readiness checks cover the admin password rotation, a scheduler heartbeat within 3 minutes, a configured budget, operator and contact details, monitoring, mail, and backups.

## Project structure

```text
app/                 React UI, locales, API catch-all route
build/               Cloudflare Worker entry (build/worker.ts)
components/ui/       shadcn/ui components (MIT)
db/                  Drizzle schema
docs/                Technical docs (architecture, demo, deployment, checks)
drizzle/             SQL migrations + snapshots
lib/outsea/          Domain logic (see Architecture)
ops/scheduler/       Cron Worker for maintenance/alerts
public/              Static assets
scripts/             Local/demo/backup/production helpers
tests/               node:test suites and Cloudflare mocks
vendor/              Vendored shadcn Tailwind CSS (MIT)
```

## Known limitations & roadmap

- **Code style**: most domain code is written as dense single-line functions and needs a formatter pass (e.g. Prettier) before it is pleasant to read or review.
- **Monolithic router**: `lib/outsea/server.ts` holds most API routes and the job processor and should be split by domain.
- **Beta framework**: Vinext is in beta (`1.0.0-beta.x`).
- **Provider coupling**: only Alibaba Aidge/OSS is implemented; there is no provider interface for swapping in others yet.
- **Job processing**: a single global provider lock serializes processing, and a crashed run can stall the queue until its 10-minute lease expires. Queues or Durable Objects would be a better fit.
- **Crypto**: the data-encryption key is derived from `SESSION_SECRET` with no key versioning.
- **No online payments**: orders and refunds are bookkept manually; there is no payment gateway.
- **Never validated in production**: no real provider quality, cost or latency data.
- **UI copy is primarily Chinese**, with an English catalog.
- **Lint debt**: `no-explicit-any` and two React rules are downgraded to warnings (~330 warnings) so CI stays green; tighten them while refactoring.
- **Wrangler output path**: local scripts rely on `dist/server/wrangler.json` produced by `npm run build`.

Contributions toward any of the above are welcome.

## Documentation

- [Architecture](docs/architecture.md): request flow, job processing, scheduler, credits ledger
- [Demo mode](docs/demo-mode.md)
- [Deployment](docs/deployment.md)
- [Term protection & quality checks](docs/quality-checks.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: [SECURITY.md](SECURITY.md). CI (`.github/workflows/ci.yml`) runs `check`, `lint`, `test` and `build` on every push and PR.

Issues and pull requests are welcome. Before opening a PR, please run:

```sh
npm run check && npm run lint && npm test
```

Never commit `.dev.vars`, `outputs/`, real provider keys, or customer data.

## License

[MIT](./LICENSE) © 2026 Hansen (HansenUp)

## Acknowledgements

- [shadcn/ui](https://ui.shadcn.com) (MIT): UI components and Tailwind styles in `components/ui/` and `vendor/`.
- [Cloudflare Workers](https://developers.cloudflare.com/workers/), [Drizzle ORM](https://orm.drizzle.team), [Vinext](https://www.npmjs.com/package/vinext), [Resend](https://resend.com), [Alibaba Cloud Aidge](https://help.aliyun.com/zh/aidge/).
