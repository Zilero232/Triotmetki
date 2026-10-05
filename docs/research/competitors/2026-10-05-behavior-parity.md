# Behaviour parity with the established modpacks (research 2026-10-05)

The player's complaint: our components use "self-invented random logic" instead of the conventions every player knows
from Jove, Lebwa, PROTanki, XVM, PMOD and Battle Observer. Two examples from the player:

1. **The battle-results notification must appear by itself on the right, above the minimap**, as in every modpack.
2. **There is no point showing the current battle while the player is playing it.**

This document audits every catalogue entry ([catalog.json](../../../apps/game/modpack/catalog/catalog.json)) for
**where** it draws, **when** it appears and disappears, **what** it shows by default and whether it is **on** by default,
against the convention. It does not redo the feature lists of
[round 3](2026-09-29-modpacks-round3.md), [the code study](2026-09-30-modpacks-code.md), [round 4](2026-09-30-round4.md)
or the [competitor UI brief](../design/2026-10-03-competitor-ui.md); it builds on them and on
[the HUD consolidation spec](../../specs/2026-09-30-hud-consolidation-and-design.md) (§0 decisions, §7 layout map).

## 0. Sources and method

| Source | What it gives | Quality |
| --- | --- | --- |
| Battle Observer source and its install defaults, `refs/mods/Armagomen__battle_observer/install/settings/bo_install/*.json`, `mod/res/gui/gameface/.../hangar/*/*.css` | Exact default positions: main gun `x 260, y 0` (right of the team HP strip), totals log `x −260, inCenter`, battle clock `x −270, y 0` (top right), hangar clock `left 2.6vw, top 83px` (top left under the header), hangar stats widget `left 50vw, top 83px` (top centre), sixth-sense ring radius 38, minimap `yaw_limits: true` | High (code) |
| poliroid BattleHits and Replays Manager source, `refs/mods/poliroid__battle-hits/python/gui/battlehits/hooks.py:110-160`, `refs/mods/poliroid__replays-manager/python/gui/rmanager/hooks.py:91` | Both open from **their own ModsList entry** in the hangar; BattleHits greys its entry out in the queue | High (code) |
| Player's local mod configs `%APPDATA%\Lesta\MirTankov\mods\gunmarks\protanki_config.json` | PROTanki/Near_You marks panel: `anchorPoint: center`, `offsetBattle: [376, 472]` = right of the consumables bar at the bottom (at 1080p: x 1336, y 1012) | High (real config) |
| Stock client 1.45 sources, `refs/wot-src-ru/sources` | `battle_session.__pe_onBattleResultsReceived` (results of a non-active vehicle are not shown in battle); `messenger/formatters/service_channel.py:626` `BattleResultsFormatter` (the stock post-battle message in the service channel, shown as a pop-up toast at the bottom right of the hangar); `MinimapSizeConst.as:17` minimap squares 210/260/310/390/490/610 px by `minimapSize` index 0–5 | High (code) |
| [tankist.net/interface/pmod](https://tankist.net/interface/pmod) | PMOD (inside Jove and Lebwa): "подменить после-боевые сообщения", "добавить в системный канал сессионную статистику" — results and session go **through the service channel**, replacing the stock message, not as a second panel | Medium |
| [lebwa.tv/hub/modpack-lebwa](https://lebwa.tv/hub/modpack-lebwa) (fetched 2026-10-05) | Lebwa free list includes «Быстрый отклик прицела», «Часы в ангаре и в бою», «Отображение оборудования в бою», «УГН», «Просмотр попаданий в ангаре», «Сообщения от Левши» | Medium |
| [Competitor UI brief A.1–A.4](../design/2026-10-03-competitor-ui.md), [code study §1–§7](2026-09-30-modpacks-code.md) | Lebwa marks panel right of the consumables bar (cx + 300, H − 108); kurzdor `battleequipment` row placed **beside** the consumables panel from its live width; PMOD in-battle results card; Battle Observer sixth-sense durations | High (earlier study of the extracted packs) |
| Web search 2026-10-05 for the "previous battle results in battle" convention | No indexed page describes its default place; the player's statement ("right, above the minimap, in every modpack") is taken as the requirement, consistent with the stock toast corner (bottom right) | Low — **verify live with Jove's pack** |

Evidence paths below are relative to `apps/game/modpack/`. Fair play and the "no stock duplicates" rule (spec §0) are
applied to every fix.

---

## 1. The player's two examples

### 1.1 «Итоги боя» card of the **current** battle — delete it

| | |
| --- | --- |
| **Ours** | `BattleSummaryPanel` counts the live battle and reveals a card when the own tank dies or the battle ends, kept until the player leaves (`features/battle_results/client/summary.py:49-55, 137-158`). Default place top right, `x −372, y 60` (`features/battle_results/settings/constants.py:33`), docked under «Прогресс боя» (`packages/core/hud/panel/constants.py:87`). Switch `battle_summary` **on by default** (`packages/companion/config/constants.py:235`). |
| **Convention** | No pack shows a summary of the battle you are in. After death the stock post-mortem panel names the killer and the stock damage log/efficiency totals already show damage, assist and blocked; at the end the stock "Победа/Поражение" screen and then the service-channel message carry the results. PMOD and XVM only change the **post-battle message**. |
| **Deviation** | A panel that repeats the stock totals over the battle view while the player still spectates; violates spec §0 "no component repeats the stock client". |
| **Fix** | Delete `BattleSummaryPanel`, its panel id `battle_summary`, the `battle_summary` switch and `SUMMARY_DEFAULTS`/dock row (keep the MoE projection where it already lives: the marks panel). Retire the switch through the revision mechanism (spec §0.2). Remove "a card with your results once your tank is destroyed and when the battle ends" from the catalogue text. |
| **Priority** | **P0** |

### 1.2 Results of the **previous** battle in the next battle — right side, above the minimap, automatic

| | |
| --- | --- |
| **Ours** | `LastBattlePanel` shows a card for 10 s when an earlier battle's results arrive during the next battle (`features/battle_results/client/last_battle.py:117-121`, `model/battle/constants.py:340-341`), with a close mark that needs the Ctrl cursor (`last_battle.py:165-171`). Default place **top left**, `x 372, y 60` (`settings/constants.py:34`), third in the `battle_left_top` column under the marks panel and platoon points (`packages/core/hud/panel/constants.py:83, 99-101`), so its height on screen depends on which panels are on. |
| **Convention** | The player: a results notice appears **by itself on the right, above the minimap**. That is the corner where the client already shows its own notices (hangar toasts bottom right) and where the eye looks for "news", away from the team list and the score strip. It auto-hides; no click needed. |
| **Deviation** | Wrong corner (top left, beside the team list), position shifts with other panels, a close button nobody expects. |
| **Fix** | New anchor `battle_right_bottom`: `align_x right`, `align_y bottom`, `x −8`, `y −(minimap_px + 12)`, where `minimap_px` = `MinimapSizeConst.MAP_SIZE[minimapSize].width` (210/260/310/390/490/610 design px; read the `minimapSize` client setting at `battle_enter`, fallback 310), grows **up**, right-aligned text. Not part of any column. Slide in from the right (180 ms), show 8 s (keep `LAST_SHOW_S` 10 if preferred), fade out; queue the next. Drop the close mark (Ctrl-click may stay as "skip", no visible ✕). Content: tank, map, result word coloured, damage, XP, credits, MoE delta — one block, no tiles grid. Keep the switch `battle_last_results` on. |
| **Priority** | **P0** |

### 1.3 Hangar post-battle notification

| | |
| --- | --- |
| **Ours** | Each battle pushes **our own** `SystemMessages.pushMessage(..., SM_TYPE.Information)` (`packages/core/client/ui/__init__.py:181-184`), queued while in battle and flushed on `hangar` (`features/battle_results/client/__init__.py:54-62`). The stock `BattleResultsFormatter` message arrives too. |
| **Convention** | PMOD "подменить после-боевые сообщения": **one** message per battle — the stock one, extended (MoE change, damage, assist). The toast pops up bottom right automatically. |
| **Deviation** | Two toasts per battle (stock + ours), ours plain text of type Information. |
| **Fix** | Wrap `BattleResultsFormatter.format` (or its `_getMessage` data) to append our lines (MoE % and delta, session line) to the stock message; drop the separate push. Fallback to the separate push only if the hook fails. |
| **Priority** | **P1** |

---

## 2. Battle components

| Component | Ours (evidence) | Convention (who, source) | Deviation | Fix | P |
| --- | --- | --- | --- | --- | --- |
| **marks_panel** (battle) | Top **left**, `x 372, y 60`, beside the left team list (`features/marks_panel/settings/constants.py:15-19`, dock `battle_left_top` `packages/core/hud/panel/constants.py:83,98`) | Lebwa: right of the consumables bar (cx + 300, H − 108) [UI brief A.1]; PROTanki/Near_You `gunmarks`: `anchorPoint center, offsetBattle [376, 472]` (local config) = bottom, right of the bar; our own spec §7.1 says the same | Invented place, contradicts both the packs and our spec | Anchor `left edge = stock consumables right + 12, bottom = H − 8` (live bar width from Python, fallback `x 300, y −8, align center/bottom`); must end left of `W − minimap_px − 8`, else dock above the bar's right half. Retire `(372, 60, left, top)` via `RETIRED_PLACES` | **P0** |
| **battle_progress** (main gun, record, WN8) | Top right column `x −372, y 60` under the right team-list edge (`features/battle_progress/settings/constants.py:11-15`) | Battle Observer main gun `x 260, y 0` right of the team HP strip (`bo_install/main_gun.json`); pmod/XVM put it at the HP strip; spec §7.1 `cx + 308, y 4` | Sits by the team list instead of next to the score | Anchor top-centre `x +308, y 4, align left/top` relative to centre (the BO place); if `W < 1700` dock under team HP (`y 52`, centred). Off by default stays | **P1** |
| **damage_log** | Stock log spot `x 232, y −6` bottom-left, replaces the stock log (`features/damage_log/settings/constants.py:14-20`) | XVM hit log/BO extended log; stock log place is what Jove/BO keep by default | Matches. Replacing the stock log by default is stronger than BO (which leaves `wg_logs` alone) | Keep; consider `keep_stock` visible in the main fields | P2 |
| **team_hp** | Replaces the stock score strip at top centre (`features/team_hp/settings/constants.py:20-32`) | BO, pmod, XVM, Lebwa Plus all take the `fragCorrelationBar` area [code study §3] | Matches | Keep; add the BO "alive count" and V-key hide group (code study §3) | P2 |
| **sixth_sense** | Stock lamp spot, replaces the stock lamp, timer on, fixed 10 s minus own skill (`features/sixth_sense/settings/constants.py:13-25`, `model/constants.py:18`) | BO: 10 s / 8.5 s radio / 8 s improved slot, Onslaught values, **tick sound**, hides on death [code study §5] | Close; no tick sound, no equipment/mode durations | Duration by equipment and mode; optional tick | P2 |
| **battle_loadout** | Row **on top of** the consumables panel, centred, `y −64` (`features/battle_loadout/settings/constants.py:9-15`) | kurzdor `battleequipment` (Lebwa, Jove): one row **beside** the consumables panel at the same height, placed from its live width [code study §4]; spec §7.1: left of the bar | Stacks over the bar where vehicle messages and ribbons appear | `right edge = stock bar left − 12, bottom = H − 8`; if it would meet the log (`x < 229 + 270 + 8`) fall back to above the bar | **P1** |
| **gun_arc** | Scale under the reticle `y 96`, off by default (`features/gun_arc/settings/constants.py:9-18`) | Lebwa «УГН» (placement not documented online); BO draws yaw limits **on the minimap** (`bo_install/minimap.json: yaw_limits true`) | Our reticle scale is a third way; acceptable | Keep; add an optional minimap-lines mode (own vehicle only) | P2 |
| **aim_info** | Under the reticle `y 132`; distance and shell tooltips on, armour **off** (`features/aim_info/settings/constants.py:13-27`) | Distance in reticle: common; armour calculators in battle are "announced to be banned" [round 3 §0] | Catalogue text leads with "Armour under the reticle", which is off by default | Rewrite the catalogue description to start with what is on (distance, shell tooltips) | P1 |
| **platoon_points** | Top-left column under marks, off (`features/platoon_points/settings/constants.py:7-11`) | Lebwa Plus «Турнир Чака» | After the marks panel moves down it is alone in the column — fine | Keep; re-check the column once marks moves | P2 |
| **responsive_reticle** | On by default (`features/responsive_reticle/settings/constants.py:9`) | Lebwa «Быстрый отклик прицела» (free list) | Matches | Keep | — |
| **battle_hotkeys** | Off; notice over the reticle `y −110` (`features/battle_hotkeys/settings/constants.py:10-17`) | Near_You server reticle on a key; PMOD zoom keys | Matches | Keep | — |
| **battle_menu** | «///» under the Esc menu (`features/battle_menu/settings/constants.py`) | Nobody offers settings in battle [code study §6] | Unique, harmless (only with Esc) | Keep | — |
| **hud_layouts** | Full/compact/off per battle type | Nobody does it cleanly [round 4 §3.2] | Unique | Keep | — |
| **minimap** | Game options only; names on Alt, view circles on | Jove/BO/XVM circles | Matches | Keep | — |
| **crosshair** | Fresh-install `minimal` preset **plus our orange chevron drawn over the reticle centre** (`mark: chevron_thin`, `mark_color: orange`, `mark_hides_centre: True`, `features/crosshair/settings/constants.py:22-30`) | Packs drop the grid (spec §0) but a centre mark is a reticle **pack the player picks**; nobody replaces the stock centre by default | Our brand mark replaces the stock centre without being asked | Default `mark: 'none'` (stock centre), keep the preset; the chevron stays one click away in the gallery | **P1** |
| **camera** | Dynamic camera off, stabilisation on (fresh install) | Lebwa/PMOD ship the same | Matches | Keep | — |
| **chat_filter** | Off | PMOD/BO filters, off by default | Matches | Keep | — |
| **streamer_mode** | Off, Ctrl+Shift+H | — | Fine | Keep | — |
| **bush_circle** | Hotkey Ctrl+Shift+B, off | Jove 15 m circle | Matches | Keep | — |
| **hangar_info → battle clock** | Left of the stock timer `x −190, y 4` (`features/hangar_info/settings/constants.py:52-57`) | BO battle clock `x −270, y 0` top right | Matches | Keep | — |
| **battle_results → in-battle cards** | §1.1, §1.2 | — | — | — | **P0** |

## 3. Hangar components

| Component | Ours (evidence) | Convention | Deviation | Fix | P |
| --- | --- | --- | --- | --- | --- |
| **session_stats** | Card in the **right** column `x −16, y 570` (`features/session_stats/client/constants.py:7`, `packages/core/hud/panel/constants.py:92,103`), over the stock vehicle parameters and entry points | PMOD: session statistics **in the service channel** (tankist PMOD); BO/wotstat widgets; our spec §7.2 removes the right column ("it lands on the entry points") | Contradicts our spec and covers stock UI | Move to `hangar_left` under the Tank card (spec §7.2); add an optional per-battle session line inside the post-battle message (§1.3) | **P1** |
| **battle_results** (hangar) | §1.3 | PMOD replaces the post-battle message | Two toasts | §1.3 | **P1** |
| **hit_viewer** | Opens only from its card/page in **our settings window** or from a results row (`features/hit_viewer/client/__init__.py:18-29`) | poliroid BattleHits («Боевые раны», in Jove, Lebwa, Near_You): **its own ModsList entry**, one click from the hangar, greyed in the queue (`battlehits/hooks.py:110-160`) | Buried two levels deep; players do not find it | Register a ModsList entry `hit_viewer` (and the «///» fallback menu item) that opens the last battle; disable it while in the queue | **P1** |
| **replay_manager** | A page inside our window | poliroid Replays Manager: own ModsList entry, also on the login screen and the stock replay context menu (`rmanager/hooks.py:91`) | Extra click, not where players look | Own ModsList entry opening the Replays page directly | P2 |
| **hangar_info** (clock strip) | Bottom left above the carousel `y −196` (`features/hangar_info/settings/constants.py:15-29`), comment "UNVERIFIED" | BO hangar clock **top left under the header** (`clock.css`: `left 2.6vw; top 83px`); Lebwa «Часы в ангаре» | Our place is unverified and depends on carousel rows | Default `x 2.6% of width (≈ 50 px at 1920), y 83, align left/top`; one row | **P1** |
| **marks_panel** (hangar Tank card) | Left column `x 16, y 440` (`features/marks_panel/settings/constants.py:56-61`) | BO stats widget top centre under the header (`efficiency.css: left 50vw; top 83px`); XVM/PMOD: MoE % on the carousel tiles | Left column is our spec's choice, fine; the carousel % that XVM players expect is missing | Keep the card; add MoE % to the carousel tile (own data) — see §5 | P2 |
| **crew_xp** | Card under the crew panel (left column) **and** a tooltip line, both on (`features/crew_xp/settings/constants.py:7-9`, `model/constants.py:6`) | Jove: crew XP calculator and skill descriptions **in the crew tooltip**; spec §0 deleted hangar_info's crew rows because "the crew panel shows the crew XP" | The card repeats stock information (spec §0 rule) | `show_card: False` by default, keep the tooltip line | **P1** |
| **update_notice** | Hangar card in the right column **and** one notification (`features/update_notice/settings/constants.py:7-9`, `model/constants.py:30`) | Korben/Jove: one notification in the client | A permanent card for a one-time message, in the right column | `show_card: False`; keep the single service-channel notice | P2 |
| **personal_missions** | Right column card + window list | Jove helper (not verified); stock quest panel in battle | Right column covers stock UI | Move to `hangar_left` under Session (spec §7.2), collapse to header when short of height | P2 |
| **comp7_helper** | Right column card, only in Onslaught | Lebwa «Статистика в Натиске» (Plus) | Same right-column issue | `hangar_left` with the context cards | P2 |
| **event_trackers** | Right column, off | — | Same | `hangar_left` | P2 |
| **hangar_tweaks**, **quick_demount** | Carousel rows, quick actions on a button; demount in the equipment menu | Lebwa: carousel 3+ rows, quick demount, quick style removal | Matches | Keep | — |
| **auto_resupply**, **auto_reserves**, **depot_seller** | Off, on the player's request | BO has auto crew/claims; packs have no sellers | Unique, safe defaults | Keep | — |
| **hangar_space** | Off | Near_You, Korben, МОСТ hangars | Matches | Keep | — |
| **notification_filter**, **hangar_cleaner** | Off | PMOD/BO filters | Matches | Keep | — |
| **preset_advisor** | Marks in the loadout window | — | Unique | Keep | — |
| **free_camera** | Off, Ctrl+Shift+F | PMOD replay free camera | Matches | Keep | — |
| **config_backup**, **replay_upload**, **core**, **companion**, **ui** | Invisible / data | — | — | — | — |

## 4. Catalogue text drift

| Where | Problem | Fix | P |
| --- | --- | --- | --- |
| `catalog.json` preset `streamer` description | Mentions "reload" (`reload_timer` was deleted, spec §0) | Drop "перезарядка/reload" | P2 |
| `battle_results` description | Promises the current-battle card (§1.1) | Rewrite after the deletion | P0 (with §1.1) |
| `aim_info` description | Leads with the off-by-default armour readout | §2 row | P1 |

---

## 5. Components only we have, components everyone else has

### 5.1 Only we have (no major pack ships them)

`battle_menu` (settings in battle), `hud_layouts`, `battle_progress` record/WN8 rows, `preset_advisor`, `auto_reserves`,
`depot_seller`, `config_backup`, `event_trackers`, `streamer_mode`'s private mode, `update_notice` card, `crew_xp` card,
the current-battle summary card (to delete, §1.1), `platoon_points` free (Lebwa sells it).

None is wrong as such; the ones that duplicate stock (`crew_xp` card, `update_notice` card, the summary card) go per the
table above.

### 5.2 Everyone else has, we lack (allowed by our fair-play rules)

| Feature | Who | Fair play | P |
| --- | --- | --- | --- |
| MoE % on the carousel tiles | XVM, PMOD | Own data | P1 |
| Session statistics in the service channel | PMOD | Own data | P1 (folds into §1.3) |
| Capture timer and number of capturers | XVM, BO | From the stock capture bar, no positions | P2 |
| Sound tweaks: capture siren off, volume dimming | Korben, BO | Own client sound | P2 |
| Current sniper zoom shown in the scope | PMOD | Own camera | P2 |
| Kill history page | МОСТ | Post-battle, own results | P2 |
| Armour viewer in the hangar | Jove, PROTanki, МОСТ (Armor Inspector) | Hangar only | P2 (round 3 P1-5 link to the site) |

Excluded on purpose (unchanged): enemy reload timers, last-seen markers, gun directions on the minimap, "nearest enemy",
armour analysis in battle, XVM player stats, SafeShot, commander camera and x25 zoom until МОСТ answers (round 3 §4).

---

## 6. P0 / P1 summary

| P | Component | Deviation | Fix |
| --- | --- | --- | --- |
| P0 | battle_results — current-battle card | Shows a summary of the battle in progress (on death and at the end), on by default | Delete `BattleSummaryPanel`, its switch, panel and dock row; retire the switch |
| P0 | battle_results — previous-battle card | Top left beside the team list, moves with other panels, needs a click to close | Anchor right/bottom, `x −8`, `y −(minimap_px + 12)` from `minimapSize`; slide in, auto-hide 8–10 s, queue; no close mark |
| P0 | marks_panel (battle) | Top left `372, 60` | Right of the consumables bar, bottom `H − 8` (Lebwa, PROTanki `center +376/+472`, spec §7.1) |
| P1 | battle_results — hangar | Our own extra toast next to the stock one | Append our lines to the stock `BattleResultsFormatter` message |
| P1 | battle_progress | Top right column by the team list | Right of the team HP strip `cx + 308, y 4` (BO `x 260, y 0`) |
| P1 | battle_loadout | Over the consumables bar | Beside it: right edge = bar left − 12, bottom H − 8 |
| P1 | crosshair | Our orange chevron replaces the stock centre by default | Default `mark: none` |
| P1 | aim_info | Catalogue leads with an off-by-default feature | Rewrite description |
| P1 | session_stats | Right column over the stock parameters/entry points | Left column under the Tank card; session line in the post-battle message |
| P1 | hit_viewer | Only reachable inside the settings window | Own ModsList entry, disabled in queue |
| P1 | hangar_info clock | Bottom left above the carousel (unverified) | Top left under the header (BO `2.6vw, 83px`) |
| P1 | crew_xp | Card repeats the stock crew panel | Card off by default, tooltip line stays |
| P1 | gap: carousel MoE % | XVM/PMOD players expect it | New option of marks_panel |

Live check after the fixes: 1920×1080 and 2560×1440 at scale 1.5, minimap sizes 0 and 5, one battle with a previous
battle's results arriving mid-battle, and one with Jove's pack side by side for the results-notice corner.
