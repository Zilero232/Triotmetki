# First production deploy

A checklist for the first rollout of Три отметки to `https://triotmetki.ru` (site) and `https://api.triotmetki.ru` (API, developer API `/v1`, auth, mod ingest). Later deploys are the same workflow run with nothing but the image changes.

What runs where:

- **CI and images.** [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml) is started by hand (`workflow_dispatch`). It runs `verify`, `test`, the mod suite and the e2e smoke (a `gate` job skips either for a git tree that already passed it), builds `ghcr.io/<owner>/otmetki-client` and `otmetki-server`, and then deploys to the VPS.
- **The VPS** keeps no clone of the repo. Every run copies [docker-compose.yml](../../docker-compose.yml) and [infra/caddy/Caddyfile](../../infra/caddy/Caddyfile) into `DEPLOY_PATH`. The files keep their repository paths, because compose bind-mounts `./infra/caddy/Caddyfile`. The run then does `docker compose pull`, runs `bun run db:deploy` in a one-off `server` container, runs `docker compose up -d`, and waits for `otmetki-server` and `otmetki-client` to report healthy.
- **The stack:** Caddy (80/443, Let's Encrypt), then client (Next standalone, :3000), then server (API, :4000).
  - Everything is stored on the VPS: no S3, no CDN, no GitHub Releases.
  - Caddy serves the host folder `DEPLOY_PATH/downloads` (read-only) at `https://triotmetki.ru/downloads/`: the modpack releases, the manager installer and `releases.json`. The server reads the release index from the same folder. [.github/workflows/release.yml](../../.github/workflows/release.yml) fills it (§4).
  - The worker runs from the same server image.
  - Postgres/TimescaleDB listens on loopback `127.0.0.1:5432` only.
  - Redis runs with AOF and `noeviction`.
  - `backup` dumps the database every night (§6).
  - The server and the worker share the `serverdata` volume for uploaded replays, armor models and blog images (`.data/replays`, `.data/armor`, `.data/blog`; the only storage there is).
  - Every container logs to json-file with rotation (10 MB × 5).
  - Caddy takes its hosts from `SITE_DOMAIN` and `API_DOMAIN`: with the defaults (`localhost`, `api.localhost`) it issues itself a local certificate, with real domains it gets one from Let's Encrypt over HTTP-01, so port 80 must stay reachable; HTTP/3 needs `443/udp` published.
  - Everything reads the root `.env`; compose overrides `DATABASE_URL`, `DIRECT_URL` and `REDIS_URL` with the service names. Locally: `docker compose build`, `docker compose up -d`, `docker compose logs -f`.
- **Before the Lesta key:** the same stack runs on an empty database with no mock and no generated data; every page shows its empty state. See [§7 «Запуск без ключа Лесты»](#7-запуск-без-ключа-лесты-before-the-lesta-key).

### CI workflows

- **deploy.yml**: every check runs before any image is built, so an image is never pushed from a tree that would fail. The `gate` job keys a cache marker on the git tree hash: a tree that already passed `checks` or `e2e` skips that job on the next run. Lint, tsc, the Next build and the Playwright browser are cached as well.
- **release.yml**: §4. Before it builds anything it runs the modpack suite on Python 2.7.18 (the client's version; its compiler is the syntax guard) and ruff, and the manager's UI typecheck and Vitest, `cargo fmt`, clippy and the Rust tests on Windows. The manager's contract test fails when `tauri/contract/*.json` no longer matches the serialised commands; refresh it locally with `OTMETKI_UPDATE_FIXTURES=1` and commit.
- Every tool comes from the root `mise.toml` through `.github/actions/setup` (`tools: rust` / `ruff`, `python: 'true'` for the modpack's Python 2.7 and its packages).

## 0. Go-live checklist

This is the status of every area at the last audit. **Ready** means the piece is in the repo and was checked. **Blocked** means it waits on you: an account, a key, a document or a decision.

| Area | Status | What is left |
|---|---|---|
| Images (client, server/worker): multi-stage, non-root, HEALTHCHECK | Ready | — |
| Compose: restart policies, volumes, log rotation, loopback-only Postgres, Redis AOF + `noeviction` | Ready | — |
| TimescaleDB extensions, hypertables, policies (`db:deploy`) | Ready | — |
| Schema sync without data loss (`prisma db push` without `--accept-data-loss`) | Ready | — |
| Caddy: TLS for both hosts, HSTS, security headers, zstd/gzip, SSE excluded, bull-board 404 | Ready | DNS (below) |
| Client CSP, sitemap, robots, service worker revision (`GIT_COMMIT_SHA`) | Ready | The `NEXT_PUBLIC_SITE_URL` secret |
| Nightly `pg_dump` with rotation | Ready | An off-host copy (§6) |
| Launch without the Lesta key: empty states, degraded worker, the runtime `LESTA_NOTICE` switch | Ready | — |
| Health: `/health` (database, Redis, worker heartbeat, Lesta breaker, last job successes, queue backlog, API version; contract `healthSchema`), shown on the site's `/status` | Ready | An external uptime monitor on `https://api.triotmetki.ru/health` and `https://triotmetki.ru/` (UptimeRobot, Healthchecks.io or similar) |
| **Lesta application**: `LESTA_APPLICATION_ID`, the VPS IP allow-listed, the OpenID redirect | Blocked | Register at developers.lesta.ru (§1) |
| **DNS**: `A`/`AAAA` for `triotmetki.ru` and `api.triotmetki.ru`; ports 80, 443/tcp and 443/udp open | Blocked | The registrar and the VPS firewall |
| **GitHub secrets**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `DEPLOY_SSH_HOST`, `DEPLOY_SSH_USER`, `DEPLOY_SSH_PASSWORD`, `DEPLOY_PATH`, `TAURI_SIGNING_PRIVATE_KEY` (+ `_PASSWORD`) | Blocked | Settings → Secrets and variables (§1) |
| **VPS downloads folder** `DEPLOY_PATH/downloads` | Blocked | `mkdir -p` once before the first deploy (§1) |
| **VPS `.env` secrets and switches**: `BETTER_AUTH_SECRET`, `MOD_INGEST_SECRET`, `INTERNAL_API_TOKEN`, `TOKEN_ENCRYPTION_SECRET`, `POSTGRES_PASSWORD`, `BULL_BOARD_PASSWORD`, `LESTA_NOTICE` | Blocked | Generate them on the VPS (§1) |
| ghcr access from the VPS | Blocked | Make the packages public, or run `docker login ghcr.io` with a read-only token |
| **YooKassa**: `YOOKASSA_*`, the webhook | Blocked, not needed for launch | Checkout stays off (`PLUS.checkoutEnabled`) until Lesta confirms the model (§5) |
| **Bots and streamer integrations**: Telegram, Discord, VK, Twitch, DonationAlerts, VK Video Live, YouTube | Blocked, optional | Each one is off while its token is empty |
| **SMTP**: `SMTP_*`, `EMAIL_FROM`, SPF/DKIM | Blocked, optional | Email is off while `SMTP_HOST` is empty. Leave it empty rather than copying the Mailpit values from `.env.example` |
| Web push (`VAPID_*`) | Optional | `bunx web-push generate-vapid-keys` |
| **Legal pages**: operator name, ИНН, ОГРН/ОГРНИП, address, dates, hosting, payments, retention, cookies | Blocked | 13 `<todo>` per language (§5) |
| **Release signing**: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Blocked | One minisign key signs both the manager's self-update and every modpack release the manager installs. `release.yml` refuses to run without it. Its public half must match `plugins.updater.pubkey` in `tauri.conf.json` (§4) |
| Windows code signing of the manager installer | Not set up | The NSIS installer ships unsigned, and SmartScreen warns on the first run |
| Modpack and manager release (`release.yml`) | Ready | Needs the secrets above and the downloads folder; the first release is in §4 |

## 1. Before the first run

### Accounts and external applications

- [ ] **Lesta API: register our own application** at [developers.lesta.ru](https://developers.lesta.ru). Use the **Server** type and add the VPS public IP to the allowed IPs. Put its id in `LESTA_APPLICATION_ID`.
  - Never reuse a key from another project or a personal test key. The limits and the terms ([docs/research/data/lesta-api.md](../research/data/lesta-api.md)) apply per application.
  - Allow the Lesta ID (OpenID) redirect to `https://api.triotmetki.ru/auth/lesta/callback`.
  - `LESTA_RPS` is the total across all processes: 20 per registered IP. Raise it only after you add IPs to the application.
  - Without a key the stack still runs (§7): the worker starts degraded, logs a warning and runs no Lesta jobs, and Lesta ID sign-in is off. There is no mock and no generated data in any environment.
- [ ] **DNS:** `A`/`AAAA` records for `triotmetki.ru` and `api.triotmetki.ru` point at the VPS. Ports 80, 443/tcp and 443/udp are open. Caddy needs port 80 for the HTTP-01 challenge.
- [ ] **Optional integrations.** Every one of these can stay empty; an empty value switches the feature off:
  - Telegram bot (`TELEGRAM_*`; webhook `https://api.triotmetki.ru/telegram/webhook`);
  - Discord application (`DISCORD_*`);
  - VK community, VK Mini App and VK ID (`VK_*`; Callback API `https://api.triotmetki.ru/vk/callback`);
  - Twitch application (`TWITCH_*`; OAuth callback `/streamers/integrations/twitch/callback` on the API);
  - DonationAlerts (`/streamers/integrations/donation-alerts/callback`);
  - VK Video Live and YouTube keys;
  - SMTP;
  - VAPID keys (`bunx web-push generate-vapid-keys`).

  Social sign-in callbacks follow better-auth: `https://api.triotmetki.ru/auth/callback/<provider>`.
- [ ] **YooKassa:** only when checkout opens (see §5). Its webhook goes to `https://api.triotmetki.ru/billing/webhook`.

### GitHub repository secrets

Set these under Settings → Secrets and variables → Actions, in the `production` environment where you can:

| Secret | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.triotmetki.ru`. The value is baked into the client image at build time, so changing it later means rebuilding the image. |
| `NEXT_PUBLIC_SITE_URL` | `https://triotmetki.ru`. Canonical URLs, hreflang, the sitemap and robots.txt are built from it; baked into the client image at build time like the API URL. |
| `DEPLOY_SSH_HOST`, `DEPLOY_SSH_USER`, `DEPLOY_SSH_PORT` (optional, default 22) | the VPS |
| `DEPLOY_SSH_PASSWORD` | SSH password of that user (`PasswordAuthentication yes` in the VPS `sshd_config`) |
| `DEPLOY_PATH` | directory with the compose file, for example `/opt/otmetki` |
| `TAURI_SIGNING_PRIVATE_KEY` | the minisign private key (the whole key file, base64 text) that signs the manager's updates and the modpack releases; `release.yml` only (§4) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | its password; leave it empty for a key without one |

The workflow passes `GIT_COMMIT_SHA=${{ github.sha }}` to the client image by itself. With `NEXT_PUBLIC_APP_VERSION` (the root `package.json` version), it forms the service worker's precache revision. A client built without it (for example a local `docker compose build`) keeps the same revision across builds, so returning visitors keep stale precached files. When you build by hand, export `GIT_COMMIT_SHA=$(git rev-parse HEAD)` first. The server image takes no build arguments.

The VPS must be able to pull from ghcr. Make the packages public, or run `docker login ghcr.io` once on the VPS with a read-only token.

### The VPS `.env` (in `DEPLOY_PATH`)

Start from [.env.example](../../.env.example). The server and worker containers read `./.env` (`env_file`). Compose itself overrides `DATABASE_URL`, `DIRECT_URL` and `REDIS_URL` to reach the containers by name, and forces `NODE_ENV=production` on the server and worker.

- [ ] `NODE_ENV=production`. Once `API_URL` is not a local host, `validateEnv` refuses to boot while `NODE_ENV` is unset.
- [ ] **Secrets.** Generate fresh values with `openssl rand -base64 32`:
  - `BETTER_AUTH_SECRET`: at least 32 characters.
  - `BETTER_AUTH_SECRET` also encrypts the OAuth tokens better-auth stores in `account` (`encryptOAuthTokens`); rotating it makes them unreadable, so social sign-ins re-consent.
  - `MOD_INGEST_SECRET`: at least 32 characters, the root of every mod device key. Rotating it unbinds every device.
  - `TOKEN_ENCRYPTION_SECRET`: at least 32 characters, no default. Encrypts the tokens stored outside better-auth (`user_lesta_account.access_token`, `streamer_integration.access_token` / `refresh_token`). Rotating it makes them unreadable: Lesta links go stale and streamers reconnect their integrations.
  - `INTERNAL_API_TOKEN`: at least 32 characters, no default. Compose passes the same value to the client container (server-only, never `NEXT_PUBLIC_`); the Next server sends it as `x-otmetki-internal-token` with the visitor's IP (`x-otmetki-client-ip`) on every server-side API call, so SSR, prefetches and the entity-presence check are rate-limited per visitor instead of sharing the Next server's bucket. A signed call without a visitor IP (cached renders) gets the separate internal bucket (`THROTTLE.internalLimit`). The API accepts the token only from a loopback/private peer or a `TRUSTED_PROXIES` entry, and Caddy drops the header from its access log. `docker compose` refuses to start without it; rotating it means restarting the client and the server together.
  - In production, the server **refuses to start** when any of these secrets still looks like a development placeholder. The check matches `change-me`, `changeme`, `dev-secret`, `dev-mod-secret`, `test-secret`, `example` or `placeholder` (`ENV_GUARD` in `apps/web/server/src/config/env/env.constants.ts`), so copying `.env.example` unchanged fails loudly.
- [ ] `API_URL=https://api.triotmetki.ru`, `WEB_URL=https://triotmetki.ru`. `CORS_ORIGINS` stays empty unless another origin needs the API.
- [ ] `TRUSTED_PROXIES`: leave it empty for the stock stack. The only hop is Caddy, which sends a single-entry `X-Forwarded-For`, and the default trusts one hop. Once a CDN or load balancer sits in front of Caddy, list its IPs or CIDRs (comma-separated). If you skip that, rate limits and the better-auth IP checks see the proxy's IP as every client's.
- [ ] `DATABASE_POOL_MAX`: leave it unset at first. The API then keeps 10 connections and the worker sizes its pool from its queue concurrency (`WORKER_DATABASE.poolMax`). Set it only when Postgres `max_connections` is tight. The variable applies per process, so the API and the worker each take that many.
- [ ] `POSTGRES_USER`, `POSTGRES_PASSWORD` (strong: use `openssl rand -hex 24`, because the password goes into a connection URL and base64's `/` and `+` break it), `POSTGRES_DB`, `SITE_DOMAIN=triotmetki.ru`, `API_DOMAIN=api.triotmetki.ru`. Compose reads them for Postgres and Caddy.
- [ ] `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL`. Compose interpolates the client's build arguments on every command, so `docker compose` refuses to run while either is missing.
- [ ] `LESTA_NOTICE`: `true` or `false`, required, no default. Server-only (never `NEXT_PUBLIC_`): compose passes it to the client container at runtime, and the Next server reads it per request. `true` shows the site-wide «Данные «Мира танков» пока не подключены» notice and disables the Lesta ID button; set `false` once `LESTA_APPLICATION_ID` is live. A change needs no rebuild: edit `.env`, then `docker compose up -d client`. `docker compose` refuses to run while it is missing, and the client rejects any other value.
- [ ] `LESTA_APPLICATION_ID`, `LESTA_RPS`. An empty key is a supported state (§7).
- [ ] `EMAIL_FROM` on our domain (for example `Три отметки <noreply@triotmetki.ru>`), with SPF and DKIM for the SMTP provider. `VAPID_SUBJECT=mailto:admin@triotmetki.ru`.
- [ ] `BULL_BOARD_PASSWORD`: Caddy returns 404 for `/admin/queues` on the public host anyway. Reach bull-board through an SSH tunnel to the server container.
- [ ] `SMTP_HOST` stays empty unless a real provider is set up. `.env.example` carries the Mailpit values for development.
- [ ] Storage needs no variables: uploaded replays, armor models and blog images live in `.data` on the `serverdata` volume, which the server and the worker share.

### The VPS downloads folder

Create it once, next to `docker-compose.yml`, before the first deploy (Docker would otherwise create it owned by root on the first `up`):

```sh
mkdir -p /opt/otmetki/downloads   # DEPLOY_PATH/downloads
```

Caddy and the server mount it read-only. Only [release.yml](../../.github/workflows/release.yml) writes to it, over SSH as `DEPLOY_SSH_USER`, so that user must own it. Its uploads go first to `DEPLOY_PATH/.downloads-staging/`, which must be on the same disk. Until the first release the folder is empty: `/downloads/*` answers 404, and the API answers `waiting` to every manager.

## 2. Database: `db:deploy` and its order

The deploy first runs `docker compose up -d --wait postgres redis`, so the database is up and healthy even on the very first run. It then runs `docker compose run --rm --no-deps server bun run db:deploy` **before** `up -d`. That script runs three steps, in this order:

1. `bun scripts/timescale.ts --extensions` creates `pg_trgm` and `timescaledb` (the trigram indexes need them before `db push`). It also **drops a stale continuous aggregate**: `tank_daily_stats` carries a comment with the hash of `prisma/sql/timescale/003_continuous_aggregates.sql`. When the stored hash differs or is missing (always the case on the first run), the view is dropped here, so `prisma db push` can change the `tank_battle_delta` columns it depends on.
2. `prisma db push` syncs the schema. There are no migrations before production. A push that would lose data fails instead of running, and the deploy stops before any container restarts.
3. `bun run db:timescale` sets up hypertables, compression, `tank_snapshot_latest`, and the continuous aggregate (recreated, stamped with the new hash, backfilled in full), then applies the retention, compression and refresh policies from `TIMESCALE`. Every statement is idempotent.

`db:push` is the development twin: the same steps plus `prisma generate`. The image already generated the client during its build.

On the first run, or after an edit to `003_continuous_aggregates.sql`, the full backfill of `tank_daily_stats` makes step 3 slower. Keep that in mind for the SSH step timeout on a large database.

## 3. After the first successful run

- [ ] `https://api.triotmetki.ru/health` is green: database, Redis, worker heartbeat, and the Lesta breaker closed. The worker log says `registered N of M … job schedulers`, and no "degraded" warning appears.
- [ ] **Game data.** The API catalog fills from Lesta through the nightly encyclopedia sync. Builds, armor, personal missions and patch diffs need the client files import (`apps/web/server/scripts/gamedata-import.ts`), which needs no Lesta key. Run it once inside the server image and again after every game patch — see §7 «Каталог техники».
- [ ] Optional: `docker compose run --rm server bun scripts/streamers-seed.ts` loads the invited streamer list (`bun --filter @otmetki/server streamers:seed` in development).
- [ ] Sign in with Lesta ID and with Telegram on the live site. Check that the footer shows the Lesta attribution on every page.
- [ ] Check `https://triotmetki.ru/sitemap.xml` and `/robots.txt`. The sitemap reads the API at build or request time, so it fills once the collector has data.

## 4. Game mod: releases on the VPS

Modpack releases and the manager are published by [.github/workflows/release.yml](../../.github/workflows/release.yml) (manual run, nothing to type: the version and the supported clients come from the repository) into `DEPLOY_PATH/downloads`, which Caddy serves at `https://triotmetki.ru/downloads/`:

| Path under `/downloads/` | What | Cache |
|---|---|---|
| `modpack/<version>/` | the split packages, `otmetki.<version>.mtmod`, `catalog/components.json` + `previews/` | a year, immutable |
| `manager/<version>/otmetki-manager_<v>_x64-setup.exe` (+ `.sig`) | the installer the manager's self-update downloads | a year, immutable |
| `otmetki-manager-setup.exe` | the /mod page's primary download (`MOD_DISTRIBUTION.managerUrl` in `apps/web/client/shared/config/site`) | revalidated |
| `otmetki.mtmod` | the /mod page's «скачать пакеты вручную» (`MOD_DISTRIBUTION.packagesUrl`) | revalidated |
| `releases.json` | the release index; the API answers `GET /modpack/releases/latest` and the updater feed from it | revalidated |

There is no directory listing.

**To release:** bump the version, commit, Run. The version is `version` in `apps/game/modpack/package.json` (+ its `## <version>` CHANGELOG entry and the component `VERSION`s that changed) and/or `version` in `apps/game/manager/package.json`; commit, push, run **release** (Actions → release → Run workflow). The run releases whichever of the two `releases.json` does not list yet; with both already published it ends green after `check` with «nothing to release: modpack X and manager Y are already on the VPS».

| What | Single source | Read by |
|---|---|---|
| modpack release version | `version` in `apps/game/modpack/package.json` | the build (`layout.modpack_version()`: the single package `otmetki.<version>.mtmod`, the catalogue's `modpackVersion`), the CHANGELOG test, `modpack-release.ts source` |
| supported clients | `otmetki.games` in the same `package.json` (`["1.45.*"]`; patterns `1.46.*`, `1.46.0.0`) | `modpack-release.ts source` (validated with the release schema) |
| manager version | `version` in `apps/game/manager/package.json` | `tauri.conf.json` (`"version": "../package.json"`), `tauri/build.rs` (`MANAGER_VERSION`), the workflow |

Jobs: `check` (secrets, reads the published `releases.json` and runs `apps/web/server/scripts/modpack-release.ts source`: both versions, the clients, `modpack_needed` / `manager_needed`), then in parallel `modpack` (the modpack suite and ruff, then the `owg_python_compiler` build and the catalogue, only when `modpack_needed`) and `manager` (the UI and Rust checks, then `tauri build`, only when `manager_needed`; the installer carries no modpack files, the manager downloads the catalogue and the packages on the first install), then `publish` (when either is needed: signs the payload with `bunx tauri signer sign`, merges only what was built into `releases.json` with `… index`, uploads to `DEPLOY_PATH/.downloads-staging/` and renames into `downloads/`, `releases.json` last so the index never names a missing file).

Component versions (`VERSION` in `packages/*/version.py` and `features/<id>/__init__.py`) stay separate: the Python 2.7 runtime reads its own and the manager compares them per package. The workflow has no inputs: a published version is never replaced (bump it instead). The run fails before building when a secret is missing, and when the built catalogue's `modpackVersion` differs from that `version`.

### The signing key

One minisign key signs the manager's self-update and each modpack release (the manager checks `signature` over a text payload before it installs anything; [apps/game/manager/README.md «Patches and updates»](../../apps/game/manager/README.md#patches-and-updates-taurisrcpatch-servicecheckrs-background)). Its public half is compiled into the manager twice: `plugins.updater.pubkey` in `apps/game/manager/tauri/tauri.conf.json` and `RELEASE_PUBLIC_KEY` in `tauri/src/releases/signature.rs` (a test keeps them equal).

- The key already exists: `%USERPROFILE%\.tauri\otmetki-manager.key` on the owner's machine, no password. Store the file's contents as the secrets:

  ```sh
  gh secret set TAURI_SIGNING_PRIVATE_KEY --env production < ~/.tauri/otmetki-manager.key
  gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --env production --body ""
  ```

  Or paste them under Settings → Environments → production (PowerShell: `Get-Content $env:USERPROFILE\.tauri\otmetki-manager.key -Raw | Set-Clipboard`).
- Only if it is lost, and only before any manager is installed: generate a new pair and put the public half in both places above.

  ```sh
  cd apps/game/manager
  bunx tauri signer generate -w ~/.tauri/otmetki-manager.key            # asks for a password; Enter for none
  cat ~/.tauri/otmetki-manager.key.pub                                  # -> plugins.updater.pubkey and RELEASE_PUBLIC_KEY
  cargo test --manifest-path tauri/Cargo.toml the_release_key_is_the_updater_key
  ```

  Installed managers trust only the key they were built with: after a key change they neither update themselves nor accept a new release.

#### Release payload format 2

`modpack-release.ts prepare` writes the payload in format 2 (`otmetki-modpack-release/2`): format 1 plus a `notes <sha256(ru)> <sha256(en)>` line (`notes -` without notes), so the changelog text the manager shows is signed too. The anti-replay sequence is the `timestamp:` that `tauri signer sign` puts in the signature's trusted comment (minisign signs it): a manager remembers the highest one per client version and refuses an older release, and refuses to replace an installed modpack with an older version. Managers from 0.4.3 verify format 2 and still accept format 1 (`ACCEPT_LEGACY_PAYLOAD` in `tauri/src/releases/signature.rs`), so the releases already in `releases.json` keep working. Managers up to 0.4.2 verify only format 1: release the manager 0.4.3 before (or together with) the first modpack release signed in format 2, and give players time to self-update; a modpack release in format 2 is refused by an older manager until it updates. Once every published release is in format 2 and no manager older than 0.4.3 is expected, set `ACCEPT_LEGACY_PAYLOAD = false`.

#### Recommendations (not done yet)

- **Separate keys.** One minisign key signs both the manager's self-update and the modpack releases, so a leak of `TAURI_SIGNING_PRIVATE_KEY` gives both. A second key for releases (its own secret, its own `RELEASE_PUBLIC_KEY`) limits that; it needs a manager release that trusts the new key before any release is signed with it.
- **SSH key instead of a password.** `release.yml` (and deploy) upload over SSH with `DEPLOY_SSH_PASSWORD` and the VPS has `PasswordAuthentication yes`. Use a dedicated deploy key (`appleboy/scp-action` / `ssh-action` take `key:`), restrict it in `authorized_keys` to the deploy user, pin the host key (`fingerprint:`), and turn password logins off.

### The first release

- [ ] The API accepts only **v2** request signatures (`MOD_REQUEST.version = 'v2'`: HMAC over `v2\n<METHOD>\n<path>\n<timestamp>\n<nonce>\n<body>`, a 5-minute skew window and a one-time nonce), so a package built before v2 signing is rejected. Check that `DEFAULT_SERVER_URL` in `apps/game/modpack/packages/companion/config/constants.py` is `https://api.triotmetki.ru`.
- [ ] Bump `VERSION` in `apps/game/modpack/packages/companion/version.py` (and in `packages/core/version.py` and `features/<id>/__init__.py` for the packages that changed) with their CHANGELOG entries, and the release `version` in `apps/game/modpack/package.json` with its `## <version>` entry.
- [ ] The downloads folder exists (§1), and a deploy ran with this Caddyfile and `docker-compose.yml` (they serve and mount it).
- [ ] The secrets are set: deploy.yml's `NEXT_PUBLIC_SITE_URL` and `DEPLOY_*`, plus `TAURI_SIGNING_PRIVATE_KEY` (+ `_PASSWORD`).
- [ ] Set the supported clients in `otmetki.games` of `apps/game/modpack/package.json`, commit, push, then run **release** (Actions → release → Run workflow; no inputs needed).
- [ ] Check `https://triotmetki.ru/downloads/releases.json`, `https://api.triotmetki.ru/modpack/releases/latest?game=1.46.0.0` (`compatible`) and the /mod page's two downloads (disabled with a «first release» note until `GET /modpack/releases/status` reports the files).
- [ ] Users bind their devices again with a code from `/me`. Devices bound in development do not exist in production.

Later releases: bump the versions, commit, push and run the workflow again. Only a version `releases.json` does not list is built and published; older releases stay in the index, so clients still on an older game version keep their compatible release. The manager is released on its own when only `version` in `apps/game/manager/package.json` changed (the self-update only offers a newer version), and a modpack-only release leaves the `manager` block as it is.

## 5. Legal pages and Plus: fill before checkout opens

- [ ] `/privacy`, `/terms` and `/contacts` are **drafts**. They render a "draft" banner, and every `<todo>…</todo>` in `apps/web/client/shared/i18n/locales/{ru,en}/legal.json` (13 per language) must be filled before launch:
  - operator full name or company name, ИНН (TIN), ОГРН/ОГРНИП (PSRN), address and contact e-mail;
  - effective dates;
  - hosting provider and region;
  - payment provider name and refund terms;
  - retention period;
  - cookies and third-party list.

  Once they are filled, drop the draft notice.
- [ ] Plus checkout stays off (`PLUS.checkoutEnabled = false` in `packages/schemas/src/plus`) until Lesta confirms the model in writing (see [docs/research/data/lesta-api.md](../research/data/lesta-api.md#monetisation-status)). To open checkout:
  - set `YOOKASSA_*` and the webhook;
  - flip the flag and deploy.

  On the next API boot, `PlusLaunchService` notifies the users who asked to be told (`plusCheckoutOpen`) exactly once.

## 6. Rollback and routine

- The images are tagged only `:latest`. To roll back, re-run the workflow from the previous commit, or `docker compose pull` a pinned digest by hand.
- **Backups.** The `backup` service ([prodrigestivill/postgres-backup-local](https://github.com/prodrigestivill/docker-postgres-backup-local)) runs `pg_dump -Fc` at 04:00 container time into the `pgbackups` volume. It keeps 7 daily, 4 weekly and 6 monthly dumps. The newest is always `/backups/last/<db>-latest.dump`.
  - The dumps sit on the same disk as the database, so copy them off the host. For example, run a nightly cron on another machine: `ssh vps 'cd /opt/otmetki && docker compose cp backup:/backups/last/otmetki-latest.dump -' > otmetki-$(date +%F).dump`.
  - To restore into an empty database, TimescaleDB needs its restore mode:

    ```sh
    docker compose stop server worker
    docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'SELECT timescaledb_pre_restore();'
    docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner < otmetki.dump
    docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'SELECT timescaledb_post_restore();'
    docker compose up -d
    ```

  - Rehearse the restore once before launch. An untested backup is not a backup.
- **Logs.** Read them with `docker compose logs -f server worker`. Every service rotates its log at 10 MB × 5 files. Caddy's access log drops `access_token`, `token`, `code` and `state` from query strings.
- `db push` has no down-migrations. A schema change that drops a column is caught by the data-loss check above; resolve it by hand before you re-run the deploy.
- The Timescale retention policies and the `RETENTION` purge jobs are part of the Lesta terms. Do not switch them off to save time on a deploy.

## 7. Запуск без ключа Лесты (before the Lesta key)

Until the Lesta application exists, production runs the normal stack on an empty database. There is no mock, no seed and no generated data anywhere.

- **The server** boots with `LESTA_APPLICATION_ID` empty. Every endpoint answers with empty data, and every page shows its designed empty state (what is missing and why), never an error or a spinner. `/auth/lesta/start` sends the visitor back with `lesta_not_connected` instead of opening Lesta ID.
- **The worker** starts degraded: it logs `LESTA_APPLICATION_ID is empty: running degraded…`, loads no tracking or clan processors and registers no Lesta schedule. Aggregates, news, purge and the other key-less jobs still run. `/health` stays up and reports the worker's state.
- **MoE thresholds** need no key either: they are estimated from the mod's battle reports (`moe-estimate`, on every worker boot and daily), so they appear once players report through the modpack — [moe-thresholds.md](moe-thresholds.md).
- **The client** runs with `LESTA_NOTICE=true` in the VPS `.env` (§1): every site page shows the informational «Данные «Мира танков» пока не подключены» notice and the Lesta ID button is disabled with the same explanation. The site stays indexable.

### Каталог техники (optional, no key needed)

The vehicle catalog, modules, equipment, maps and personal missions come from the public client-data repositories on GitHub, not from Lesta. Load them once into the empty database, inside the server image (it runs as the unprivileged `bun` user, so the download cache goes to `/tmp`):

```sh
cd /opt/otmetki
docker compose run --rm server bun scripts/gamedata-import.ts --cache /tmp/otmetki-gamedata
```

- The container's working directory is `/app/apps/web/server`; compose supplies `DATABASE_URL`. Add `--armor` to also import the armor models into the `serverdata` volume (`.data/armor` under the server package, where the API reads them).
- Set `GITHUB_TOKEN` (no scopes) in `.env` to lift GitHub's anonymous rate limit.
- Without a key the encyclopedia version check is skipped (`no LESTA_APPLICATION_ID`).
- `--dry-run` builds the import plan without writing.

### When the key arrives

1. Put `LESTA_APPLICATION_ID` (and `LESTA_RPS`) in the VPS `.env`, allow-list the VPS IP and the OpenID redirect (§1).
2. Set `LESTA_NOTICE=false` in the same `.env`.
3. Restart the stack with the new values: `docker compose up -d` (or run the deploy workflow). The client picks up `LESTA_NOTICE` without a rebuild, so the notice disappears and Lesta ID sign-in opens; the restarted worker registers the Lesta schedules. Then do §3.
