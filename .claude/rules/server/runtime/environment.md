---
paths:
  - "apps/web/server/**/*.ts"
---

<!-- Compressed editing rules for the server app (API and worker), loaded automatically on edit. -->
<!-- Server specifics in apps/web/server/CLAUDE.md; deploy env in docs/ops/deploy.md. Keep them in sync. -->

# Code style — server: environment and tunables

## Environment

`config/env/env.schemas.ts` (the schema) and `env.ts` (`validateEnv`, `isProduction`) validate on boot and **throws** on a missing or malformed
variable. Only secrets, addresses, ports and connection strings are env; every
tunable is an `as const` object in `config/*.constants.ts` (`FEATURES`, `SOURCES`,
`LESTA`, `TIMESCALE`, `BULL_BOARD`). Schedules run by default; `FEATURES` holds
only flags that are actually switched off (`moePoliroid`), not always-true switches.
`FEATURES` is for switches read across modules; a flag only one module reads lives in
that module's `config/` (`PLUS.checkoutEnabled` from `@otmetki/schemas`,
`STREAMERS.editorialEnabled`) and reaches its services through DI
(`SubscriptionWriterService.isCheckoutEnabled`, `NOTIFICATION_TOKENS.plusCheckoutEnabled`)
so a test passes the value instead of mutating the constant.
