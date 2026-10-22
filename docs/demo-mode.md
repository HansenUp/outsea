# Demo mode

Demo mode lets you try the whole flow without any provider keys or payments: upload, processing, preview and download, credits, simulated purchases and refunds, and revisions.

```sh
node scripts/create-accounts.mjs   # once; skip if .dev.vars already exists
npm run build                      # after every code change
npm run demo                       # http://127.0.0.1:5174
```

How demo mode stays isolated:

- `scripts/start-local.mjs --demo` injects `LOCAL_DEMO_MODE=loopback-only-v1` and `LOCAL_DEMO_STORAGE=isolated-v1`. Demo mode can't be switched on from the UI or from config.
- Data lives in `.wrangler/demo-state`, with its own D1 and R2. `scripts/init-demo.mjs` applies `drizzle/*.sql` there automatically.
- The server binds to loopback only, and accepts only `http://127.0.0.1` / `localhost` requests without proxy headers.
- All Aidge/OSS functions throw in demo mode (`blockDemoProvider`), so a leftover provider config can't trigger real calls.
- Results are prebuilt, watermarked samples. They are not OCR or a translation of your image.
- Order and receipt IDs start with `DEMO-` / `demo-`.
- No mail is sent. Messages appear in the admin "local demo inbox".

Log in with the accounts written to `outputs/accounts.md` (`admin`, `trial01`, `trial02`).

Normal local mode uses `.wrangler/state`. Real provider calls become possible there once an admin configures them:

```sh
npm run db:migrate:local
npm start -- --port 5174
```
