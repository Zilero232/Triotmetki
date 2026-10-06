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

Fixed (server pass): root `overrides` lift protobufjs to ^7.5.6 (only centrifuge's protobuf build needs it, and `@donation-alerts/events` loads the JSON build), js-yaml ^4.3.2 (`@nestjs/swagger` only calls `dump`), fflate ^0.8.3 (satori imports `inflateSync`), sharp ^0.35.5, shell-quote ^1.11.0, source-map-js ^1.2.2, lodash-es ^4.18.1, mysql2 ^3.24.5, browserslist ^4.29.0 and deepmerge-ts ^8.0.2 (`prisma generate` checked). `bun audit` after: 3 left, none with a fix: braces <=3.0.3 (high; 3.0.3 is the latest release; build and dev tooling), sprintf-js <=1.1.3 (moderate; latest; `ioredis-mock` in tests), katex <0.18.2 (low; `@eslint/markdown` pins ^0.16; lint only).

### Rust (`cargo audit` 0.22.2, manager `tauri/Cargo.lock`, 595 crates)

No vulnerabilities. 8 allowed warnings, all transitive (Tauri's build and Linux stack): proc-macro-error and the unic-* crates are unmaintained, glib 0.18.5 is unsound (RUSTSEC-2024-0429; Linux only, not in the Windows build) and yoke-derive 0.8.3 is yanked. Low.

### Python (modpack host tooling, `apps/game/modpack/tools/requirements.txt`)

Pillow 6.2.2 has many known CVEs, but it is used only by host tooling, never shipped in the `.mtmod`:

- `tools/assets/render.py:29,50,52`
- `tools/build/previews/__main__.py:37-42`
- `tools/build/setupkit/artwork/render.py:29,63,65`

All three read images from the repository. The shipped `features/hangar_space/model/thumbnail.py:28` states that the client has no PIL. jsonschema 3.2, watchdog and mock are test and dev tooling only. Low: the exposure is limited to developer machines and CI working on trusted inputs.

## Modpack

Code review of `apps/game/modpack` (Python 2.7 game code, `ui-web`, host tooling). Fixed in core 0.9.4, companion 0.8.4, ui 0.9.4, update_notice 0.2.2, replay_upload 0.2.2 (not yet released).

| Id | Severity | Finding | Status |
| --- | --- | --- | --- |
| M1 | Medium | `core/net/transport/exchange.py` called `urllib2.urlopen` without an explicit TLS context and followed redirects, which carried the signed `X-Otmetki-*` headers to the new URL (https→http included); answers were read whole. The app used `BigWorld.fetchURL`, whose certificate check is unknown. | Fixed: `ssl.create_default_context()` (CERT_REQUIRED + host name check, fail closed when missing), plain http only to localhost / 127.0.0.1, every redirect refused (the 3xx comes back as its status), answers capped (8 MiB, replay upload receipts 256 KiB). The app's transport is now always the urllib worker thread; `fetchURL` is not used (UNVERIFIED cert behaviour, noted in the README). |
| M2 | Medium | The device HMAC secret was stored in plain text in `mods/configs/otmetki/credentials.json` (often zipped and shared) and its `%APPDATA%` mirror. | Fixed: the game-folder copy keeps only `{device_id, account_id}`; `%APPDATA%\TriOtmetki\credentials.json` holds `{device_id, account_id, secret_dpapi}` (base64 of `CryptProtectData`, entropy `triotmetki-device-v1`, `CRYPTPROTECT_UI_FORBIDDEN`, CurrentUser) through ctypes; a legacy plaintext `secret` is read once and both copies are rewritten at once; plaintext is never written. Same format as the manager. |
| M3 | Medium | `server_url` in `config.json` (shared in zips) could point the signed traffic at any https host; the check was prefix-based. | Fixed: release builds always use `https://api.triotmetki.ru`; another value counts only in a dev install (the dev loop's `otmetki-dev.json` manifest or `OTMETKI_DEV=1`); parsed with `urlparse`, user info, query and fragment refused, plain http only to exactly localhost / 127.0.0.1; the settings window shows a warning chip while another server is active. |
| M4 | Medium (privacy) | `pack_badge` sends other players' account ids to the server once per battle, on by default. | Kept on (owner's decision); verified the body is `{device_id, account_id, account_ids}` with numeric ids only, never names (pinned by a test); README and the spec state that the server keeps no copy of the roster. |
| L1 | Low | TM1 profile codes from strangers could switch on components that send client requests or hide client views, and carried unknown sections. | Fixed: codes never carry `hangar_auto_reserves`, `hangar_auto_resupply`, `hangar_depot_seller`, `hangar_cleaner`, `hangar_notification_filter`, `battle_chat_filter`, their sections and `hangar_tweaks.quick_actions` (export and import); import drops unknown config keys, sections and section keys. Local profiles keep everything. |
| L2 | Low | Server text reached system messages and dialogs (the bind failure reason, `profile_slug`, the update notice's release version). | Fixed: bind failures map to known codes with own strings; `profile_slug` must match `^[a-z0-9-]{1,64}$`; the release version must match a full version pattern. |
| L3 | Low | HUD rich text: `String.fromCodePoint` on an out-of-range reference threw (one bad payload blanked the HUD); Python `font()` did not escape its text. | Fixed: code points clamped, the HUD view behind an error boundary, `<`, `>`, `&` escaped in `core/format` markup inputs. |
| L4 | Low | `core/replay_file/header.py`: deeply nested JSON raised `RuntimeError` past the parse guard; the per-block read cap was large. | Fixed: `RuntimeError` caught, block caps lowered. |
| L5 | Low | `update_notice`, `preset_advisor` and `core/client/moe` send requests before the player binds, against «Nothing is sent before the player binds the mod». | Accepted as a documented exception: unsigned GETs of public reference data with no account, device or battle data (game version; a tank id). Written into the README «Fair play» and the modpack CLAUDE.md; the owner can gate them behind binding instead. |
| L6 | Low | Responses were read without a size limit. | Fixed with M1. |
| L7 | Low | `tools/requirements.txt` pinned versions without hashes. | Fixed: every file of every pin is hashed (setuptools 44.1.1 pinned too); CI installs with `--require-hashes`. |

## Infrastructure

- Low: `infra/caddy/Caddyfile` redacted the internal token, API key, bot secret and token query parameters, but logged `X-Otmetki-Device` and `X-Otmetki-Signature` (the device id is a stable identifier tied to an account). Fixed: both headers are deleted by the access-log filter.
- Fixed: `request_body /replays* { max_size 51MiB }` caps replay uploads at the proxy (50 MiB plus the multipart envelope); not validated with `caddy validate` here (Docker was not running).
- OK: `infra/caddy/Caddyfile:2-10` sets HSTS, nosniff, X-Frame-Options DENY and Referrer-Policy.

## Server (mod API)

Code review of the mod endpoints in `apps/web/server`.

| Id | Severity | Finding | Status |
| --- | --- | --- | --- |
| H1 | High | ReDoS: the NaN/Infinity fallback regex in `lib/replay/header` used a lookbehind with `\s*` (quadratic; 80k spaces took 53 s) and ran for every JSON block, synchronously, in `POST /replays` and `/replays/mod` | Fixed: the fallback parses with `json5` and a reviver that turns non-finite numbers into `null` (linear, leaves strings alone); blocks stay capped at `REPLAY_CONTAINER.maxHeaderBytes` (2 MiB). Regression tests: a 2 MiB whitespace block parses or fails in under 1 s. Parsing stays on the request thread (a worst-case 2 MiB block is ~0.3 s); moving it to a worker thread is deferred |
| M1 | Medium | `ModIngestWriterService.ingest` and `ModBindWriterService.bind` ignored deletion requests; opening one left the mod devices active | Fixed: ingest answers 403 `device_revoked` and bind 403 `account_mismatch` for a blocked account (existing contract codes); `PurgeGuardService.open` revokes the account's active devices; revoked `mod_device` rows are deleted 30 days after `revoked_at` (`RETENTION.rules`, documented in docs/guides/server/collector.md). Unit and db tests |
| M2 | Medium | Replay uploads were buffered in memory (multer memory storage, 50 MiB) before the signature check, with no concurrency limit | Fixed: multer spools to `REPLAY_UPLOAD.tempDir` (os tmpdir), `ReplayFileInterceptor` removes the file when the request ends (success, error or multer failure) and allows `REPLAY_UPLOAD.concurrency.perOwner` (2) uploads at once per user / device / address (Redis counter with a TTL, 429 past it); Caddy caps the body. The 50 MiB cap stays: it is a `const` in `contract/replay-upload.schema.json` (real replays are 1–5 MB; lowering it needs a contract change with the modpack). The HMAC of a mod upload is still computed after reading the spooled file into memory, bounded by the concurrency limit |
| L2 | Low | Noted by the review | Noted, no change |
| L3 | Low | The per-device throttle bucket was keyed on the unauthenticated `X-Otmetki-Device` header, so a stranger naming a device drained its bucket | Fixed: `modDeviceTracker` keys on device + address (/64 for IPv6); the per-address throttle still caps forged ids |
| L4 | Low | The bind failure counter was read-then-incremented (parallel guesses slipped through) and keyed on the raw IPv6 address | Fixed: INCR (+EXPIRE in one MULTI) before the code check, refused past the cap, cleared on success; the key uses the /64 |
| L5 | Low | Noted by the review | Noted, no change |
| L6 | Low | `arena_type_id`, `bonus_type`, `gui_type`, `finish_reason` and `queue_time_s` had no maximum (`queue_time_s` × 1000 overflows the int4 `queue_time_ms`, a 500) | Fixed: `MOD_BATTLE_LIMITS.arena` and `queueSeconds` (86 400) in the Zod schema, the same maxima in `apps/game/modpack/contract/ingest.schema.json` |
| L7 | Low | One webhook dedupe key per mark: a mod-reported mark suppressed the collector's `mark.gained` | Fixed: `markGainedKey` includes the source (`mod` / `api`) |
| L8 | Low | The mod-reports daily cap was INCR then EXPIRE in two calls (a crash between left a key without TTL), and the reporter hash used `BETTER_AUTH_SECRET` directly | Fixed: `SET NX EX` + `INCR` + `TTL` in one MULTI; the hash key is derived with HKDF-SHA256 (`MOD_REPORTS_API.keyDerivation`) |
| L9 | Low | `Not a readable replay: <parser message>` and the middleware-4xx branch of `AllExceptionsFilter` echoed internal error text | Fixed: a fixed message with code `REPLAY_INVALID`; middleware client errors answer the HTTP status text |

## Manager

Fixed in manager 0.4.3 (`apps/game/manager/tauri/src`):

| # | Severity | Finding | Fix |
| --- | --- | --- | --- |
| 1 | High | `hangars/packed_xml.rs`: element children were parsed from the whole buffer, children could alias one offset, no depth or node limit: a crafted packed XML in another mod caused exponential work or a stack overflow; `ClientFiles::copy` had no size cap | Fixed: each child element is parsed from its own sub-slice (an element child needs at least its header, so siblings never overlap), `MAX_DEPTH` 64, `MAX_NODES` 2^20, `copy` capped (`generate::MAX_COPY_BYTES`, 256 MiB). Tests: aliasing bomb, depth, node budget, single-byte corruption sweep, copy cap |
| 2 | Medium | `OTMETKI_API_URL`, `OTMETKI_STATE_ROOT`, `OTMETKI_ROAMING_ROOT` honoured in release builds; `is_trusted_url` trusted any URL under the API base, http included | Fixed: the overrides are read only in debug builds (`releases::debug_env`); a URL under the API base must be https, except a loopback host in a debug build |
| 3 | Medium | Catalogue previews downloaded without a hash | Fixed: setupkit writes `previewSha256` (`{file: sha256}`) into `components.json` (covered by the signed catalogue sha256); the manager downloads only listed previews, verifies before writing, re-downloads an altered one. Previews of releases built before this have no hashes and are not downloaded |
| 4 | High | Deletions relied on a length check (`ensure_removable`) and parent-name matching; `in_mod_folders` accepted `<client>\mods\..\file`; `recover_commit` deleted any file a planted `commit-journal.json` named | Fixed: `fsx::ensure_within(path, roots)` (absolute, no `.`/`..`, lexical and canonical containment); `ensure_removable` rejects `..`; `in_mod_folders` requires containment; `recover_commit` takes the client's mod roots (from the manifest at start, the touched folders in a commit) and skips entries outside them |
| 5 | Medium | Profile import used a denylist: a `TM1.` code from a stranger could switch on hangar actions or view overrides and carry unknown keys or sections | Fixed: `profiles::imported_data` keeps only config keys and component sections (and their keys) the current `config.json` / `components.json` already have with the same JSON type, plus `hud_layout_places`; never the mod's code-excluded switches and sections (`hangar_auto_reserves`, `hangar_auto_resupply`, `hangar_depot_seller`, `hangar_cleaner`, `hangar_notification_filter`, `battle_chat_filter`, `auto_reserves`, `auto_resupply`, `depot_seller`, `notification_filter`, `chat_filter`, `hangar_tweaks.quick_actions`); the base exclusions mirror the mod (`enabled`, `user_set`, `defaults_revision`, `share_session_report`, `show_pack_badge`, `settings_window`); applying writes only keys `config.json` already has |
| 6 | High | The device secret was stored in plaintext in the game folder and `%APPDATA%`, and «Собрать логи» bundled files unredacted | Fixed: shared format with the mod: the game-folder `credentials.json` keeps `{device_id, account_id}`, `%APPDATA%\TriOtmetki\credentials.json` adds `secret_dpapi` (base64 of `CryptProtectData`, entropy `triotmetki-device-v1`, `CRYPTPROTECT_UI_FORBIDDEN`, current user; `windows-sys`); a legacy plaintext `secret` is read once and both files are rewritten; plaintext is never written. The report `Redactor` takes the known secrets as literal rules, and `logs::collect` redacts every bundled file |
| 7 | Medium | The release signature did not cover the notes and had no freshness: an old signed release could be replayed and the shown notes changed | Fixed: payload format 2 adds `notes <sha256(ru)> <sha256(en)>` (producer: `releasePayload` in the server's `modpack-releases/lib/release-build`); the sequence is the signed `timestamp:` of the minisign trusted comment, kept per client version (`release-sequences.json`), an older one is refused; an offered release older than the installed modpack is logged and «Обновить модпак» refuses it. Format 1 is still accepted (`ACCEPT_LEGACY_PAYLOAD`) for the published releases; the minisign legacy algorithm is now test-only. Rollout: [docs/ops/deploy.md «Release payload format 2»](../ops/deploy.md#release-payload-format-2) |

Deferred:

- Low: one minisign key signs the manager's self-update and the modpack releases, and `release.yml` uploads to the VPS with an SSH password. Recommendations in [docs/ops/deploy.md](../ops/deploy.md#recommendations-not-done-yet); no code change.
- Managers up to 0.4.2 verify only payload format 1, so they refuse the first modpack release signed in format 2 until they self-update to 0.4.3.

## Not yet covered

- Modpack (beyond the section above): TM1/TS1 zlib limits, pickle use, the page→Python command dispatch, hangar_looks paths.
- Manager: Tauri CSP and capabilities, the updater, third-party dependencies, zip-slip and ownedPatterns, junctions, deep links.
- Server: everything outside the mod endpoints in the section above.
