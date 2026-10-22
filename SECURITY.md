# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Use GitHub's private vulnerability reporting instead: open the repository's **Security** tab → **Report a vulnerability**.

Include a description, the affected files or endpoints, and steps to reproduce. This is a spare-time reference project, so there is no guaranteed response time, but reports are appreciated and will be looked at.

## Scope notes

- The project has never been operated in production. Treat it as a reference implementation and review it before deploying.
- Secrets (`SESSION_SECRET`, `BOOTSTRAP_ACCOUNTS`, `MAINTENANCE_TOKEN*`) must be configured as Cloudflare secrets and never committed.
- Provider (Aidge/OSS) and Resend credentials are stored AES-GCM-encrypted in D1, with a key derived from `SESSION_SECRET`.
