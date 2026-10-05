# Near_You Team modpack: component gap (research 2026-10-05)

The Near_You Team (NYT) modpack component list the player showed, set against our catalogue
([apps/game/modpack/catalog/catalog.json](../../../apps/game/modpack/catalog/catalog.json)) and the rules: Lesta's
article 15152 and our own stricter rule, both quoted in the [fair-play audit](../data/2026-10-05-fair-play-audit.md),
plus [.claude/rules/modpack/fair-play.md](../../../.claude/rules/modpack/fair-play.md). It follows the
[code study](2026-09-30-modpacks-code.md), [behaviour parity](2026-10-05-behavior-parity.md) and the
[deep dive](2026-10-05-modpacks-deep-dive.md), which already cover NYT's marks panel, lamp and Onslaught widget.

## Sources and limits

- **NYT's own posts.** The Telegram channel [t.me/s/neartv](https://t.me/s/neartv?before=6457): the «Модпак Near_You
  v.2 — большое обновление» post (listed as 09.03.2026 by the fetch) lists «мод рекомендованного оборудования на все
  танки», «мод полевой модернизации на все танки», «новый полностью настраиваемый под вас кастомный прицел», «новый
  Ангар — гора „Олимп“», «мод виджет для режима „Натиск“», «мод отображения навыков танков в ушах команд в режиме
  „Натиск“», «расширение Чёрного списка! Теперь туда поместятся все». The 09.04–09.05 fixes: «исправлено падения FPS…
  с новым кастомным прицелом и ускоренным прицелом (без задержки)», «убрали фиксацию прицела для тех, кто играет на
  „серверном прицеле“», «повысился FPS в ангаре „Олимпа“». [nearyou.team/modpack](https://nearyou.team/modpack) is only
  a download button.
- **Press:** [cyber.sports.ru](https://cyber.sports.ru/wotblitz/blogs/3417104.html) (branded hangar, server reticle on
  one key, x16–x25 zoom, «расширенный калькулятор пробития для точного анализа бронирования противников», marks in the
  team style, styled sixth-sense lamp, hits in the hangar).
- **The player's machine (read only).** `%APPDATA%\Lesta\MirTankov\mods\gunmarks\nearyou_config.json`:
  `battle.always_alternate`, `battle.always_colorblind`, `battle.minimized`, `battle.offset [83, 3]` (NYT's skin of the
  shared protanki «gunmarks» engine, next to `protanki_config.json` with `anchorPoint`, `offsetBattle`,
  `battleMinimized`, `alwaysAlternate`, `progressLogic: damage`). `D:\Games\Tanki\mods\` holds only our packages; NYT
  is not installed. The installer `nyt_modpack_2026.09.24.01.exe` (268 MB) is in Downloads, but unpacking it was not
  permitted in this session, so NYT's configs and AS3 were not re-read; the code study's earlier notes stand in.
- **Client 1.45 RU source** (`D:\Project\personal\refs\wot-src-ru`) for what the stock client shows (Onslaught role
  skills, the blacklist limit).

So NYT's exact defaults and looks (crosshair options, the Onslaught widget's lines, the NYT-player fill) are
**unverified** below; their existence and purpose are from NYT's own posts.

## Two questions settled from the client source

### Role skills in the ears in Onslaught

The stock client already shows every player's role skill in the Onslaught full stats (Tab):

- `gui/Scaleform/daapi/view/battle/comp7/stats_exchange.py:22-35`: `Comp7VehicleInfoComponent` sends each vehicle's
  `equipmentID` / `equipmentName` (`Comp7Keys.ROLE_SKILL`, set for every vehicle from `Vehicle.set_selectedComp7Skill`
  and `arena_components/comp7_equipment_component.py:68-73`) and `skillLevel` (`Comp7Keys.ROLE_SKILL_LEVEL`).
- The level reaches the client **for the own team only**: `comp7/scripts/client/TeamInfoComp7Component.py:57-61` turns
  the team component's `roleSkillLevels` into `ROLE_SKILL_LEVEL` stats.
- The Tab row draws both: `sources-as3/.../comp7/stats/fullStats/tableItem/StatsTableItemHolder.as:32-35` and
  `StatsTableItem.as:179-209`: `setIsEnemy` → `RoleSkillLevel.setIsDisabled(true)`, which draws an enemy's skill icon
  with the «disabled» level frame (`RoleSkillLevel.as:53-70`); allies get the icon plus the charge level 0–3, dead
  players at 25 % alpha.
- The stock players panel (the «ears», `Comp7PlayersPanel`) shows no skill.

So an ears column with **the skill icon for both teams and the charge level for allies only** is the Tab data
re-arranged: allowed (our rule «only what the client already shows»; no article-15152 item). Forbidden or out:
an enemy skill level, an enemy «skill used» flash or cooldown timer inferred from visible AoE effects or anything else
(the client has no enemy level; a cooldown is the reload-timer case of item 3 in spirit and beyond what the client
shows under our rule).

### Blacklist «до 100к»

The limit is a client constant: `messenger/proto/xmpp/xmpp_constants.py:13-15` `CONTACT_LIMIT.BLOCK_MAX_COUNT = 1000`
(`ROSTER_MAX_COUNT = 300`), checked only in the client before the XMPP request,
`messenger/proto/xmpp/contacts/__init__.py:468-470` (`addIgnored` → `ClientIntLimitError(MAX_BLOCK_ITEMS)`). Raising it
is a one-line Python runtime patch of that attribute (no Flash), after which the client sends block items past 1000 to
Lesta's XMPP server, which stores the list. It is not on Lesta's forbidden list, but it bypasses a limit Lesta set and
writes the excess into Lesta's server-side account data. Our rule (client settings only through the game's own options;
grey features off until МОСТ answers) keeps it out until Lesta confirms; it goes into the МОСТ letter
([docs/ops/most-publishing.md](../../ops/most-publishing.md)). A rule-clean alternative: a local mute list in
`chat_filter` (hide the chat lines of listed players, stored in our config, no size cap, nothing sent).

## Component table

Effort: S (a day or less), M (a few days), L (a week), XL (more, or needs art we do not have).

| NYT component | Our equivalent | Differences (behaviour, defaults, look) | Verdict and rule | Effort |
| --- | --- | --- | --- | --- |
| Ангар «Олимп» (562.8 MB) | `hangar_space` (off) | NYT ships its own 3D hangar space (a mountain), with later FPS fixes. Ours swaps in hangar spaces the game already has; no own space. | **Out of scope.** Allowed (article 15152 hangar exception H), but needs original 3D art and ~560 MB per release on our VPS (no CDN, CLAUDE.md). | XL |
| Рекомендации по оборудованию и модернизации (0.2 MB) | `preset_advisor` (on) | NYT: equipment **and field modernisation** for every tank, from their curated `/setups`. Ours: equipment, directives, consumables of the top players from the triotmetki.ru builds, marked in the loadout window; no field modernisation; a tank without enough data gets no hint. The server already reads progression trees (`apps/web/server/src/modules/builds/lib/progression`), but the advice (`build-advice`) carries no modernisation picks. | **Adjust.** Allowed (H, sends only the tank id). | M (mod) + M (server data) |
| Прицел Near_You Team (4.1 MB) | `crosshair` (on), `aim_info` | NYT: «полностью настраиваемый кастомный прицел», its own reticle art; FPS drops fixed later. Ours: the game's own reticle presets, 26 centre marks, the reload timer; no fully drawn custom reticle (arm length, gap, thickness, colours, circle). | **Adjust.** Allowed while it is looks only (item 4: no auto-aim, no lead, no lock). | M–L |
| Статистика в режиме «Натиск» | `comp7_helper` (on, hangar) | NYT: an Onslaught widget, draggable, position stored as a 0..1 fraction of the free space (code study §1); its exact lines unverified. Ours: a hangar card with the Champion/Legend thresholds, the selected tank's role skill, the streak and the last battles; sits in the right column (parity P2: move to `hangar_left`). | **Have**, small adjust. Allowed (H, own battles). | S |
| Способности в ушах команд в «Натиске» | none | See above: the Tab already shows every skill and allies' levels; the ears do not. We have no ears (players panel) hook yet: `core/hud/panel/constants.py` names only a dock. | **Add**, as the Tab shows it: skill icon for both teams, ally level 0–3, no enemy level, no enemy cooldown or use flash. Our rule (stock data re-arranged). Off by default only if МОСТ is to see it first; otherwise on in Onslaught. | L |
| Увеличение чёрного списка (до 100к) | none | A runtime patch of `CONTACT_LIMIT.BLOCK_MAX_COUNT` (1000). | **Out of scope** until Lesta confirms (our rule: nothing beyond the game's own options; server-side write past Lesta's limit). Offer the local mute list in `chat_filter` instead. | S (mute list) |
| Сессионная статистика в стиле Near_You Team | `session_stats` (on, hangar) | Same purpose (battles, win rate, damage, ratings of the session). NYT's look is its branding; ours adds the MoE change per tank, site goals, the post-battle line and the report to Telegram/Discord. | **Have.** Allowed (H). | — |
| Расчёт трёх отметок в стиле Near_You | `marks_panel` (on) | NYT is the shared protanki «gunmarks» engine in NYT skin: `always_alternate` (the Alt view kept open), `always_colorblind`, `minimized` (a minimise button), a drag offset. Ours: same place (right of the consumables bar), Alt detail, styles, bar `damage`/`percent`; **no** minimise button, no «always expanded», no colour-blind palette. | **Adjust.** Allowed (own damage and assist). | S–M |
| Ускоренное обновление прицела | `responsive_reticle` (on) | Same idea (marker every frame, no 0.1 s lag). NYT then «убрали фиксацию прицела для тех, кто играет на серверном прицеле». Ours turns off for SPGs, replays, guns without traverse and the auto-aim lock (`model/__init__.py` `skip_reason`), **not** with the server reticle on. | **Adjust.** Allowed (audit: shows nothing the stock reticle does not). | S |
| Быстрое переключение x16–25 приближения | `battle_hotkeys` (off), `camera` | Ours toggles the game's own `increasedZoom` option on a key with a notice over the reticle. NYT's default is presumably on from the installer. | **Have.** Keep off by default (it writes a game setting; our rule: only on the player's decision). | — |
| Быстрое переключение серверного прицела | `battle_hotkeys` (off), `crosshair.server_reticle` | Same: one key toggles `useServerAim`. | **Have.** Allowed (2.1.7: one key, one option, no macro). | — |
| Информативный маркер бронепробития | none (`aim_info` armour removed in 0.1.1) | NYT: a penetration calculator over the reticle («анализ бронирования противников»). | **Out.** Article 15152, armour-analysis category A; the audit's one violation. | — |
| Стилизованная лампа шестого чувства | `sixth_sense` (on) | NYT replaces the stock `sixthSense.swf` with its art (code study §6). Ours hides the stock lamp (`replace_stock`) and draws one of four icon sets with a caption, pulse and a seconds-since-spotted timer. | **Have.** Allowed (own OBSERVED_BY_ENEMY state). | — |
| Отображать игроков Near_You Team в бою (заливка с логотипом / без) | none | Marks NYT players in the battle (a filled row with the logo, or without). Needs to know which other players qualify: their clients reporting to a server, or a downloaded list. | **Out of scope.** Not on Lesta's list (not tactical), but our rule sends nothing about other players to our server, and a badge of «uses Три отметки» exposes other players' tool choice. A later opt-in «streamer badge» from the site's public streamer list, downloaded only, could be reconsidered. | M |
| Интеграция в битву блогеров | none (`event_trackers` covers Triathlon and the caravan) | Tied to Lesta's seasonal «Битва блогеров» event (team choice, tokens); NYT's part is presumably their team's branding and progress. | **Later, event-gated.** If the event returns: an `event_trackers` card with the player's own team and tokens. Allowed (H, own data). | S per event |

## What to do

### Add

1. **Onslaught role skills in the ears** (new component, or a `comp7` part of a future ears component): the skill
   icon per player for both teams and the charge level 0–3 for allies, dimmed when dead, exactly as the Tab row draws
   it; enemies icon only. Needs the first players-panel hook (Python view hook on `Comp7PlayersPanel`, as the stock
   replacement mechanism does, no Flash patch). Effort L.
2. **Local mute list in `chat_filter`** as the rule-clean answer to the bigger blacklist: hide the battle chat of
   listed players, no cap, stored in our config, nothing written to Lesta. Effort S.

### Adjust

1. **`responsive_reticle`**: add a skip reason for the server reticle (`useServerAim` on), as NYT did after
   complaints; re-check frame cost (NYT had FPS drops with the same idea; the catalogue already says `perf: medium`).
2. **`marks_panel`**: a minimise button with a persisted `minimized`; an «always expanded» option (the Alt view kept
   open, gunmarks' `always_alternate`); a colour-blind palette option for the delta and mark colours
   (`always_colorblind`). Already P1 in the deep dive (item 8) except the colour-blind palette.
3. **`crosshair`**: a «custom» reticle drawn by us: arm length, gap, thickness, colour, opacity and outline, an
   optional centre dot and circle, arcade and sniper separately, with the stock reticle parts hidden for the battle
   through `RETICLE_PARTS` (the stock-replacement mechanism). Looks only; draw once and move with the marker to avoid
   NYT's FPS trouble.
4. **`preset_advisor`**: field modernisation hints (the pick per progression step) next to equipment, and a fallback
   to the site's recommended loadout when the top-player sample is thin, so every tank gets a hint. Needs per-tank
   modernisation picks in the builds advice first (server side; source to decide: replays or curation).
5. **`comp7_helper`**: move the card to `hangar_left` with the other context cards (behaviour parity P2).

### Skip

- **Hangar «Олимп»**: allowed, but original 3D art and ~560 MB per release; `hangar_space` covers stock spaces.
- **Blacklist to 100k**: a patch past Lesta's own limit that writes to Lesta's server; out until Lesta confirms
  (our rule), listed for the МОСТ letter.
- **Penetration marker**: forbidden (article 15152, armour analysis A).
- **NYT-player highlight**: needs data about other players (our rule); revisit only as a downloaded streamer list.
- **Blogger-battle integration**: only when the event runs, as an `event_trackers` card.
