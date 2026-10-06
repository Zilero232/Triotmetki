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

## Round 2 (2026-10-06)

An independent read-only review of the round-1 fixes (the uncommitted tree on `main`), plus a search for anything round 1 missed. The scope is the same: modpack transport, signing, credentials, server_url pinning, TM1 import, the page→Python protocol, rich text, the replay header, pack_badge, hangar previews and looks; in the manager, packed XML, credentials, release signatures and sequences, previews, `ensure_within`, the profile allowlist, log redaction, capabilities and CSP; on the server, the mod endpoints, replay upload, the json5 header fallback, mod-badges, mod-reports and error replies; the Caddyfile; dependency overrides. No code was changed.

There is no Critical or High finding. The three Medium findings are about the fixes breaking normal use, not about an attacker.

### Tools

- `bun audit` (bun 1.3.1, reads `bun.lock`): 3 advisories, the same as after the round-1 pass:
  - braces <=3.0.3 (high; build/dev tooling; no fixed release);
  - sprintf-js <=1.1.3 (moderate; `ioredis-mock` in tests);
  - katex <0.18.2 (low; `@eslint/markdown`; lint only).

  All Low. The local `node_modules` does not match the lockfile, though (R2-L4).
- `cargo audit --file apps/game/manager/tauri/Cargo.lock`: no vulnerabilities. The same 8 allowed warnings as in round 1, all Low: proc-macro-error and the unic-* crates are unmaintained, glib 0.18.5 is unsound (Linux only), yoke-derive 0.8.3 is yanked.
- `caddy validate` could not run: there is no caddy binary and Docker was not running. The `request_body /replays* { max_size 51MiB }` syntax is valid Caddyfile. By Caddy's directive order it runs before `reverse_proxy`, and it covers `POST /replays` and `POST /replays/mod`.
- Measured on CPython 2.7.18, the client's version: `json.loads('[1,' + '9'*1000000 + ']')` takes 4.5 s, and 300 000 digits take 0.36 s. The integer conversion is quadratic. This is the basis for R2-L1.

### Findings

