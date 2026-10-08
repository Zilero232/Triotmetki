# Modpack user badge (`pack_badge`)

Status: implemented 2026-10-06 (server `mod-badges`, companion 0.8.4, ui 0.9.4, new component `pack_badge` 0.1.0).
`pack_badge` 0.1.3 (2026-10-07) replaces the stock-data drawing, suspected of native client crashes, with our own AS3
library SWF in the players panel, the Tab stats and the loading screen (section «Drawing», revision 2026-10-07 b); it
is on by default and switched back on once for installs the 0.3.8 update turned off (companion 0.8.8, config
revision 10).

Revised 2026-10-08 (owner's decision): the mark no longer depends on the site. Every player with the mod installed
and the switch on is marked, with no binding and no site account, as Near_You does. The mod calls the new unsigned
`POST /mod/badges/presence {account_id, visible, account_ids}` (section «Presence»); the server keeps only a 30-day
presence key per account. The signed routes below stay for older mods.

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

### Presence (revised 2026-10-08)

`POST /mod/badges/presence {account_id, visible, account_ids}`, anonymous and unsigned (no device headers, no
binding, `modBadgePresenceRequestSchema`, `mod-badges/mod-badge-presence.controller.ts`):

- `account_id` is the sender's own account, `visible` its `show_pack_badge` switch, `account_ids` 0–100 ids of the
  battle's other players (same filtering as the read below; an empty list only reports the switch).
- `visible: true` sets the Redis key `otmetki:mod:presence:<account_id>` to `1` with a 30-day TTL
  (`MOD_BADGES_API.activeDays`), refreshed on every call; `visible: false` deletes it at once. Nothing else is stored.
  An account with a data-deletion request (`PurgeGuardService.blocked`) never gets the key: it is deleted instead.
- Answer `{account_ids}`: the asked ids that have a presence key (one `MGET`), minus players with `player.is_hidden`
  and accounts with a data-deletion request (one batched `blocked` check, which also covers purged accounts).
  Bound devices and `mod_device.badge_visible` play no part.
- Throttled per client IP (`request.ip` behind the trusted proxy, IPv6 by /56): 30 per minute
  (`MOD_BADGES_API.presenceThrottle`), and the same 3000 distinct ids per Moscow day with the quota keyed by
  `ip:` + the first 16 hex characters of an HMAC of the address (`ipQuotaSubject`), then 429 `rate_limited` with
  Retry-After.
- Retention: the TTL is the deletion; the account purge job deletes the key of a purged account
  (`collector/purge/services/purge.service.ts`).

### Drawing (Lesta 1.45)

Revised again 2026-10-07 (pack_badge 0.1.3, «b»): both stock-data paths below (the prefix badge slot, then the
`region` `<IMG>`) are the prime suspects of the owner's native crashes (0xC0000005) 0.5-3 minutes after the badge
entered the rows, so the data path is dropped for the way Near_You and Battle Observer draw: a display object of our
own in the stock rows.

- **Evidence.** Battle Observer appends `modBattleObserver.swf` to `BATTLE_REQUIRED_LIBRARIES`
  (`refs/mods/Armagomen__battle_observer/mod/res/scripts/client/armagomen/battle_observer/__init__.py:79`), its
  library's document class puts `as_BattleObserverCreate` on `BaseBattlePage.prototype`
  (`as/src/net/armagomen/battle_observer/BattleObserverLibraryMain.as`), Python calls it on the page's `flashObject`
  (`battle_observer/battle/__init__.py` `onViewFounded`), and `PlayersPanelsUI.as:115-128` walks
  `panels.listLeft/listRight._items` and `addChild`s its sprite to each holder's list item. RU 1.45: the battle app
  loads the list into its own application domain (`battle_entry._getRequiredLibraries`, AS3 `LibrariesLoader`); the
  row is `BasePlayersPanelListItem` (public `vehicleIcon`, `hit`, `bg`/`selfBg`/`deadBg`/`normAltBg`/`deadAltBg`,
  25 px rows, 339 px wide, the icon on the screen-centre side), its holder `BasePlayersListItemHolder` (public
  `getListItem()`, `vehicleID`); the panel dispatches `change` on new data, `onItemsCountChange` and `stateChanged` on
  a mode switch, the lists `itemsCountChange` (`PlayersPanelBase.as`, `PlayersPanel.as`, `BasePlayersPanelList.as`).
- **What we draw.** A 36x18 plate (the «///» mark and the «ТРИ ОТМЕТКИ» wordmark, our art in
  `assets/otmetki/pack_badge`, renditions for 1x, 1.5x and 2x) right after the vehicle icon, and a 240 px
  orange-to-transparent strip above the row backgrounds and below the text. Python sends the vehicle ids and the shown
  names of marked accounts; the library repaints on the panel's own events, removes itself with the page and does no
  per-frame work.
- **Toolchain.** Apache Royale `mxmlc` from npm on Java (mise); playerglobal generated from Royale's Apache-licensed
  typedefs; no Lesta SWC (the client's classes are reached by name). The SWF is committed (`bun run swf:build`).
- **Field access.** Revised 2026-10-08 after two live logs on 1.45. The vehicle id of a stock row lives only in
  private or protected fields (`BasePlayersPanelList._items`, `StatsBase.tableCtrl`,
  `StatsTableControllerBase.allyRenderers`, `BattleLoadingForm._allyRenderers`, `BasePlayerItemRenderer.model`). A
  string lookup (`target[name]`) found none of them (`panel rows 0`, `tab not found`, `loading rows 0`), and neither
  did compile-time dot access on untyped values, the way Battle Observer's `PlayersPanelsUI.as` reads `list._items`
  on the WG client (`unreadable listLeft._items, listRight._items`, `no page.fullStats.tableCtrl`). The library
  therefore reads public members only and finds a row by the player name it shows: Python sends
  `as_otmetkiPackBadge(vehicleIds, names)`, the names being the marked players' `player.name` plus `fakeName` for an
  anonymised player (`model.marked_names`). A row's name is its text field's text up to a clan tag `[`, a space
  (region, IGR icon, the anonymised eye) or the client's cut mark `..` (`CommonsBattle.formatPlayerName`,
  `BattleLoadingUtil.formatPlayerName`), compared case-sensitively; a cut name (at least 4 characters) matches a
  marked name it starts.
- **Players panel** (RU 1.45 client source: `battle.swf`, `net.wg.gui.battle.random.views.BattlePage`,
  `PlayersPanelBase`, `BasePlayersPanelList`, `BasePlayersPanelListItem`). The page field is public `playersPanel`
  (`epicRandomPlayersPanel` on `EpicRandomPage`); its public `listLeft`/`listRight` are sprites whose renderer
  container holds the rows; a row has public `playerNameFullTF` and `playerNameCutTF` (both filled whichever the panel
  mode shows), `vehicleIcon`, `hit` and the backgrounds.
- **Tab and loading screen.** Their rows are fixed slots rebound to other players by sort. Tab (RU 1.45 client source:
  `StatsBase`, `FullStatsTable`, `FullStatsTableBase`, `StatsTableItemBase`): the public `fullStats.statsTable` holds
  the cell collections `playerNameCollection`, `vehicleIconCollection` and `fragsCollection`, one index per slot; an
  empty slot keeps its name field hidden. The cells are drawn only once Tab is shown, so Python listens to
  `GameEvent.FULL_STATS` on `g_eventBus` and asks for a repaint 0.2 s after Tab goes down. Loading (RU 1.45 client
  source: `BattleLoadingForm`, `BaseRendererContainer`): the form's child named `container` holds the public vectors
  `textFieldsAlly`/`textFieldsEnemy` and `vehicleIconsAlly`/`vehicleIconsEnemy`. A decoration hangs on the slot's
  icon and is checked against the slot's current name on every repaint. Battle Observer draws nothing in the Tab; this
  part follows the client source.
- The library loads and answers on Lesta 1.45. UNVERIFIED there: the name text the screens show for an anonymised
  player; two players whose names the client cut to the same prefix would both match.

Revised 2026-10-08 (pack_badge 0.1.4): 0.3.9 embedded the plate as PNG in `DefineBitsJPEG2` (SWF 17), and the battle
app crashed natively while loading the library, in every battle; the plate is vector art now and the library is
SWF 10 with no bitmap tags.

The history below is kept for the record.

Revised 2026-10-07 (pack_badge 0.1.2): the first build used the stock prefix badge slot, and in game our icon showed
instead of the player's own achievement badge. The owner wants it as Near_You shows it: a separate small mark that
leaves the player's badge alone. Near_You's pack is closed (no source to read); XVM puts its user mark as an
`<img>` in the name line, which is what this does.

Options weighed:

1. **An `<IMG>` in the name text** — chosen. `VehicleInfoComponent.addVehicleInfo`
   (`gui/Scaleform/daapi/view/battle/shared/stats_exchange/vehicle.py`, RU 1.45) sends `region` with every row; the
   players panel (`BasePlayersListItemHolder.updateUserProps`), the Tab table (`StatsTableItemHolderBase.updateUserProps`)
   and the loading screen (`BasePlayerItemRenderer.draw`) pass it to `CommonsBattle.formatPlayerName`
   (`sources-as3/battle/.../CommonsBattle.as`), which sets `htmlText = name + [clan] + ' ' + region + igr + eye`;
   the stock IGR and anonymiser marks are `<IMG SRC="img://gui/maps/icons/library/...">` in that same string. So
   `region = <IMG SRC="img://gui/maps/icons/otmetki/pack_badge/badge_16.png" width="16" height="16" vspace="-4"/>`
   (region is empty on RU: `player_format.getRegionCode` returns a code only for another realm; a code is kept before
   the icon) draws a 16 px icon after the name and clan in all three views, with no Flash code; Battle Observer draws
   its own `img://gui/maps/icons/battle_observer/...` PNGs in battle text the same way. The stock prefix badge is not
   touched. Limits: the players panel shows it only in its full-name mode (the cut-name modes draw the bare
   `userName`); a name too long for the field is cut by the stock algorithm, which drops the suffix (and our icon)
   last. UNVERIFIED on Lesta 1.45: the mod PNG through `img://` in these fields; the component logs the tag it sends.
2. **The stock prefix badge slot** (`data['badge']`, `isAtlasSource: False`): works, but the slot holds one badge,
   so ours replaced the player's achievement badge. Dropped with its `stock_badge` choice (retired in companion
   config revision 9).
