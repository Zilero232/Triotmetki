# Lesta API — reference (verified 2026-09-24, methods re-probed 2026-09-28)

Source: developers.lesta.ru (`/api/methods/`, guide, rules/agreement). Items marked **[unverified]** need a live key to confirm.

Method existence was re-checked on 2026-09-28 with live calls using `application_id=demo`: an existing method answers `DEMO_APPLICATION_IS_BLOCKED` or `*_NOT_SPECIFIED`, a missing one `METHOD_NOT_FOUND`. Field lists cannot be checked that way.

## Basics
- Base URL: `https://api.tanki.su/wot/<group>/<method>/`
- Accepts GET and POST.
- Version header: `X-Api-Version: 2.80.0`.
- CORS: `*`.
- Common params:
  - `application_id` (required)
  - `language` (default `ru`)
  - `fields`: comma-separated, dot-nested, `-` excludes, max 100
  - `access_token`
  - `extra`
- Response: `{status, meta:{count}, data:{<id>: ...}}`
- Errors come as `error.{code,message,field,value}`:
  - `INVALID_APPLICATION_ID`, `REQUEST_LIMIT_EXCEEDED`, `ACCOUNT_ID_LIST_LIMIT_EXCEEDED` (all 407)
  - the `demo` key is blocked

## Methods (wot)
- **account**: list, info, tanks, achievements
- **auth**: login, prolongate, logout
- **tanks**: stats, achievements, mastery
- **encyclopedia**:
  - current: vehicles, vehicleprofile, vehicleprofiles, modules, achievements, info, arenas, provisions, personalmissions, boosters, badges, crewroles, crewskills
  - legacy: tanks, tankinfo, tank*