| Id | Severity | Finding | Evidence | Exploit / failure scenario | Fix |
| --- | --- | --- | --- | --- | --- |
| R2-M1 | Medium (availability, fix regression) | Manager 0.4.3 rewrites the binding into the split DPAPI format, and every published modpack (core ≤0.9.3) cannot read that format. The rewrite happens on a status poll. The old mod is left without a secret and stops sending. If the player rebinds in the old mod, it writes a plaintext `secret` again, and the manager strips it again on its next poll, so the two loop. | `apps/game/manager/tauri/src/credentials/mod.rs:134-136` (stale on plaintext) and `:162-168` (`load()` rewrites). `load()` is called from `service/sync.rs:64,95,105,118` (`account_link`, `sync_status`, which the UI polls) and from `service/report.rs:33`. The published mod reads only `data.get('secret')` (`git show HEAD:apps/game/modpack/packages/companion/binding/__init__.py`: `Credentials.from_dict` and the single-file `CredentialStore(storage)`). `docs/ops/deploy.md` «Release payload format 2» asks for manager 0.4.3 to ship before or with the modpack, so the window is planned. | The player self-updates the manager, or the modpack release is still «Waiting» after a game patch. The next manager screen rewrites both `credentials.json` copies. The old mod reads the newer game-folder copy, finds no secret and shows «not bound». Ingest, badges and replay upload stop. | Ship the reader before the writer: release core 0.9.4, which reads both formats, first. Let the manager migrate only when the installed core is ≥0.9.4 (it can read the manifest), or keep the plaintext copy until then. Do not migrate from a read path the UI polls; migrate on bind or in an explicit start-up step. The reverse case also exists: manager ≤0.4.2 with core 0.9.4 loses its site-sync binding until the manager updates (no loop there). |
| R2-M2 | Medium (availability) | The mod's TLS now fails closed, but its trust anchors come only from the Windows certificate store, as Python sees it. Python 2.7's `load_default_certs()` lists only the roots already present in the `ROOT`/`CA` stores. Windows adds most roots on demand when CryptoAPI builds a chain, and Python never triggers that. Caddy's default issuer is Let's Encrypt (ISRG Root X1, and X2 for ECDSA chains). On a fresh or locked-down Windows without that root, every request of the mod fails, and this is logged only once at start. | `apps/game/modpack/packages/core/net/transport/tls.py:10-20,31-39` (`create_default_context()` only) and `packages/core/client/transport/__init__.py:10-13`. `apps/game/modpack/README.md:927` marks this as UNVERIFIED. | No attacker is needed. Some share of players silently never bind or never upload. | Bundle the API's issuer roots (ISRG Root X1 and X2 as PEM, a few KB, in a constant) and load them with `context.load_verify_locations(cadata=...)` next to the system store. Keep them in step with the certificate Caddy obtains, or pin Caddy's issuer to Let's Encrypt in the Caddyfile so the set is known. Show «TLS unavailable» in the settings window, not only in the log. |
| R2-M3 | Medium (availability, fix regression) | Through the release sequence store, an older signed release fails the whole update check: `latest()` returns `SignatureInvalid` instead of «no update». A planned rollback (pulling a broken release and re-publishing the previous version's entry) therefore breaks «check for updates» with a signature error on every manager that saw the newer release, until that entry is re-signed. The deploy guide does not say to re-sign on rollback. The freshness check also protects only from first contact: the store is keyed by the queried client version, so after each game patch the first offered release is trusted with no history. An older release whose `games` pattern still matches can be replayed once. | `apps/game/manager/tauri/src/releases/mod.rs:257-261` (`?` on `remember`), `releases/sequence.rs:17-31,53-63`, `docs/ops/deploy.md:202-204`. | The owner rolls back from 0.3.6 to 0.3.5 in `releases.json`. Every manager that fetched 0.3.6 now errors on every check. | Treat an older sequence as «keep what is installed, no update»: log it and return the status without the release, instead of an error. Add to `deploy.md` that a rollback needs a new signature (re-run `tauri signer sign` on the old payload). Optionally key the store by modpack line instead of client version, so a game patch does not reset it. |
| R2-L1 | Low | CPython 2 converts JSON integers in quadratic time. The header parser hands up to 1 MiB (block 0) and 4 MiB (block 1) to `json.loads` on the game thread. A replay with one long run of digits freezes the client for about a minute (4 MiB ≈ 70 s by the measured curve). The replay manager indexes new files on the main thread, and its time budget cannot split a single file. TM1 codes unpack to at most 1 MiB, which costs about 4.5 s. | `apps/game/modpack/packages/core/replay_file/header.py:45-49,52-70`; `constants.py:9` (the 1 and 4 MiB caps); `features/replay_manager/model/library.py:94-104` (main-thread index); `packages/ui/profiles/codec.py:42-47` with `constants.py:59`. | The player saves a replay downloaded from a replay site into the replays folder and opens the hangar. The client hangs. | Pass `parse_int` (and `parse_float`) to `json.loads` with a guard that refuses literals longer than about 32 characters, or reject a block that matches `\d{64,}` before parsing. Do the same in `ui/profiles/codec.py`. Optionally index headers on the `BackgroundRunner`. |
| R2-L2 | Low (fix regression) | Both credential stores drop an entry whose `secret_dpapi` does not open, then rewrite both files without it, because the game-folder half no longer matches. A transient DPAPI failure therefore erases the binding for good instead of leaving it for the next start. Examples: a roaming profile that has not synced yet, the user's master key lost after an admin password reset, a ctypes failure. The rewrite also drops `bound_at`, so the manager's `find(None)` no longer picks the most recently bound account. | Mod: `apps/game/modpack/packages/companion/binding/__init__.py:109-131` (`stale` when `set(public) != set(stored)`, then `_persist`), `:136-151` (no `bound_at`). Manager: `credentials/mod.rs:113-136`, `:150-158` (`public_entry` has no `bound_at`), `:171-173` (sort by `bound_at`). | The player logs in before the roaming profile finishes syncing. The binding is gone and a rebind is needed. | Mark the files stale only for plaintext or extra public fields. Leave private entries that do not open untouched, together with their public half. Keep `bound_at` in both halves; it is not secret. |
| R2-L3 | Low | The replay upload concurrency slot is keyed on the unauthenticated `X-Otmetki-Device` header, and the guard in front of it does not verify the request. `identify` checks only that the device exists, that it is not revoked, and that the signature header has the right shape. Device ids sit in the game-folder `credentials.json` (the public half, by design), which players zip and share. With one leaked id, a stranger can hold both slots of that device: the owner gets 429 for up to the 600 s TTL, and every new request refreshes the TTL. Each request also makes the server spool 50 MiB to disk and then read it into memory before the HMAC check fails. | `apps/web/server/src/modules/replays/guards/mod-device.guard.ts:15-24`, `modules/mod/services/mod-device.service.ts:33-49` (`identify`), `replays/interceptors/replay-file.interceptor.ts:50-60,68-81`, `services/replay-upload-writer.service.ts:40-42`. | Slow uploads carrying a victim's device id, sent from rotating addresses. The victim's mod cannot upload replays. | Key the slot on device + address /64, like `modDeviceTracker`. Better: have the mod sign a header with the file's sha256 and size (it already signs `x-otmetki-visibility`), and verify it before multer spools the body. Add Caddy server timeouts (`read_body`) against slow bodies. |
| R2-L4 | Low | The local dependency tree does not match `bun.lock`. `centrifuge` still links protobufjs 6.11.6, `satori` links fflate 0.7.3, and `concurrently` links shell-quote 1.9.0. The old store folders date from 2026-09-25; protobufjs 7.6.6 was added today, but the packages that depend on it were not relinked. `bun audit` reads the lockfile, so it reports clean. | `node_modules/.bun/centrifuge@2.8.5/node_modules/protobufjs` → `protobufjs@6.11.6`, `satori@0.33.5/node_modules/fflate` → `fflate@0.7.3`, `concurrently@10.0.5/node_modules/shell-quote` → `shell-quote@1.9.0`. `bun.lock` lists only protobufjs 7.6.6, fflate 0.8.3 and shell-quote 1.12.0. | Tests and local runs use the old versions, so the overrides are not tested here. Production images are correct only if their fresh `--frozen-lockfile` install links the overridden versions (UNVERIFIED). | Reinstall (`rm -rf node_modules && bun install`) and rerun the server tests: protobufjs 6→7 is a major version bump for centrifuge. Check the built server image with `bun -e "console.log(require.resolve('protobufjs/package.json',{paths:[require.resolve('centrifuge')]}))"`. |
| R2-L5 | Low | `ensure_within` counts a path whose canonical form cannot be resolved as inside (`_ => true`). For a path whose parent does not exist yet, a junction further up is not detected, and the `create_dir_all` in `write_atomic` follows it. | `apps/game/manager/tauri/src/fsx/mod.rs:144-153`. | Needs a local attacker who can already write into the client's `mods` folder. | Canonicalise the nearest existing ancestor instead of only the parent, and fail closed when the root itself does not canonicalise. |
| R2-L6 | Low (privacy) | `POST /mod/badges` answers for any 100 account ids, not only those in the caller's arena. A bound device can therefore enumerate which accounts show the badge. The badge is opt-in, and the endpoint is throttled per device + address. | `apps/web/server/src/modules/mod-badges/mod-badges.controller.ts:31-35`, `services/mod-badges-reader.service.ts:16-41`. | A scripted lookup of a clan roster. | Acceptable for an opt-in public badge. If not, rate-limit per account per day, or require the arena id and check it against the device's recent battles. |
| R2-L7 | Low | Smaller points, each with its fix:<br>- The concurrency counter can be `DECR`ed after its TTL expired, which leaves a negative key with no TTL (`replay-file.interceptor.ts:65`). Fix: decrement in Lua only if the key exists.<br>- `409 REPLAY_DUPLICATE` reveals that a given replay file was uploaded, private replays included (`replay-upload-writer.service.ts:76-80`).<br>- The bind failure counter is per address only, so one abuser behind a CGNAT locks binding for everyone behind it (`mod-bind-writer.service.ts:57-63,95-96`).<br>- Python's `$` accepts a trailing newline in `RELEASE_VERSION` and `PROFILE_SLUG_RE` (`update_notice/model/constants.py:19`, `settings_share/constants.py:26`). Fix: use `\Z`.<br>- The manager's changelog view (`/modpack/changelog`, `changes[].notes`) is unsigned. It is rendered as text, so only its integrity is at stake. | In the finding | — | In the finding |

### Checked and fine

- **Transport:**
  - Redirects: `_RefuseRedirects.redirect_request` returns None, so urllib2's default error handler raises the 3xx as `HTTPError` and the signed headers never follow the redirect.
  - Size caps: `read_capped` caps both success and error bodies.
  - Plain http goes only to `localhost`/`127.0.0.1`, and https through a system proxy still verifies the target host.
  - There is no other network path (`fetchURL`, sockets, subprocess, pickle, `eval`) in `packages/` or `features/`.
- **`server_url`:** every reader goes through `Config.server_url` (`companion/config/__init__.py:94-104`), including the settings window's site links (`ui/bridge/links.py`, where `SAFE_PATH` uses `\Z`). Turning on the dev install (a planted `mods/*/otmetki-dev/otmetki-dev.json`) needs write access to `mods`, which already means code execution.
- **Page→Python:** `decode_message` admits only the names in `COMMANDS` before `getattr(self, '_on_' + type)`, with a 64 KiB cap. `set`/`set_many` work only for `editable` keys, and `server_url` and `bind_code` are hidden.
- **Rich text:** the tag, attribute and entity regexes are linear, `img` is allowed only with the `img://` scheme, and code points are clamped.
- **pack_badge:**
  - The request carries numeric ids only and skips bots, anonymised players and the own account.
  - The server answers only for accounts that opted in and are active, not revoked and not hidden.
- **Hangar previews:**
  - Keys and file names are checked against regexes.
  - The data URIs are base64 of the PNG file.
  - The BMP reader checks `offset + stride * height` against the buffer.
- **Hangar looks:** every path taken from client files goes through `join_relative`, which rejects `..` and `:`, and the generated files live inside the zip.
- **Manager:**
  - Packed XML parses each child from its own sub-slice, with depth and node budgets, so parsing is linear.
  - TM1 inflate is capped at 4 MiB and TS1 at 256 KiB, and serde_json's recursion limit applies.
  - The profile import allowlist and the code exclusions match the mod's.
  - Previews are downloaded only when listed with a sha256, and are verified before writing.
  - The CSP has no `unsafe-eval`, the asset scope is only the previews folder, and `opener` is limited to listed hosts.
  - A deep-link profile import goes through the allowlist and does not activate the profile.
  - Release signatures:
    - The signature covers the version, games, catalogue, notes and packages.
    - minisign's global signature covers the trusted-comment timestamp, and `tauri signer sign` writes `timestamp:`.
  - reqwest 0.13 uses the platform verifier.
- **Server:**
  - Request signing:
    - The HMAC covers the method, path (without the query), timestamp, nonce, signed headers and body.
    - It is verified before the freshness check and the nonce `SET NX`.
  - Uploads:
    - multer 2.4.0 removes partial files on a limit, an abort and busboy errors.
    - `finalize` removes the spooled file on success and on handler errors.
  - Replay header parsing:
    - `json5` 2.2.3, which includes the prototype-pollution fix, runs only after `JSON.parse` fails, and its reviver turns non-finite numbers into null.
    - The remaining `arenaUniqueID` regex is linear, and the packet stream inflate is capped.
  - Mod error replies are contract codes or status texts.
  - `trust proxy` is one hop behind Caddy, which overwrites `X-Forwarded-For`.

### Round-1 status

| Round-1 id | Status | Where |
| --- | --- | --- |
| Deps: JS overrides | Fixed locally (R2-L4) | The lockfile is correct (`package.json` `overrides`, `bun.lock`), and the local `node_modules` is relinked to it; the production image is UNVERIFIED |
| Deps: Rust, Python host tooling | Fixed / unchanged Low | `cargo audit` is clean; `--require-hashes` at `.github/actions/setup/action.yml:32` |
| Modpack M1 (TLS, redirects, caps) | Fixed, with an availability risk (R2-M2) | `core/net/transport/exchange.py:19-35,36-40`, `tls.py:10-52` |
| Modpack M2 (DPAPI split) | Fixed, with regressions (R2-M1 across versions, R2-L2) | `core/durable/dpapi.py`, `companion/binding/__init__.py:98-187` |
| Modpack M3 (server_url pinning) | Fixed | `companion/config/__init__.py:29-45,94-104`, `config/dev.py:16-22`, `app/client/__init__.py:97` |
| Modpack M4 (pack_badge privacy) | Accepted, verified | `features/pack_badge/model/__init__.py:35-53` |
| Modpack L1 (TM1 code exclusions) | Fixed | `ui/profiles/snapshot.py:37-60`, `constants.py:35-55` |
| Modpack L2 (server text) | Fixed (trailing-newline nit in R2-L7) | `binding/messages.py`, `binding/constants.py:14-23`, `settings_share/__init__.py:73`, `update_notice/model/__init__.py:74` |
| Modpack L3 (rich text) | Fixed | `ui-web/src/shared/lib/rich-text/rich-text.ts:19-25`, `core/format/markup.py:17-42`, the error boundary in `ui-web/src/views/hud/ui/HudOverlay.tsx` |
| Modpack L4 (replay header) | Partial (R2-L1) | `core/replay_file/header.py:45-49` catches `RuntimeError`, but the quadratic integer parsing remains |
| Modpack L5 (pre-bind GETs) | Accepted | A documented exception |
| Modpack L6 (response size) | Fixed | `exchange.py:36-40` |
| Modpack L7 (hashed requirements) | Fixed | `.github/actions/setup/action.yml:32` |
| Infra: log redaction | Fixed | The access_log filter in `infra/caddy/Caddyfile` deletes `X-Otmetki-Device` and `X-Otmetki-Signature` |
| Infra: replay body cap | Fixed (not validated with caddy) | `request_body /replays*` in `infra/caddy/Caddyfile` |
| Server H1 (ReDoS) | Fixed | `lib/replay/header/header.ts` (json5 fallback), `header.constants.ts` (linear regex), `container/container.constants.ts` (2 MiB) |
| Server M1 (deletion requests) | Fixed | `mod-ingest-writer.service.ts:67-73`, `mod-bind-writer.service.ts:105-108`, `collector/purge/services/purge-guard.service.ts:30-38` |
| Server M2 (upload spooling, concurrency) | Fixed (the R2-L3 gap is closed) | `replays/config/upload.constants.ts`, `interceptors/replay-file.interceptor.ts`, `interceptors/mod-replay-file.interceptor.ts` |
| Server L3 (device tracker) | Fixed | `mod/lib/device-tracker/device-tracker.ts` |
| Server L4 (bind failure counter) | Fixed (the R2-L7 per-address lockout is replaced) | `mod-bind-writer.service.ts`, `mod/lib/bind-attempts/bind-attempts.ts` |
| Server L6 (battle limits) | Fixed | `mod/config/battle-payload.constants.ts:19`, `lib/contract/contract.schemas.ts` |
| Server L7 (mark dedupe key) | Fixed | `markGainedKey({ source })` in `collector/tracking/services/tracking-announce.service.ts:34` |
| Server L8 (mod-reports cap, HKDF) | Fixed | `mod-reports/services/mod-reports-writer.service.ts:47-56`, `lib/report-files/report-files.ts:16-17` |
| Server L9 (error text) | Fixed | `common/filters/all-exceptions/all-exceptions.filter.ts`; the fixed `REPLAY_INVALID` message in `replay-upload-writer.service.ts:72-74` |
| Manager 1 (packed XML, copy cap) | Fixed | `hangars/packed_xml.rs:209-250`, `hangars/generate.rs:20,442` |
| Manager 2 (debug-only overrides, https) | Fixed | `releases/mod.rs:120-130,176-187`, `paths/mod.rs:22-33` |
| Manager 3 (preview hashes) | Fixed | `previews/mod.rs:33-50,84-101` |
| Manager 4 (`ensure_within`, journal) | Fixed, minor gap (R2-L5) | `fsx/mod.rs:126-160`, `components/mod.rs:252`, `patch/stage.rs:194-217` |
| Manager 5 (profile allowlist) | Fixed | `profiles/mod.rs:61-101,380-406` |
| Manager 6 (DPAPI, log redaction) | Fixed, with regressions (R2-M1, R2-L2) | `credentials/mod.rs`, `credentials/dpapi.rs`, `logs/mod.rs:60-68`, `service/report.rs:32-37` |
| Manager 7 (payload format 2, sequence) | Fixed, with an availability risk (R2-M3) | `releases/signature.rs:33-98`, `releases/sequence.rs` |

### Round-2 fixes: server and dependencies

| Round-2 id | Status | What changed | Where |
| --- | --- | --- | --- |
| R2-L3 | Fixed | Before the body is read, the guard checks the device (it exists and is not revoked), the signature header shape, the timestamp skew and the nonce shape. A stale request gets 428 before spooling. The upload slot taken before the signature check is keyed on device + address (IPv4, or IPv6 /64), so a stranger who knows a device id holds only the slots of their own address. After multer spools the file, the HMAC is streamed over the spool file (the signed prefix, then the file bytes). It is compared, and the nonce is spent, before the file is read into memory or parsed. Only then is a per-device slot taken, which caps verified uploads across addresses. The HMAC is not computed while spooling: multer's disk storage handles aborts and Windows file locks, and a custom storage engine would have to repeat that. Hashing after spooling gives the same security, because the signature covers the whole file and cannot be checked before the last byte arrives. The cost is one extra sequential read from disk. Checking the signature before spooling would need a signed sha256 header from the mod (a contract change). | `replays/guards/mod-device.guard.ts`, `replays/interceptors/mod-replay-file.interceptor.ts`, `replays/lib/replay-file/replay-file.ts` (`fileDigest`), `mod/services/mod-device.service.ts` (`assertSignable`, `signer`, `authenticateDigest`), `mod/lib/request-signature` (`signedPrefix`), `common/lib/hmac` (`matchesSignatureHeader`) |
| R2-L4 | Fixed locally | `bun install` reported «no changes» and did not relink. `bun install --force` did. centrifuge now resolves protobufjs 7.6.6. satori, fast-png, three-stdlib, @types/three and @shuding/opentype.js resolve fflate 0.8.3, and concurrently resolves shell-quote 1.12.0. The full vitest run passes on the relinked tree. The old store folders (protobufjs 6.11.6, fflate 0.6.11/0.7.3, shell-quote 1.9.0) remain on disk, but nothing links them. The production image is still UNVERIFIED (check it with the `require.resolve` command from the finding). | `node_modules/.bun` |
| R2-L6 | Mitigated (opt-in model kept) | The server cannot verify a roster, so every device gets a daily cap: at most 3000 distinct account ids per Moscow day, which is about 100 battles of 29 other players. Past the cap it gets 429 `rate_limited` with `Retry-After` until midnight. The count is a Redis set per device and day of truncated HMACs (server secret, day, id). Ids cannot be read back from it or linked across days, and the set expires after two days. A scripted lookup now costs one bound device per 3000 accounts a day, and binding needs a site account with a linked Lesta account (at most 5 devices each). | `mod-badges/services/mod-badge-quota-writer.service.ts`, `mod-badges/lib/badge-quota`, `MOD_BADGES_QUOTA`, documented in `docs/specs/2026-10-06-modpack-user-badge.md` §4 |
| R2-L7: negative counter | Fixed | The slot claim and release are Lua scripts. The claim does INCR + EXPIRE and undoes itself past the limit. The release decrements only above 1 and otherwise deletes the key, so an expired key never goes negative or loses its TTL. | `replays/lib/upload-slot` |
| R2-L7: 409 reveals a replay | Fixed for the owner, generic otherwise | A repeat upload by the same user (site or mod) gets 201 with the stored replay's id and status. The mod treats that as done, as before. A file that another user stored still gets `409 REPLAY_DUPLICATE`, the status the mod treats as done (`DONE_STATUSES = (409,)`), now with a generic message («The replay cannot be stored») and without the other upload's id, owner or visibility. Only someone who holds the exact file bytes can see that it exists, and on `/replays/mod` the replay must have been recorded by the device's account (`replay_not_owned` comes first). | `replays/services/replay-upload-writer.service.ts` |
| R2-L7: bind lock behind CGNAT | Fixed | Failures are counted per address (IPv4, or IPv6 /64) and per named account: 10 per 15 minutes. Another player behind the same address who binds another account is never locked out. Each account also has a cooldown of 20 failures per 15 minutes across all addresses, which stops a distributed guess at one victim. Counters run in order, so one locked address stops adding to the account counter and cannot lock the account alone. A request that names no account keeps the strict per-address counter. Brute force stays infeasible. A guess that names an account succeeds only against that account's single live code (1 in 32^10 ≈ 1.1·10^15). The global per-IP throttle (10 per minute) caps one address at about 14 400 guesses a day, and the per-account cap allows about 1 900 a day at one victim. | `mod/services/mod-bind-writer.service.ts`, `mod/lib/bind-attempts`, `BIND_CODE` |