3. **The suffix badge** (`suffixBadgeType`): drawn by `BattleAtlasSprite.imageName` from the battle atlas only
   (`StatsTableItemBase.as`, `BasePlayerItemRenderer.as`), and the random-battle players panel has no suffix slot at
   all; an own image would need a patched `battleAtlas`, which we never ship, and a stock suffix id would impersonate
   a real badge.
4. **`playerName` itself**: the players panel's cut field and the stock name cutter treat it as plain text
   (`truncateTextFieldText`, `cutPlayerName` takes `substr` of it), so a tag there would break; rejected.
5. **Gameface icons positioned over the panel rows**: needs row geometry the HUD page cannot read; rejected.

The server answer arrives after the panels are drawn, so the component re-sends the vehicle data
(`BattleStatisticsDataController.invalidateVehiclesInfo`, captured from `startControl`); a changed `region` marks the
name props changed (`StatsUserProps.region`), so the name is redrawn on the one pass.

### The own badge

The player's own row is marked locally, without a binding (switch on; the own account id from the arena data), as
Near_You marks its users: nothing is sent for it, so it shows unbound and when the server does not answer.

## 4. Privacy and retention

- Since 2026-10-08 the presence route sends the own account id and the switch without a binding (owner's decision);
  no other personal data is sent. The read request carries only the arena's numeric account ids and the device
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

0.1.3 (SWF path, on by default): in a random battle the own row shows the plate after the tank icon and the gradient
on the loading screen, in the ears (following the panel modes) and in the Tab table; python.log has one `pack badge
swf:` line per screen for every push (modpack README «pack_badge», «Log»). Play several battles and watch for the
0xC0000005 crash. The checks below are for the earlier paths.

- Switch on, bound or not: the own row shows the icon in the ears, Tab and the loading screen (with a stock badge
  chosen, `replace` shows ours, `keep` the stock one).
- A second bound account in the same battle (platoon) shows the icon on the first player's screen after a moment.
- Switching «Показывать мой значок» off hides the own icon at once and, after the next battle start, on the other
  player's screen.
- The image path form (`../maps/icons/...` through `ImageManager`) is UNVERIFIED on Lesta 1.45; if the badge slot
  stays empty, `python.log` shows `pack badge` lines and the path to try next is `img://gui/maps/icons/...`.
