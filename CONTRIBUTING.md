# Contributing

Thanks for your interest! This project is a reference implementation and is not actively commercialized, so reviews may be slow. Small, focused pull requests are easiest to merge.

## Setup

See the "Getting started" section of the [README](./README.md). In short:

```sh
npm ci
node scripts/create-accounts.mjs   # local .dev.vars + outputs/accounts.md (both git-ignored)
npm run build
npm run demo                       # http://127.0.0.1:5174, no provider keys needed
```

## Before opening a PR

```sh
npm run check   # TypeScript + locale catalog
npm run lint    # currently warnings only (see README "Known limitations")
npm test
npm run build
```

- Add or update tests in `tests/` for behavior changes. Tests run against an in-memory SQLite D1 mock and a mocked provider; they must not need network access or credentials.
- Schema changes: edit `db/schema.ts`, run `npm run db:generate`, and commit the new `drizzle/*.sql` and snapshot.
- New user-facing strings need an English entry in `app/locales/en.json` (`npm run check` enforces this).

## Never commit

`.dev.vars`, anything under `outputs/`, real provider or mail keys, Cloudflare account or resource IDs, or customer data.

## License

By contributing you agree that your contributions are licensed under the [MIT License](./LICENSE).