- **clans**: list, info, accountinfo, glossary, messageboard, memberhistory
- **globalmap**: fronts, provinces, claninfo, clanprovinces, clanbattles, seasons, season*, events, event*, info
- **stronghold**: claninfo, clanreserves, activateclanreserve
- **ratings**: types, dates, accounts, neighbors, top
- **clanratings**: types, dates, clans, neighbors, top
- **wgn** (base `https://api.tanki.su/wgn/`): servers/info (online per cluster), account/*, clans/* — probed 2026-09-28; `servers/info` feeds the online counter in the site header

Not on Lesta (`METHOD_NOT_FOUND`): `account/wtr`, `stronghold/accountstats`, `stronghold/buildings`, `globalmap/provincehistory`, `globalmap/clanprovincehistory`, and any separate method for ranked battles, Onslaught, Front Line or loot boxes.

### Key methods
- **account/list**
  - `search` (≤24 chars); `type` = `startswith` (≥3 chars) or `exact` (up to 100 names); `limit` ≤ 100.
- **account/info**
  - Up to 100 `account_id`.
  - Top-level fields: nickname, clan_id, global_rating, created_at, last_battle_time, logout_at, updated_at.
  - Statistics blocks: `statistics.{all,random,clan,company,team,regular_team,stronghold_*,globalmap_*,epic,fallout,ranked_*}`.
  - `private.*` requires a token.
  - `extra`: `statistics.random`, `statistics.epic`, `statistics.ranked_*`, `private.garage`, `private.rented`, `private.boosters`, `private.personal_missions`.
- **account/tanks**
  - Up to 100 `account_id` + up to 100 `tank_id`.
  - Returns `tank_id`, `mark_of_mastery` (0–4), `statistics.{battles,wins}`.
  - **Cheap change detector.**
- **tanks/stats**
  - **One** `account_id`, up to 100 `tank_id`.
  - `extra`: random, epic, ranked_*.
  - Fields: mark_of_mastery, max_frags, max_xp, plus blocks all, random, …
  - Block fields: battles, wins, losses, draws, xp, battle_avg_xp, damage_dealt, damage_received, frags, spotted, capture_points, dropped_capture_points, hits, shots, piercings, piercings_received, explosion_hits, direct_hits_received, no_damage_direct_hits_received, avg_damage_blocked, tanking_factor, survived_battles, stun_number, stun_assisted_damage.
  - `in_garage` and `frags` need a token.
- **tanks/achievements**
  - One account, up to 100 tanks.
  - `achievements.marksOnGun` 0–3 **[unverified on Lesta]**.
  - **No MoE percentage in the API.**
- **tanks/mastery**
  - `distribution` = damage | xp, `percentile` up to 10 values.
  - Server percentiles per tank. These are not MoE thresholds.
- **encyclopedia/vehicles**
  - Filters: nation, type, tier.
  - `page_no`, `limit` ≤ 100.
- **auth/login** (OpenID via Lesta ID)
  - Params: `redirect_uri`, `expires_at` ≤ 2 weeks, `display`, `nofollow=1`.
  - Tokens are refreshed with `auth/prolongate`: the `lesta-links` worker job renews every token that expires within 3 days (daily, 04:40 Moscow), for 13 days. A rejected or already expired token marks the link stale and sends the owner a «перепривяжите аккаунт» notification.
- **tanks/stats with a token**
  - `fields=tank_id,in_garage` + the owner's `access_token` returns `in_garage` for every tank of the account (`null` without a valid token); `in_garage=1` filters to the garage.
  - The `lesta-links` worker writes it to `player_tank.in_garage` 5 minutes after a login or relink and once a day for every live token.
- **ratings/***
  - `ratings/types` lists the periods; the code asks for it and uses only the ones it offers (`1`, `7`, `28`, `all` expected) **[unverified: the set of types on Lesta]**.
  - `ratings/accounts` (`type`, up to 100 `account_id`, optional `date`): per rank field `{value, rank, rank_delta}`; an account below the period threshold is `null`.
  - `ratings/top` (`type`, `rank_field`, `limit`, `page_no`), `ratings/neighbors` (`account_id`, `type`, `rank_field`, `limit`), `ratings/dates` (`type`, `account_id`).
  - Rank fields: global_rating, battles_count, wins_ratio, damage_avg, damage_dealt, frags_avg, frags_count, xp_avg, xp_amount, xp_max, spotted_avg, spotted_count, survived_ratio, hits_ratio, capture_points.
- **Mode blocks**
  - account/info: `statistics.stronghold_skirmish`, `stronghold_defense`, `globalmap_absolute|middle|champion` by default; `statistics.epic` (Front Line) and `statistics.ranked_battles` only through `extra` **[unverified on Lesta: `ranked_battles` as an extra name]**. The collector falls back to the base extras for the rest of the process if Lesta rejects them.
  - tanks/stats: `stronghold_skirmish`, `stronghold_defense`, `globalmap`; `epic` and `ranked_battles` through `extra`.
- **Language**
  - `language=en` returns English `name_i18n` for `encyclopedia/achievements`, `arenas` and `crewskills`; the daily `english-names` reference job stores them in `title_en` / `name_en` next to the Russian ones.

## Limits
- Server app: 20 rps per registered IP, up to 5 IPs per app, so about 100 rps max.
  - Our limiter keeps one Redis bucket pair (priority + bulk) per egress IP: list the registered IPs in `LESTA_EGRESS_IPS` (at most 5) and give each process the IP it leaves through in `LESTA_EGRESS_IP`; `LESTA_RPS` is the budget of one IP. Without `LESTA_EGRESS_IP` every process shares the single default bucket, as before.
- Standalone (client) app: 10 rps per IP.
- Up to 10 apps per account.
- Higher limits: ask support. They want to see rps, `fields` usage and your caching.
- Batch sizes: 100 ids for account/info, account/tanks and account/achievements. tanks/stats takes a single account.
- Cache everything ourselves. Encyclopedia changes per patch; stats change after battles.

## Differences vs Wargaming API
Missing on Lesta:
- `account/wtr`
- `stronghold/accountstats`, `stronghold/buildings`

`wgn/*` exists on Lesta, including `servers/info` (online per cluster).

Other differences:
- Single realm.
- Separate `application_id`.

## Terms of use (developers.lesta.ru/documentation/rules/agreement/) — must comply
- **Licence**: non-exclusive, revocable, public apps only.
- **Free app**: ads allowed; ads unrelated to Lesta need their approval; donations allowed.
- **Paid app or in-app purchases**: **ads forbidden**; donations allowed.
- **Forbidden**:
  - commercial distribution of API data
  - derivative works without written consent
  - reselling the API
  - implying affiliation with Lesta
  - Lesta-like UI
  - indefinite storage of data copies
  - passing data to search engines or ad networks
  - asking users for Lesta email or password
  - passing personal data to third parties
  - bots and proxies
- **Required in the UI**:
  - developer copyright + «© Леста Игры. Все права защищены»
  - prominent link to the official game site
  - "data source: Леста Игры"
  - prominent link to the Lesta Support Center
  - a logout button when auth is used
- **Deletion**: delete data on Lesta's request; don't keep stale data. A Lesta request is opened with `bun run deletion:request --account <id> --reason "<ticket>"` (apps/web/server); deleting a site account opens a `user` request for each linked account. Both hide the player at once and block collection for good; the purge job removes the data.

### Monetisation status
Our only paid product is the Plus subscription ([Plus spec](../../specs/2026-09-26-plus-subscription.md)); the API and core stats stay free and there are no ads. Checkout stays disabled (`PLUS.checkoutEnabled = false` in `packages/schemas/src/plus`) until Lesta confirms the model in writing, as described in the Plus spec §6; trials and promo days work meanwhile. When the reply arrives, record it here (date, sender, verbatim answer, including the history-window question).

## Community data
- **WN8 expected values (Lesta)**: modxvm.com/en/wn8-expected-values-lesta. Daily, JSON/CSV, but behind Cloudflare.
  - Alternatives: tankist.net/services/wn8, kttc.ru/wot/ru/info/wn8etv.
- **MoE thresholds**: poliroid.me/gunmarks (RU/BY cluster, no public API); kttc mirrors it. The import stays off (`FEATURES.moePoliroid`) until Poliroid's permission.
  - Our own estimate from mod battle reports is the live source (the collector's `moe-estimate` job, [ops/moe-thresholds.md](../../ops/moe-thresholds.md)).
- **Libraries**:
  - WgLestaAPI (Python, small).
  - Node `lesta-mt-api` is abandoned; we write our own thin TS client.
