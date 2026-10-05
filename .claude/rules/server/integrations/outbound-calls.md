---
paths:
  - "apps/web/server/**/*.ts"
---

<!-- Compressed editing rules for the server app (API and worker), loaded automatically on edit. -->
<!-- Server specifics in apps/web/server/CLAUDE.md; module shape in docs/guides/server/nestjs.md. Keep them in sync. -->

# Code style — server: outbound calls

## Outbound calls

Plain HTTP goes through `HttpClientService` (`core/http`) over the shared `ky`
instance in `lib/http` (one User-Agent, a default timeout), so tests mock the
service instead of stubbing `fetch`; `lib/lesta`'s requester builds its own `ky` instance with the lane's `timeoutMs`. A call
without a timeout holds the connection, and the job, indefinitely.

Read JSON with `getJson({ url, schema, options })`: it parses the body with the Zod
schema behind the seam (ky's Standard Schema support), returns the typed value, throws
ky's `SchemaValidationError` when the body does not match, and retries a failed GET
(`HTTP.retry`) unless the call passes its own `retry`. The schema-less `getJson`,
`getText` and `requestJson` return `unknown` with one attempt and stay only until their
callers move. Code outside Nest (scripts, the game-data importer) imports `getJson` and
`http` from `lib/http` directly; a test injects a fake through ky's `fetch` option.
