# Security audit — 2026-10-06 (PARTIAL)

Status: incomplete. The three code reviews (modpack, manager, server mod endpoints) did not finish before the hand-off, so this file holds only the dependency audit and the infrastructure checks done directly. No code-level Critical/High finding is confirmed or ruled out yet.

## Dependency audit

### JavaScript (`bun audit`, bun 1.3.1): 29 advisories (2 critical, 16 high, 10 moderate, 1 low)

| Severity (advisory) | Package | Path | Runtime exposure | Assessed |
| --- | --- | --- | --- | --- |
| Critical | protobufjs <=7.5.5 (GHSA-xq3m-2v4x-88gg and 10 more) | server › @donation-alerts/events | Server runtime (streamers/integrations, donation listener). The code-execution advisories need attacker-controlled schemas or prototype pollution; the SDK ships static schemas | Medium: upgrade or override protobufjs to >=7.5.6 |
| Critical | shell-quote 1.8.4–1.10.x | concurrently | Dev only | Low |
| High | lodash-es <=4.17.23 | server › prisma-kysely | Code generator only | Low |
| High | sharp <0.35.5 (librsvg) | client › next | next/image optimizer at runtime; SVG goes through librsvg only if SVG optimisation is enabled | Medium: bump next/sharp |
| High | mysql2 <=3.23.0 | prisma, better-auth | Not used (PostgreSQL) | Low |
| High | js-yaml 4.x, braces, source-map-js, browserslist, deepmerge-ts | tooling, swagger, prisma | Build or dev time; no untrusted YAML parsed at runtime | Low |
| Moderate | fflate <0.7.5 | server › satori | No ZIP parsing of user input | Low |

Fix: `bun update`, adding root `overrides` for protobufjs and sharp where the parent is not yet updated.

### Rust (`cargo audit` 0.22.2, manager `tauri/Cargo.lock`, 595 crates)

No vulnerabilities. 8 allowed warnings, all transitive (Tauri's build and Linux stack): proc-macro-error and the unic-* crates are unmaintained, glib 0.18.5 is unsound (RUSTSEC-2024-0429; Linux only, not in the Windows build) and yoke-derive 0.8.3 is yanked. Low.

### Python (modpack host tooling, `apps/game/modpack/tools/requirements.txt`)

Pillow 6.2.2 has many known CVEs, but it is used only by host tooling, never shipped in the `.mtmod`:

- `tools/assets/render.py:29,50,52`
- `tools/build/previews/__main__.py:37-42`
- `tools/build/setupkit/artwork/render.py:29,63,65`

All three read images from the repository. The shipped `features/hangar_space/model/thumbnail.py:28` states that the client has no PIL. jsonschema 3.2, watchdog and mock are test and dev tooling only. Low: the exposure is limited to developer machines and CI working on trusted inputs.

## Infrastructure

- Low: `infra/caddy/Caddyfile:12-31` redacts the internal token, API key, bot secret and token query parameters, but logs `X-Otmetki-Device` and `X-Otmetki-Signature`. The mod sends these, together with `X-Otmetki-Nonce` and `X-Otmetki-Timestamp`, from `apps/game/modpack/packages/core`. An HMAC output is not a secret, but the device id is a stable identifier tied to an account. Fix: add `request>headers>X-Otmetki-Device delete` and `request>headers>X-Otmetki-Signature delete`.
- OK: `infra/caddy/Caddyfile:2-10` sets HSTS, nosniff, X-Frame-Options DENY and Referrer-Policy.

## Not yet covered

- Modpack: signing construction, credentials storage, TLS verification in Py2.7, TM1/TS1 zlib limits, pickle use, the page→Python command dispatch, parseRichText, hangar_looks paths.
- Manager: Tauri CSP and capabilities, updater, minisign coverage of releases.json, previews and third-party dependencies, zip-slip and ownedPatterns, junctions, deep links, token storage.
- Server: HMAC verification (time window, nonce cache, constant-time compare), bind-code brute force, IDOR, mod-badges privacy and limits, zod strictness and body limits, guards and allowlist, throttler and trust proxy, log redaction, retention, replay parser.
