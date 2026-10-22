# Deployment (Cloudflare)

These steps don't create any cloud resources for you. Review every generated file before using it.

## 1. Resources

- A D1 database (binding `DB`) and an R2 bucket (binding `BUCKET`).
- For the scheduler: a KV namespace (binding `STATUS_KV`).

## 2. Build and generate config

```sh
npm ci
npm run build
npm run production:prepare -- --origin https://app.example.com \
  --d1-id <D1_UUID> --d1-name <d1-name> --bucket <bucket-name> --name <worker-name>
npm run production:secrets
```

- `production:prepare` writes `outputs/production/wrangler.json`, which sets `PUBLIC_ORIGIN` and the real bindings.
- `production:secrets` writes `outputs/production/credentials-<timestamp>.json` with mode 0600 and never prints it. It contains:
  - `SESSION_SECRET`, `BOOTSTRAP_ACCOUNTS` and `MAINTENANCE_TOKEN_HASH` for the Worker;
  - the scheduler's `MAINTENANCE_TOKEN`;
  - a one-time admin password.
- `outputs/` is git-ignored.

## 3. Secrets, migrations, deploy

```sh
npx wrangler secret put SESSION_SECRET         --config outputs/production/wrangler.json
npx wrangler secret put BOOTSTRAP_ACCOUNTS     --config outputs/production/wrangler.json
npx wrangler secret put MAINTENANCE_TOKEN_HASH --config outputs/production/wrangler.json

for f in drizzle/*.sql; do
  npx wrangler d1 execute <d1-name> --remote --file "$f" --config outputs/production/wrangler.json
done

npx wrangler deploy --config outputs/production/wrangler.json
```

Apply each new migration file once, in order. Back up D1 before applying new migrations.

## 4. Scheduler

Edit `ops/scheduler/wrangler.toml` (`SITE_URL` and the `STATUS_KV` id), then:

```sh
cd ops/scheduler
npx wrangler secret put MAINTENANCE_TOKEN
npx wrangler secret put ALERT_WEBHOOK   # optional; HTTPS endpoint that receives generic JSON
npx wrangler deploy
```

## 5. First login

1. Log in as `admin` with the generated password and change it. Until you do, admin writes and real provider calls are blocked.
2. **Translation provider**: set the Aidge region, a dedicated RAM AccessKey and a private OSS bucket. Add a 1-day lifecycle rule on the bucket's `outsea/` prefix.
3. **Mail**: set a Resend API key and a verified sender domain.
4. **Launch settings**: everything that costs money is off by default. Turn on `testingEnabled`, the budgets and `paidEnabled` explicitly. Paid mode also requires every readiness check to pass (heartbeat, monitoring, backups, mail, operator details).

## Backups

- **Local**: `npm run backup:demo` (demo state) or `node scripts/local-backup.mjs --offline-confirmed` (normal local state) takes an offline copy of the local D1 and R2 data into `outputs/backups/`, then verifies a restore drill.
- **Production**: export D1 with `wrangler d1 export` and copy R2 to a separate private location on a schedule. Practice restoring into an isolated database.
