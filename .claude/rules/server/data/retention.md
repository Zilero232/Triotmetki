---
paths:
  - "apps/web/server/**/*.ts"
---

<!-- Compressed editing rules for the server app (API and worker), loaded automatically on edit. -->
<!-- Server specifics in apps/web/server/CLAUDE.md; API terms in docs/research/data/lesta-api.md. Keep them in sync. -->

# Code style — server: data retention

## Data retention is a Lesta term

Purge jobs, deletion requests (`PurgeGuardService`) and the Timescale retention
policies (`TIMESCALE` in `config/timescale.constants.ts`) are not optional. Every
table that grows with time gets a `RETENTION.rules` entry
(`modules/collector/purge/config`) in the same change, or is listed in
`docs/guides/server/data.md` (Retention) as kept on purpose with the reason.
