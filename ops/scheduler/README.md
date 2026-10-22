# Sailingo maintenance scheduler

Account-owned Cloudflare Worker; run every minute. `wrangler.toml` contains deliberately invalid placeholders. Configure SITE_URL with the exact HTTPS production origin and STATUS_KV with the owner's KV namespace ID. Set MAINTENANCE_TOKEN and optional ALERT_WEBHOOK through Wrangler secret input, never TOML or Git.

The app receives the matching SHA-256 token hash in MAINTENANCE_TOKEN_HASH. Requests use Authorization Bearer, reject redirects, time out, and retry transient errors at most twice. Authentication failures are not retried. KV tracks incident state for best-effort alert deduplication and recovery notifications. The webhook must accept generic JSON; platform-specific chat robot schemas need an adapter. No real messages are sent in local tests.

Do not deploy before the app origin, secrets and infrastructure are ready. See docs/deployment.md for verification and recovery requirements.
