# Modpack user badge (`pack_badge`)

Status: implemented 2026-10-06 (server `mod-badges`, companion 0.8.4, ui 0.9.4, new component `pack_badge` 0.1.0).

The owner asked for what Near_You's pack has: players who use the modpack carry its icon next to their name in the
battle player panels («уши»), in the full stats (Tab) and on the loading screen, the player himself included.

## 1. How the others do it

| Pack | Where the mark is drawn | How it knows who uses the pack | Opt-out |
| --- | --- | --- | --- |
| **XVM** (gitlab.com/xvm/xvm, `929a79f`, 2026-10-01) | Loading screen, players panel, Tab: `<img src='xvm://res/icons/xvm/xvm-user-{{xvm-user\|none}}.png'>` in `release/configs/default_lesta/battleLoading.xc:88-91`, `playersPanel.xc:62`, `statisticForm.xc:118-121` | Its stat server. At battle start `src/xvm_main/stats.py:217-245` walks `avatar_getter.getArena().vehicles` and `_load_stat` (`:373-390`) sends `accountDBID=vehCD=team` of every player to `getStats/{token}/{request}` (`src/xvm_main/xvmapi.py:26`); each answered player carries a `status` bit set for XVM users who activated the stat service, turned into `on`/`off`/`none` by `Utils.getXvmUserText` (`src/xvm_actionscript/swf_xvm/xvm_shared/com/xvm/Utils.as:73-85`, macro `{{xvm-user}}` in `Macros.as:1171`, introduced in XVM 5.5.1, `release/doc/ChangeLog-en.md:3474`) | A player without an activated token is never marked; `texts.xc` `xvmuser` lets the viewer change or blank the icon |
| **Near_You Team** | Their component «Отображать игроков Near_You Team в бою (заливка с логотипом / без)»: the player row of a pack user gets their logo, with or without a filled row ([gap note](../research/competitors/2026-10-05-near-you-gap.md)) | Not public: the pack is closed and [nearyou.team/modpack](https://nearyou.team/modpack) is a download button. A mark of other players can only come from the clients reporting to a server, as XVM does | The component switch (viewer side) |
| **Battle Observer** (`refs/mods/Armagomen__battle_observer`) | Does not mark users, but rewrites the same badge data client side for display only: `components/replace_vehicle_info.py` overrides `VehicleArenaInfoVO.__init__`/`update` and empties `badges`/`overriddenBadge` («Отключить отображение нашивок в бою: уши, окно по Tab, экран загрузки») | — | — |
| **PROTanki, LeBwa** | No user mark found in their component lists ([round 3](../research/competitors/2026-09-29-modpacks-round3.md)) | — | — |

So the industry pattern is XVM's: the client sends the arena's account ids to the pack's server and gets back the
subset that are pack users; the icon sits in the name line of the three stock views.

## 2. Rules

- **Lesta's forbidden list** (article 15152, quoted in the [fair-play audit](../research/data/2026-10-05-fair-play-audit.md)):
  the list names combat information (enemy reloads, aim, positions, spotting, armour analysis, lost-enemy markers,
  transparency). Who uses a mod is none of these; the mark changes nothing in the battle. Allowed.
- **Our fair-play rule**: reads no enemy combat state. The account ids come from the arena data behind the stock
  player panels, which the client shows to every player; they are not tactical. Allies and enemies are both sent,
  as XVM does; nothing about vehicles, positions, HP or teams is sent.
- **Lesta API terms** ([lesta-api.md](../research/data/lesta-api.md)): no API data is involved (the mark is our own
  data: who bound our mod). «Passing personal data to third parties»: account ids are public game identifiers, and
  the answer only names players who opted in to being shown. Retention: no copy of the roster is kept (section 4).
- **This reverses the 2026-10-05 «out of scope» call** in the Near_You gap note, which rested on «our rule sends
  nothing about other players». The owner asked for the mark; the design keeps the rule's intent: the server learns
  nothing it stores, and only players who chose to be shown are ever named.

## 3. Design

### Who is marked

A player is marked only when all of these hold:

1. they installed the mod **and bound it** to the site (an active, non-revoked `mod_device` of that account);
2. their device **reported the switch on**: `mod_device.badge_visible = true`. The column is `NULL` until the mod
   reports it, so players of older mods (which never showed the switch) are not marked;
3. the device was seen in the last 30 days (`MOD_BADGES.activeDays`: `last_seen_at`, refreshed by every battle
   ingest and every preference report), so an abandoned install stops being marked;
4. no active device of the account reports `false` (one PC with the switch off hides the account everywhere);
5. the player is not hidden by a deletion request (`player.is_hidden`).

### The switch

«Показывать мой значок другим игрокам» (`show_pack_badge`, config.json, default **on**, owner's call) sits on the
«Данные и сайт» page next to the other data switches and is excluded from settings profiles like the other privacy
switches. The companion (`companion/badge`) reports it with `POST /mod/badges/preference {device_id, account_id,
visible}` once per account after binding, on every change and when the whole mod is switched off (then `visible:
false`). It is the companion's job, not the viewer component's, so a player who removed the `pack_badge` component is
still shown or hidden as they chose.

### The read

`POST /mod/badges {device_id, account_id, account_ids}` (signed like `/mod/me/*`), once per own battle (never in a
replay) from the `pack_badge` component:

- `account_ids`: 1–100 ids of the arena's players (Frontline holds 60), the own account and bots (id 0), event
  bots and **anonymised players** (`fakeName` set) left out: an anonymised player's real id is not sent anywhere.
- Answer `{account_ids}`: the subset that passes the rules above. Nothing else (no nicknames, no stats).
- Rate limit: 30 per minute per device (`modDeviceTracker`), more than any real battle rate.

### Drawing (Lesta 1.45)

Three options were weighed:

1. **The stock prefix badge slot** — chosen. `VehicleInfoComponent.addVehicleInfo`
   (`gui/Scaleform/daapi/view/battle/shared/stats_exchange/vehicle.py:122-169`, RU 1.45) builds the dict the
   players panel, the Tab table and the loading screen all read; `data['badge']` is a `BadgeVisualVO`, and
   `BadgeComponent.setData` (`sources-as3/gui_base/.../controls/BadgeComponent.as`) draws it from the battle atlas
   only when `isAtlasSource` is true, otherwise `icon.source = path` loads any image. So setting `badge = {icon:
   '../maps/icons/otmetki/pack_badge/badge_24.png', isAtlasSource: False, sizeContent: '24x24'}` and
   `hasSelectedBadge = True` for a marked row draws our 24 px icon in all three views with no Flash code, the same
   display-only data rewrite Battle Observer does for its «hide badges».
2. **The suffix badge** (`suffixBadgeType`): drawn by `BattleAtlasSprite.imageName` from the battle atlas only
   (`StatsTableItemBase.as:195-212`); an own image would need a patched `battleAtlas`, which we never ship.
3. **Gameface icons positioned over the panel rows**: needs row geometry the HUD page cannot read (panel modes,
   sorting, scrolling), breaks on every panel layout; rejected.

The prefix slot holds one badge. A viewer choice `stock_badge` (`replace`, default, or `keep`) decides whether a
pack user's own stock badge gives way to ours or stays (then that row shows no mark).

The server answer arrives after the panels are drawn, so the component re-sends the vehicle data
(`BattleStatisticsDataController.invalidateVehiclesInfo`, captured from `startControl`). The players panel only
redraws a badge when the old one is null or the `hasSelectedBadge` flag flips
(`BasePlayersPanelListItem.setBadge`, `.as:363-370`), so a row whose stock badge is replaced is sent twice: once
without a badge, then with ours.

### The own badge

The player's own row is marked from the local binding alone (bound, switch on), so it shows even when the server
does not answer.

## 4. Privacy and retention

- Nothing is sent before the mod is bound; the request carries only the arena's numeric account ids and the device
  fields, never player names (`features/pack_badge/model.badges_request`, pinned by its test; checked in the
  2026-10-06 security review). The badge stays on by default (owner's decision).
- The server stores no account id from the read: no table, no cache of the roster, no log line with ids (request logs
  carry method and path only, `core/logger/lib/request-log`); the rate limiter keys on the device id.
- The server cannot check that the asked ids are the caller's arena, so the opt-in model stays and scraping is capped:
  a device may ask about at most `MOD_BADGES_QUOTA.distinctIdsPerDay` (3000, about 100 battles of 29 other players)
  distinct accounts per Moscow day, then gets 429 `rate_limited` with Retry-After until midnight. The count lives in a
  Redis set per device and day whose members are the first 16 hex characters of an HMAC (server secret, day, id), so
  the ids cannot be read back or linked across days; the set expires after two days
  (`mod-badges/services/mod-badge-quota-writer.service.ts`).
- Stored: one nullable boolean per device (`mod_device.badge_visible`). It is deleted with the device (account
  purge, unlinking an account revokes its devices, which stops the mark at once). No table grows with time, so no
  retention rule is added.
- A deletion request hides the player (`is_hidden`), which also stops the mark.
- Viewer side: the answer is kept in memory for the battle only.

## 5. What to verify in game

- Bound account, switch on: the own row shows the icon in the ears, Tab and the loading screen (with a stock badge
  chosen, `replace` shows ours, `keep` the stock one).
- A second bound account in the same battle (platoon) shows the icon on the first player's screen after a moment.
- Switching «Показывать мой значок» off hides the own icon at once and, after the next battle start, on the other
  player's screen.
- The image path form (`../maps/icons/...` through `ImageManager`) is UNVERIFIED on Lesta 1.45; if the badge slot
  stays empty, `python.log` shows `pack badge` lines and the path to try next is `img://gui/maps/icons/...`.
