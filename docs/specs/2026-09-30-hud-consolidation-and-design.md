# HUD consolidation and design system

The modpack grew one component per idea: 47 catalogue entries, 20 battle panels with every component on, 10 hangar cards. Players see the same shot three times (hit log, damage log, «По вам»), the same MoE percent in three hangar cards, the same session numbers in four places, and a dashboard of titled cards over the centre of the battle view. This spec does two things:

1. **Consolidation:** an overlap audit of every component, the merged set (47 → 32 entries, 20 → 9 battle panels, 10 → 2 hangar cards plus context cards), which components are on by default, and the migration of existing players' switches, settings and positions.
2. **Design system:** one plate, one type scale, one spacing scale, one colour table. Then a concrete spec for every block that remains, with its default place next to the stock UI.

It extends [2026-09-29-hud-visual-redesign.md](2026-09-29-hud-visual-redesign.md). That spec's icon inventory (§2.4), stock-replacement mechanism (§3), number formatting (§4.3), motion (§4.6), z-order (§4.7) and edit mode (§4.8) still apply. Where the two disagree, this spec wins: the plate, the type scale, colours, shell icons, default places, and which components exist.

**§0 is what was built.** It was written before the implementation and adjusts §3–§5 to what had already shipped that day (modpack 0.1.6–0.1.8: `consumables` deleted outright, `battle_loadout` shows equipment icons only, `reload_timer` became its own widget, every panel has a hover hint, the catalogue previews are drawn by the HUD widgets) and to one more rule from the player: **no component repeats another one or the stock client**. Before keeping a component, ask «does the stock client already show this?»; if it does, the component is deleted, not switched off. Where §0 and the later sections disagree, §0 wins.

## 0. Decisions

### 0.1 Per component

«Merge → X»: the package is deleted and X shows what was left of it. «Delete»: the package, its catalogue entry, preview, dock slot, strings, tests and changelog entries go; the manager removes the installed `.mtmod` on update (`RETIRED_SUFFIX`, modpack 0.1.8).

| Component | Decision | Default | Preset / values | Why |
|---|---|---|---|---|
| damage_log «Журнал боя» | **keep**, absorbs hit_log and received_hits | on | `style full`, `sections both`, `dealt_lines 6`, `received_lines 4`, `group_by_target on`, `show_hp on`, `show_misses on`, `show_received_blocked on`, `show_assist_rows on`, `alt_mode on`, `palette graphite` | One place per shot: dealt section (own shots with outcome, shell, class, target, HP left; assist rows) and received section, replacing the stock log |
| hit_log | merge → damage_log (dealt section) | — | — | Showed the same own shots as the log's dealt rows |
| received_hits | merge → damage_log (received section) | — | — | Showed the same hits on you as the log's received rows |
| last_hit (panel of damage_log) | **delete** | — | — | The newest received row of the log, drawn a second time |
| death_card | **delete** | — | — | Stock: the post-mortem panel names the killer and the vehicle; the stock damage panel shows the damaged modules and crew |
| arty_meter | **delete** | — | — | Stock log and the received section already list SPG hits with the SPG class icon; the thermometer was the biggest block for the rarest event |
| battle_progress «Прогресс боя» (new) | **new**, absorbs main_gun, battle_efficiency, personal_best | off | rows `main gun`, `record`, `WN8` on; `main_gun_share off`, `record_metric damage`, `colored on` | One titleless plate instead of three titled cards; packs disagree on main gun (BO on, Lebwa off) and WN8 needs binding |
| main_gun, battle_efficiency | merge → battle_progress | — | — | — |
| personal_best | merge → battle_progress (record row); the post-battle card and sound are **deleted** | — | — | The record row already shows it during the battle; the per-tank record store is kept by battle_progress |
| session_goals | merge → session_stats (goal rows and the «goal done» sound); the battle row is **deleted** | — | — | A site goal is a session number; the Session card shows it between battles, and the progress rows already answer «how much damage is left» in battle |
| personal_missions | **keep** hangar card and window list; battle panel **deleted** | on | `max_missions` = | Stock: the quest-progress panel under the capture bars shows the ЛБЗ conditions in battle |
| marks_panel «Отметки» | **keep**, absorbs hangar_marks and marks_history, tank row of hangar_ratings | on | `style compact`, `show_battle_panel on`, `hangar_card on`, `show_trend on`, `trend_battles 5`, `show_tank_ratings on` | The product's core; one tank name and one MoE percent in the hangar instead of three |
| hangar_marks, marks_history | merge → marks_panel (Tank card, history page) | — | — | Three cards with the same MoE percent |
| team_hp | keep | on | `style full`, `show_diff on`, `replace_stock on` = | Replaces the stock score strip (not shown twice), adds team HP and the difference |
| sixth_sense | keep | on | `icon_set lamp`, `show_timer on` = | Replaces the stock lamp, adds the timer |
| battle_loadout | keep | on | `icon_size 40` | The stock bar shows only devices with a live state, not the equipment set, ★ slots or directives |
| reload_timer | **delete** | — | — | Stock: the reticle's reload indicator, reload timer and cassette (the `minimal` crosshair preset turns them on) |
| gun_arc «Углы наводки» | keep, restyled as a traverse scale | off | `show_degrees on`, `warn_deg 5` = | No stock equivalent; only limited-traverse vehicles |
| battle_clock | merge → hangar_info (`battle_clock` key) | on | `battle_clock_format %H:%M`, `replace_timer off` | The clock is one component in the hangar and in battle |
| platoon_points | keep | off | = | Tournament niche |
| bush_circle | keep | off | = | Niche |
| hud_layouts | keep | on | = | Invisible, a layout per battle type |
| crosshair | keep | **on** | `preset minimal` on a fresh install: no grid, the circle, gun marker and reload readout kept | Lebwa, Near_You and Jove all drop the grid; the one-time apply keeps a backup and «Вернуть как было» |
| camera | keep | on | `dynamic_camera off`, `horizontal_stabilization on` on a fresh install | The stock camera shake is the most common complaint; Lebwa ships the same |
| minimap | keep | on | `max_view_range on`, `view_range on`, `vehicle_names alt` on a fresh install | Jove's and BO's minimap circles, all game options |
| chat_filter | keep | **off** | = | Overrides a client view; no pack filters by default |
| streamer_mode | keep | **off** | = | Niche |
| battle_sounds | keep | **off** | = | Needs a sound mod with Wwise events |
| session_stats «Сессия» | **keep**, absorbs session_goals (hangar), hangar_ratings (account line, session WN8) | on | `show_goals on`, `goal_sound on`, `show_account on` | Stock «Статистика сессии» is a pop-up behind a button without WN8 or goals; the card is glanceable |
| hangar_ratings | merge → session_stats (account line) and marks_panel (tank row) | — | — | The session numbers were shown twice |
| tilt_guard | **delete** | — | — | The Session card's results strip already shows a loss streak; a nag card on top is noise |
| platoon_helper | **delete** | — | — | Stock: the platoon window shows who pressed «Готов»; the platoon session rows were a niche copy of the Session card |
| battle_results | **keep**, absorbs battle_hits | on | `hits_tab on`; = | Post-battle MoE change and the session list; the hits figure moves to its window page |
| battle_hits | merge → battle_results (window page «Попадания по мне»); the hangar card is **deleted** | — | — | The card repeated the tank name and the last battle next to the Tank card |
| hangar_info «Часы и сервер» | **keep**, absorbs battle_clock; the tank rows are **deleted** | on | `clock_format %H:%M`, `date_format %d.%m`, `battle_clock on` | Stock: the vehicle tooltip shows the battle tiers and the crew panel the crew XP |
| comp7_helper | keep | on | = | Shows only in Onslaught; the Champion/Legend cut-offs are otherwise behind the leaderboard page |
| event_trackers | keep | off | = | Shows only during an event |
| replay_manager | keep | on | = | A window page |
| hangar_tweaks | keep | **off** | = | Packs disagree on the carousel |
| auto_resupply | keep | **off** | = | Sends client requests |
| notification_filter, hangar_cleaner | keep | **off** | = | Override client views; no pack does it by default |
| replay_upload | keep | off | = | Privacy |
| core, companion, ui | keep (required) | on | — | — |

Result: 47 catalogue entries → 31; battle panels with everything on 20 → 8 (team_hp, damage_log, marks_panel, battle_progress, battle_loadout, sixth_sense, gun_arc, platoon_points) plus the battle clock; hangar cards 10 → 2 (Tank, Session) plus the context cards (ЛБЗ, Натиск, events) and the clock strip.

### 0.2 Existing players

- **Switches** (`config.json`, `DEFAULTS_REVISION` 3): a switch whose default turned off moves only when it still holds the old default **and** its component was never configured (its `components.json` section equals the schema defaults); from now on the window records every switch and value the player changes in `user_set`, and later revisions skip those keys. Revision 3 turns off hangar_tweaks, battle_sounds, battle_chat_filter, hangar_auto_resupply, hangar_notification_filter, hangar_cleaner, streamer_mode and battle_bush_circle this way.
- **Merged switches:** a survivor is on if it or any merged switch was on (damage_log ← hit_log, received_hits; marks ← hangar_marks, marks_history; battle_progress ← main_gun, battle_efficiency, personal_best; session ← session_goals, hangar_ratings; battle_results ← battle_hits; hangar_info ← battle_clock). Deleted switches drop out of the file on the next save.
- **Values** (`components.json`): a moved key is copied only when it differs from its old default; a key whose default changed moves only when it still holds the old default and is not in `user_set` (`RETIRED_VALUES`).
- **Client settings** (crosshair, camera, minimap): applied once on a fresh install only, with the replaced values kept in `state.json` and a «Вернуть как было» button; an existing player's `native` values stay untouched.

### 0.3 Design

§6 as written, with two adjustments: the tone names stay those the Python side already sends (`accent` is the dealt tone, `success` = `good`, `warning` = `warn`; `dim` is new), and there are no rails and no `flash` state (the incoming card is gone).

---

Sources: every `features/*` package and `catalog/catalog.json` (read on 2026-09-30), `ui-web/src/entities/hud-widgets/*`, `ui-web/src/shared/ui/hud/*`, `packages/core/hud/*`, `packages/companion/config/constants.py`, `packages/design-tokens/scss/*`, the harness screenshots, and the competitor code study ([2026-09-30-modpacks-code.md](../research/competitors/2026-09-30-modpacks-code.md)) plus the packs extracted for it (Jove, Lebwa, Near_You, Battle Observer, pmod, XVM configs).

---

## 1. What is wrong today

The harness renders (`hud/live2/battle-1920x1080@1.png`, `hangar/after-hangar-1920x1080@1.png`, crops at 4K ×2) show these problems.

### 1.1 System-level

| Problem | Evidence |
|---|---|
| **One shot, three places.** An own hit shows in the hit log (top right), the damage-log row (bottom left) and in two totals. A hit on you shows in the damage-log row, the «Последнее попадание» pop-up, «По вам» (top left), and later in «Боевые раны» and the death card. | §2 matrix |
| **A dashboard over the battle.** Main gun, WN8, record, goals and missions are five separate titled cards (caps header, icon, divider, rows), 280×60–110 each. They cover x 820–1390, y 60–290 at 1080p, the area where you watch enemies at long range. | `live2/battle-1920x1080@1.png` |
| **Web-page cards, not HUD.** Every block is a grey card with a caps title («ОСНОВНОЙ КАЛИБР», «WN8 БОЯ», «РЕКОРД ТАНКА», «ЦЕЛИ», «ЛБЗ», «ПО ВАМ»). Stock and reference HUDs carry no titles in battle: the icon and the number say what it is. | crops |
| **12 font sizes, 6 plate paddings, 7 min-widths, ~12 fills.** Sizes 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20 and 22 px. Headline numbers use four sizes: 17 in a card, 18 for marks, 20 for the score, 22 for the last hit and the lamp. No `space-*` or type token is used. | ui-web inventory |
| **Colour without meaning.** The same orange (`color-accent`) is a header icon, a list bullet, a rail, dealt damage and the lamp ring. Rails come in four colours (orange, red, gold, white) that the player cannot decode. | crops |
| **Three greens and two reds.** team_hp sends `#7CD35B`/`#E3564A` from Python. Tokens say `#6FB544`/`#E07A6A`. The marks percent uses a third green. | `harness/battle.json`, tokens |
| **Shell icons are mush.** `shell/small/*.png` is a 55 px canvas with a diagonal tracer. At 16 px it reads as a red smudge (`crop-dmg.png`, damage-log rows). | mock `b-log.png` before the chip fix |
| **Panels on top of stock UI.** In the hangar, the clock and server card and the whole right column sit over the stock vehicle-parameters panel and the event entry points. In battle, the marks panel's top-left column starts inside the players panel's 368 px width. | `after-hangar-1920x1080@1.png`, `after-all-on-1920x1080@1.png` |

### 1.2 Block by block

| Block | What is wrong | Change |
|---|---|---|
| team_hp | A 550 px grey slab with web-style progress tracks. The score sits in a darker inner box. «Δ +2 300» floats under it. | No slab: an edge-fade plate like the stock strip's shadow. Bars 8 px with a 1 px dark outline, numbers at the bar ends, the diff inline under the score (§8.1). |
| damage_log | Mostly right: the icon totals row and the rows. But shell icons are unreadable, received rows mix with dealt rows in one list, and blocked rows look like dealt ones. The plate is a hard dark box. | Two sections as in the stock log (dealt on top, received below), shell chips, edge-fade plate (§8.2). |
| last_hit | Good idea, but a 305×42 black box with a red rail placed on its own, 60 px above the log. | Docked on top of the log. A red-tinted plate for 300 ms, then the normal plate (§8.3). |
| hit_log | Duplicates the damage-log rows at the top right. `lines`, grouping and HP are good ideas. | Merged into the log's dealt section (§3). |
| received_hits («По вам») | A card with a caps title, chips «попад. 3 · проб. 1 · забл. 240», and rows whose outcome is spelled out («рикошет БП»). It duplicates the log's received rows and the blocked total. | Merged into the log's received section. |
| death_card | Card with a title and three text rows. | The destroyed state of the incoming card (§8.3). |
| marks_panel | Readable but three lines tall by default. The thresholds line uses 11 px with check glyphs. It sits at the top left, over the players panel on some widths. | One line by default (icon, key percent, delta, the next threshold). Thresholds on Alt. Right of the consumables bar, as in Lebwa and Near_You (§8.4). |
| main_gun, battle_efficiency, personal_best, goals and missions battle lines | Five titled cards at top centre and top right. | One «Прогресс боя» plate right of the score strip, one row each, no titles (§8.5). |
| arty_meter | A 10×84 thermometer with a 9 px scale and five icon rows. The largest block for the rarest event. | A one-line summary inside the log on Alt; history in the battle-results page. |
| consumables | Draws the shell counts and consumable cooldowns the stock bar already shows. | Deleted (done in modpack 0.1.6). The shell-stats line is dropped too: the row above the stock bar shows the equipment only. |
| reload_timer | Fine, but the seconds float away from the bar, and the clip line uses a glyph. | Keep; shell chip for the clip; absorbs gun_arc (§8.6). |
| gun_arc | A card with a plate while the reload above it has none, and a progress bar that reads as "percent done". | A traverse scale under the reload bar: limit ticks, centre tick, a dot for the gun (§8.6). |
| battle_loadout | Good. Slots with a gold border and ★ read well. It sits above the bar and collides with vehicle messages. | Left of the stock bar at the bar's own height, as in the Lesta and Jove equipment rows (§8.7). |
| sixth_sense | Good. The ring is orange (accent); the number 22 px. | Keep; number at key size 20 (§8.8). |
| battle_clock | Shows the battle timer next to the stock timer: `17:13 07:00`. | Clock only, under the stock timer, muted (§8.9). |
| platoon_points | A card with a lone ★ header and a big 34. | The same row grammar as the progress plate (§8.10). |
| Hangar: marks, marks history, battle wounds, ratings | Four cards stacked on the left. The MoE percent shows in three of them, the tank name in all four. | One Tank card (§9.1). |
| Hangar: info, session, goals, ЛБЗ, platoon | Five cards on the right over stock panels. Session numbers repeat in ratings and platoon. | One Session card, context cards only when relevant, the clock strip at the bottom left (§9.2–9.4). |

---

## 2. Overlap matrix

Rows are what the player sees; columns are today's components. ● = shown, ○ = shown only in the window page, notification or text template.

### 2.1 Battle

| Shown | damage_log | last_hit¹ | hit_log | received_hits | death_card | arty_meter | main_gun | battle_efficiency | personal_best | platoon_points | marks_panel | consumables | battle_loadout | reload_timer | gun_arc |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Own damage total | ● |  | ● |  |  |  | ● | ● | ● | ● | ● (for MoE) |  |  |  |  |
| Own shot: target, class, damage, shell | ● |  | ● |  |  |  |  |  |  |  |  |  |  |  |  |
| Own shot: outcome, target HP left | | | ● |  |  |  |  |  |  |  |  |  |  |  |  |
| Assist (radio, track, stun) | ● |  |  |  |  |  |  |  |  | ● | ● (for MoE) |  |  |  |  |
| Blocked by own armour | ● |  |  | ● (same number) |  |  |  |  |  |  |  |  |  |  |  |
| Received total | ● |  |  | ● |  | ● (SPG part) |  |  |  |  |  |  |  |  |  |
| Hit on you: attacker, class, shell, damage | ● | ● |  | ● | ● (last) |  |  |  |  |  |  |  |  |  |  |
| Hit on you: outcome (ricochet, no pen) |  |  |  | ● |  |  |  |  |  |  |  |  |  |  |  |
| Received source (fire, ram, fall), ammo rack | ● | ● |  |  | ● |  |  |  |  |  |  |  |  |  |  |
| Arty hits, splash, stuns |  |  |  |  |  | ● |  |  |  |  |  |  |  |  |  |
| Damage still needed (main gun, record, goal, marks) |  |  |  |  |  |  | ● |  | ● |  | ● |  |  |  |  |
| Shell counts, loaded shell | stock bar |  |  |  |  |  |  |  |  |  |  | ● |  | ○ clip |  |
| Consumable cooldowns | stock bar |  |  |  |  |  |  |  |  |  |  | ● |  |  |  |
| Equipment, directives, field mods |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |  |
| Reload, clip | stock reticle |  |  |  |  |  |  |  |  |  |  |  |  | ● |  |
| Gun traverse limits |  |  |  |  |  |  |  |  |  |  |  |  |  |  | ● |

¹ `last_hit` is a second panel of damage_log. Also: session_goals and personal_missions each have a battle panel that repeats a «damage still needed» row. battle_clock repeats the stock timer. team_hp repeats the stock score (by design, it replaces the strip).

Four independent own-damage counters run at once: main_gun's `DamageTracker`, battle_efficiency's `BattleTotals`, damage_log's summary totals, platoon_points' own feedback. Five components hook the same `RECEIVED_DAMAGE` event; three hook `Vehicle.showDamageFromShot` on the own vehicle.

### 2.2 Hangar

| Shown | hangar_marks | marks_history | marks_panel² | hangar_ratings | battle_results | session_stats | session_goals | tilt_guard | platoon_helper | battle_hits | hangar_info | personal_best |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| MoE % and marks | ● | ● |  | ● (tank row) | ○ |  |  |  |  |  |  |  |
| Damage to 65/85/95, battles to next | ● |  | ● |  |  |  |  |  |  |  |  |  |
| MoE average, pace | ● | ● (avg) |  |  | ○ (Δ avg) |  |  |  |  |  |  |  |
| MoE change per battle, trend | | ● |  |  | ○ |  |  |  |  |  |  |  |
| Tank WN8, win rate, battles | | |  | ● |  |  |  |  |  |  |  |  |
| Session battles, win rate, avg damage | | |  | ● | ○ | ● |  |  | ● (platoon) |  |  |  |
| Session WN8 | | |  | ● |  | ● |  |  |  |  |  |  |
| Session boundary (own tracker) |  |  |  |  | ● | ● |  | ● | ● |  |  |  |
| Goal progress | | |  |  |  |  | ● |  |  |  |  |  |
| Loss streak, damage drop |  |  |  |  |  | ● (strip) |  | ○ |  |  |  |  |
| Hits on you last battle | | |  |  |  |  |  |  |  | ● |  |  |
| Post-battle record | | |  |  | ○ (same numbers) |  |  |  |  |  |  | ○ |
| Clock | | |  |  |  |  |  |  |  |  | ● | battle_clock ● |
| Tank: battle tiers, crew XP | | |  |  |  |  |  |  |  |  | ● |  |

² marks_panel shares `core/moe` code with hangar_marks; four features keep their own session boundary: session_stats and battle_results read `session_idle_minutes`, tilt_guard and platoon_helper hard-code 60 min.

---

## 3. Consolidated component set

Rule: a merged component may own several panels. **Panel ids stay** wherever a panel survives, so its `components.json` section and the player's position survive with it.

### 3.1 Battle

| Component (id) | Title ru / en | Absorbs | Panels (ids) | What it shows |
|---|---|---|---|---|
| **damage_log** | «Журнал боя» / Battle log | hit_log, received_hits, death_card, arty_meter (battle part), last_hit | `damage_log`, `last_hit`, `death_card` | Totals row. **Dealt** section: own shots (outcome, damage, shell, class, target, HP left), assist rows. **Received** section: hits on you (outcome, −damage or blocked, shell, class, attacker; fire, ram, fall). Incoming card: the last hit, turning into the death card when you are destroyed. Alt: notes (HP, crits, ammo rack, outcome words, arty summary). Replaces the stock log. |
| **marks_panel** | «Отметки» / Marks of Excellence | hangar_marks, marks_history | `marks_panel` (battle), `hangar_marks` (the Tank card in the hangar) + window page | Battle: live MoE. Hangar: the Tank card (§9.1). Window: the history list and marks report of marks_history. |
| **battle_progress** (new) | «Прогресс боя» / Battle progress | main_gun, battle_efficiency, personal_best (battle part), session_goals (battle part), personal_missions (battle part) | `battle_progress` | One plate, one row per target: main gun, record, WN8 of the battle, site goal, ЛБЗ. A row shows only while it applies. |
| **reload_timer** | «Орудие» / Gun | gun_arc | `reload_timer` | Reload bar and seconds, clip, and the traverse scale on limited-traverse vehicles. |
| **battle_loadout** | «Оборудование в бою» / Equipment in battle | consumables (nothing kept) | `battle_loadout` | Equipment and directives as the client's icons, no labels, above the stock bar. No shell line: the stock bar and its tooltip already show the shells. |
| team_hp | unchanged | — | `team_hp` | §8.1 |
| sixth_sense | unchanged | — | `sixth_sense` | §8.8 |
| platoon_points | unchanged | — | `platoon_points` | §8.10 |
| hangar_info | «Часы и сервер» / Clock and server | battle_clock | `battle_clock` (battle), `hangar_info` (hangar strip) | Battle: the clock under the stock timer. Hangar: clock, server, ping, online. The tank rows move to the Tank card. |
| hud_layouts, bush_circle, streamer_mode, battle_sounds, chat_filter, minimap, crosshair, camera | unchanged | — | — | Not HUD panels. |

**Deleted as separate entries:** consumables' cooldown ring and shell counts (the stock bar shows both) and arty_meter's thermometer (a one-line summary replaces it).

### 3.2 Hangar

| Component (id) | Title ru / en | Absorbs | What it shows |
|---|---|---|---|
| **session_stats** | «Сессия» / Session | session_goals, tilt_guard, hangar_ratings, platoon_helper's session rows | The Session card (§9.2): battles, win rate, damage, WN8, last results, goal rows (+ the «goal done» sound), a tilt warning row, the account line. **One session boundary** (`session_idle_minutes`) for everything. |
| **battle_results** | «Итоги боёв» / Battle results | battle_hits, personal_best (post-battle card and sound), arty_meter (history) | Notification after the battle. Window page: per battle, tabs «Сводка», «Попадания по мне» (the battle_hits figure and list) and «Арта» (when hit). A «Новый рекорд» line and sound in the notification. |
| personal_missions | «ЛБЗ» | — (battle line → battle_progress) | Context card (§9.3) and window page. |
| platoon_helper | «Взвод» | — (session rows → session_stats) | Ready list only; the card shows only in a platoon. |
| comp7_helper, event_trackers | unchanged | — | Context cards, restyled. |
| replay_manager, hangar_tweaks, auto_resupply, notification_filter, hangar_cleaner, replay_upload | unchanged | — | Not HUD. |

### 3.3 Settings of the merged components

New keys on top of the surviving component's schema. «←» names the source of the migrated value (§5).

**damage_log**

| Key | Type, default | ← source |
|---|---|---|
| `sections` | `both` \| `dealt` \| `received`, `both` | replaces `log_kinds`; §5.2 rules |
| `dealt_lines` | int 0–10, 6 | `damage_log.log_lines`, else `hit_log.lines` |
| `received_lines` | int 0–10, 4 | `received_hits.lines` |
| `group_by_target` | bool, True | `hit_log.group_by_target` |
| `show_hp` | bool, True | new (hit_log always had it) |
| `show_misses` | bool, True: own ricochets and no-pens | new |
| `show_received_blocked` | bool, True: hits on you that did no damage | new |
| `show_assist_rows` | bool, True | `log_kinds != 'received'` |
| `arty_summary` | bool, False | switch `battle_arty_meter` |
| `hit_card` | bool, True | `last_hit.enabled` |
| `hit_card_s` | int 1–15, 5 | `last_hit.timeout_s` |
| `death_card` | bool, True | switch `battle_death_card` |
| `death_card_s` | int 0–60, 12 | `death_card.show_s` |
| `death_details` | bool, True: modules, crew, side | `death_card.show_modules` or `show_direction` |

Kept: `style` (full, compact, minimal, custom), `keep_stock`, `palette`, `kind_icons`, `alt_mode`, `template`, `entry_template`, `alt_entry_template`, `kind_colors`, `color_*`. Dropped: hit_log's and received_hits' templates (§5.4 notice).

**marks_panel:** `show_battle_panel` (bool, True; ← switch `battle_moe_panel`), `hangar_card` (bool, True; ← `hangar_marks` or `hangar_marks_history`), `hangar_style` (compact, extended; ← `hangar_marks.style`), `show_trend` (← `marks_history.show_panel`), `trend_battles`, `max_entries`, `page_rows` (← marks_history), `show_tank_ratings` (← `hangar_ratings.show_tank`), `show_tank_facts` (← `hangar_info.show_tiers` or `show_crew` or `show_training`).

**battle_progress:** `row_main_gun` (← switch `battle_main_gun`), `row_record` (← `battle_personal_best`), `row_wn8` (← `battle_efficiency`), `row_goals` (← `session_goals.show_battle`), `row_missions` (← `personal_missions.show_battle`), `main_gun_share` (← `main_gun.show_team`), `record_metrics` (damage, assist, frags; ← `personal_best.show_*`), `colored` (← `battle_efficiency.colored`). A row with no data (no binding, no site goal, no mission for this class) is hidden, and the plate hides when no row is left.

**reload_timer:** `show_arc` (← switch `battle_gun_arc`), `arc_degrees` (← `gun_arc.show_degrees`), `arc_warn_deg` (← `gun_arc.warn_deg`).

**battle_loadout:** no new keys; the `battle_consumables` switch is dropped silently (the schema ignores an unknown key).

**session_stats:** `show_goals` (← `hangar_session_goals` and `session_goals.show_hangar`), `max_goals`, `goal_sound` (← `session_goals.sound`), `tilt` (off, row, row_and_notice; ← `hangar_tilt_guard`, §4.2), `loss_streak`, `session_battles`, `damage_drop` (← tilt_guard), `show_account` (← `hangar_ratings.show_account`), `metric_*` (← hangar_ratings), `show_platoon` (← `platoon_helper.show_session`).

**battle_results:** `hits_tab` (← switch `hangar_battle_hits`), `hits_keep_battles`, `hits_show_attacker` (← battle_hits), `record_notice` and `record_sound` (← `battle_personal_best`, `personal_best.show_card`, `personal_best.sound`), `arty_tab` (← switch `battle_arty_meter`), `arty_keep_battles` (← `arty_meter.keep_battles`).

**hangar_info:** `battle_clock` (bool; ← switch `battle_clock`), `battle_clock_format` (← `battle_clock.clock_format`), `replace_timer` (← `battle_clock.replace_timer`).

### 3.4 Before and after

| | Before | After |
|---|---|---|
| Catalogue entries (without dependencies) | 47 | 32 (−16 deleted, +1 battle_progress) |
| Battle panels, everything on | 20 | 9, plus 2 transient cards |
| Battle panels, defaults on | 9 | 6 (team_hp, damage_log, marks_panel, battle_loadout, sixth_sense, battle_clock; last_hit transient) |
| Hangar cards, everything on | 10 | 2, plus up to 3 context cards and the clock strip |
| Own-damage counters | 4 | 1: a shared `core` battle tally that damage_log, battle_progress, marks_panel and platoon_points read |
| Session trackers | 4 | 1 |

Deleted packages: `hit_log`, `received_hits`, `death_card`, `arty_meter`, `battle_hits`, `hangar_marks`, `marks_history`, `hangar_ratings`, `session_goals`, `tilt_guard`, `personal_best`, `main_gun`, `battle_efficiency`, `gun_arc`, `consumables`, `battle_clock`.

---

## 4. Defaults

Principle: **on** only what almost every player needs and what is clearly better than stock. **Off**: what changes the client's behaviour **without** a clearly better preset, what needs a site binding before it shows anything, what is niche, what duplicates stock. A client-changing component is on only when the leading packs agree on a preset for it (§4.4).

What the leading packs tick in their default install (Lebwa and Near_You from their installer headers, Battle Observer's `armagomen` preset from `install/scripts/components.iss`, Jove from the configs it ships; Jove's own ticked set could not be decoded): gunmarks in all four; a custom crosshair in Lebwa, Near_You and Jove; the equipment row (kurzdor `battleequipment`), battle hits (poliroid `battlehits`) and the replay manager in Lebwa and Near_You; a clock in Lebwa, BO and Jove; session statistics in Lebwa and Near_You; no dynamic camera plus horizontal stabilisation in Lebwa; the XVM minimap (445 m circle, centred zoom) in Jove. No pack cleans the hangar, filters chat or adds sounds by default.

### 4.1 After the merge

| On by default | Why |
|---|---|
| marks_panel (battle panel, Tank card, history page) | The product's core; every pack ships a marks panel on. |
| damage_log (both sections, hit card, death card) | Better than the stock log: outcome, HP left, shell, received source in one place. Jove ships both logs and a hit pop-up on. |
| team_hp | Team HP and diff replace the stock strip (Lebwa `teamhp` skin 1 with the difference, BO `league`). |
| sixth_sense | Every pack replaces the stock lamp. |
| battle_loadout (shell line off) | Lebwa and Near_You tick `battleequipment`. The stock bar shows only devices with a live state (`battle_loadout/client/reads.py`), not the full set, the ★ slots or directives. |
| **crosshair** (preset `minimal`, §4.4) | Lebwa, Near_You and Jove all ship their own reticle instead of stock; the stock grid is what they remove. |
| **camera** (dynamic camera off, stabilisation on) | Lebwa ships `noDynamic: full` and `horizontalStabilizer: full`; the stock camera shake is the most common complaint. |
| **minimap** (445 m circle, own view circle, names on Alt) | Jove's XVM minimap ships the 445 m circle; BO ships the real view radius. All are the game's own options. |
| **hangar_info** (hangar strip and battle clock) | A clock in hangar and battle is on in Lebwa (`mode: hangar-battle`), BO (`clock.json`, the only module on in its raw config) and Jove (the XVM hangar widget). |
| hud_layouts | Invisible; a layout per battle type. |
| session_stats (goal rows, account line) | Lebwa and Near_You ship session statistics on. Goal and account rows fill after binding (no extra switch). Tilt: `off`. |
| battle_results (hits tab on, record notice off) | Post-battle summary with the MoE change; the hits tab is poliroid `battlehits`, ticked in Lebwa and Near_You. |
| replay_manager | Ticked in Lebwa and Near_You; a window page. |
| personal_missions (card; battle row off) | Shows only while missions are in progress. |
| comp7_helper | Shows only in Onslaught. |

| Off by default | Reason |
|---|---|
| hangar_tweaks | Packs disagree on the carousel (Jove 2 rows, Lebwa `rows: 0` = the client's own). |
| auto_resupply | Sends client requests; acts only on a button anyway. |
| hangar_cleaner, notification_filter, chat_filter | Override client views. No pack does this by default: Jove's XVM `hangar.xc` shows all promos, pmod's `battleChat.cleaner` is off everywhere, BO filters only in its own preset. |
| battle_sounds | Needs a sound mod with Wwise events; XVM `sounds.xc` is off in Jove and Lebwa. |
| battle_progress | Packs split (BO main gun on, Lebwa `displayMainGun: false`); WN8 and goals need binding. |
| reload_timer (+ arc) | Repeats the stock reticle's reload indicator; no pack ships a separate one. |
| platoon_points, platoon_helper, event_trackers, bush_circle, streamer_mode | Niche (Jove ships `circle_15m`, the others do not). |
| replay_upload, share_session_report | Privacy (already off). |

Against the coordinator's proposal: crosshair, camera, minimap and hangar_info move to **on** with the presets of §4.4, because the packs agree on them. reload_timer is added to **off**. hangar_marks and marks_history live on inside marks_panel; hangar_ratings and session_goals are session_stats rows that fill after binding.

### 4.2 Existing players: switches

The `defaults_revision` mechanism in `packages/companion/config/constants.py` moves a switch to a new default only when it **still holds the old default** and the file predates the revision (`RETIRED_DEFAULTS`). It cannot tell «never touched» from «chose the same value». Three guards:

1. **Revision 3 entries** (`(3, key, True, False)`): `hangar_tweaks`, `battle_sounds`, `battle_chat_filter`, `hangar_auto_resupply`, `hangar_notification_filter`, `hangar_cleaner`, `streamer_mode`, `hangar_platoon_helper`, `battle_bush_circle`, `battle_reload_timer`, `hangar_tilt_guard`. `crosshair_presets`, `camera_tweaks`, `minimap_tweaks` and `hangar_info` stay `True`.
2. **Configured components are kept.** A switch of a view- or client-changing component (hangar_tweaks, chat_filter, notification_filter, hangar_cleaner, auto_resupply) flips only when its `components.json` section equals the schema defaults: a player who set up a filter keeps it. `core/client/hud` loads `components.json` next to `config.json`, so the upgrade step has both.
3. **Record choices from now on:** the settings window adds the key to a new `config.json` list `user_set` whenever the player changes a switch or a component value. Later revisions change only keys not in `user_set`.

### 4.3 Presets

| Preset | Components |
|---|---|
| «Рекомендуемый» (`recommended`) | Exactly the «on» set of §4.1: marks_panel, damage_log, team_hp, sixth_sense, battle_loadout, crosshair, camera, minimap, hangar_info, hud_layouts, session_stats, battle_results, replay_manager, personal_missions, comp7_helper (plus the required core, companion, ui). |
| «Минимальный (FPS)» (`minimal`) | marks_panel, sixth_sense, hangar_cleaner (unchanged; the player picks it, and its description promises the clean hangar). |
| «Стример» (`streamer`) | recommended + battle_progress, reload_timer, streamer_mode. |
| «Свой» (`custom`) | unchanged. |

The catalog's `default` flag (the «Рекомендуемый» membership, [catalog README](../../apps/game/modpack/catalog/README.md)) is set from this table. A new check in `test_manifest` keeps the recommended preset equal to the set of switches whose default is `True`.

### 4.4 Default values

A fresh install must come pre-set, not only switched on. Every value below is the schema default after this change; «=» means unchanged. **(client)** marks values that write the client's own settings.

- **crosshair:** `preset: minimal` **(client)**: no grid (`net 0`), centre marker 100, dispersion circle 60, gun marker 100, reload bar 60, reload timer 100, cassette 100, no damage-state indicator, no zoom indicator. `modes: both`. `server_reticle: native`: every pack leaves the server reticle off or on a hotkey, so we never force it. `mark: none`: the stock centre marker stays (Lebwa ships `central_marker: false` for its own marker). `mark_size` 48, `mark_color` white =. Reason: the packs' reticles all drop the grid and keep the circle, the gun marker and the reload readout; `minimal` does exactly that with the game's own reticle.
- **camera:** `preset: native`, `dynamic_camera: off` **(client)**, `horizontal_stabilization: on` **(client)**, `sniper_zoom: remember` **(client)** (the game's «Запоминать последний»; no pack forces an entry zoom). Zoom steps and arcade distance (Lebwa `zoomX [2…24]`, `arcadeDistance [2,75]`) stay out: the client has no option for them, and they are not the game's own settings.
- **minimap:** `max_view_range: on` (the 445 m circle, as in Jove's XVM), `view_range: on` (own view circle, BO `real_view_radius`), `draw_range: off`, `vehicle_names: alt`, `size: native`, `transparency: native`; all **(client)**.
- **sixth_sense:** `icon_set: lamp`, `icon_size: 64`, `pulse: on`, `show_timer: on` (BO shows the timer), `tick_sound: off`, `hide_after_s: 0` (the lamp's own duration, made equipment-aware as the code study recommends), `lamp_sound: native`, `replace_stock: on` =.
- **damage_log:** `style: full`, `sections: both`, `dealt_lines: 6`, `received_lines: 4`, `group_by_target: on` (Jove's XVM hit log: `groupHitsByPlayer: true`), `show_hp: on`, `show_misses: on`, `show_received_blocked: on` (Jove: `showHitNoDamage: true`), `show_assist_rows: on`, `arty_summary: off`, `hit_card: on`, `hit_card_s: 5` (Jove's pop-up stays 10 s; 5 keeps the chat readable), `death_card: on`, `death_card_s: 12`, `death_details: on`, `alt_mode: on` (BO switches templates on Alt), `keep_stock: off`, `palette: graphite`.
- **team_hp:** `style: full`, `show_score: on`, `show_diff: on` (Lebwa `displayDifference: true`), `show_alive: off`, `replace_stock: on`, `pinned: on` =.
- **marks_panel:** `style: compact` (was `extended`; the one-line plate of §8.4, details on Alt), `color_mode: delta`, `step: 0.5`, `show_targets`, `show_step`, `show_battles`, `show_up: on`, `show_battle_panel: on`, `hangar_card: on`, `hangar_style: compact`, `show_trend: on`, `trend_battles: 5`, `show_tank_ratings: on` (fills after binding), `show_tank_facts: on`.
- **battle_loadout:** `pinned: on`, `icon_size: 40`, `shell_stats: off`.
- **reload_timer** (once turned on): `show_bar: on`, `show_clip: on`, `show_ready: off`, `show_arc: on`, `arc_degrees: on`, `arc_warn_deg: 5`.
- **battle_progress** (once turned on): all five rows on, `main_gun_share: off`, `record_metrics: damage`, `colored: on`.
- **hangar_info:** `clock_format: %H:%M`, `date_format: %d.%m` (Lebwa `variant: date`), `show_server`, `show_ping`, `show_online: on`, `battle_clock: on`, `battle_clock_format: %H:%M`, `replace_timer: off`. The battle clock hides below 1800 design px of width, as Lebwa's does.
- **session_stats:** `session_idle_minutes: 60` =, `show_goals: on`, `max_goals: 3`, `goal_sound: on`, `tilt: off`, `show_account: on`, `show_platoon: off`, `metric_wn8`, `metric_win_rate`, `metric_avg_damage: on`, `metric_eff: off`.
- **battle_results:** `bonus_types: all`, `show_economy`, `show_combat`, `show_marks: on`, `hits_tab: on`, `hits_keep_battles: 10`, `hits_show_attacker: on`, `record_notice: off`, `record_sound: off`, `arty_tab: off`, `history_size: 30` =.
- **hud_layouts:** random and comp7 `full`, frontline and event `compact`, battle royale `off`, `own_places: on` =.
- **Components that are off** keep today's values, which are all neutral: every client-writing key `native`; chat_filter's filters on (they act only once the player turns it on); `hide_promo`, `hide_teaser`, `hide_offer_banners` on, `hide_event_entries` off; auto_resupply flags `native`; bush_circle `hotkey`, `ctrl_shift_b`, white; streamer hotkey `ctrl_shift_h`.

### 4.5 Applying default values

**Mod-internal values** (everything not marked «client»): `components.json` stores every default, so a new default value applies to a player **only if the key still holds the old default** and is not in `user_set`. The revision-3 step carries a `RETIRED_VALUES` table of `(revision, section, key, old, new)`, the `components.json` counterpart of `RETIRED_DEFAULTS`. Examples: `(3, 'marks_panel', 'style', 'extended', 'compact')`, `(3, 'battle_loadout', 'icon_size', 45, 40)`, `(3, 'hangar_info', 'clock_format', '%H:%M:%S', '%H:%M')`.

**Client values** (crosshair, camera, minimap): these components write only after a change in our window, in the hangar (`core/client/native/component.py`), and `native` means «the game's value». A player's current reticle, camera and minimap may be their own choice made in the game's settings window, so:

1. **Fresh install** (no `config.json` in either durable location): the first time the player reaches the hangar with the switch on, the component writes its non-native defaults once, through the same `apply_changed` path. Before writing, it stores the values it replaces in `state.json` → `native_backup.<component>`. The card shows «Настроено модом · Вернуть как было»; the button writes the backup back and sets the keys to `native`. A stamp `native_initial_applied: 3` prevents a second run.
2. **Existing players:** their `native` values stay `native` and nothing is written. The card offers the recommended values as one click («Рекомендуемые настройки»), with the same backup.
3. A value the player later changes in the game's own settings window stays: the component re-applies only on a change in our window, as today.

## 5. Migration

One upgrade step, **revision 3**, runs where `upgraded()` runs today (`companion/config`), before any feature reads its settings. It works on the durable copy that won (`core.durable.open_config`), so the %APPDATA% mirror and the `mods/configs` copy end up identical. It writes `components.json.r2.bak` next to the file before the first change.

### 5.1 Manager and packages

- New catalog field **`supersedes: [ids]`** on the surviving entry: damage_log ← hit_log, received_hits, death_card, arty_meter; marks_panel ← hangar_marks, marks_history; battle_progress ← main_gun, battle_efficiency, personal_best; reload_timer ← gun_arc; battle_loadout ← consumables; session_stats ← session_goals, tilt_guard, hangar_ratings; battle_results ← battle_hits; hangar_info ← battle_clock.
- On update the manager (a) selects the survivor if any superseded id was installed, (b) removes the orphaned `.mtmod` through the existing staged `RETIRED_SUFFIX` rename in `tauri/src/patch/stage.rs` (their files match `ownedPatterns`), and (c) shows one line per merge: «Хит-лог теперь часть «Журнала боя»». Saved component sets and profiles in the manager are rewritten with the same map.
- `conflicts` in catalog.json: replace deleted ids (xvm: damage_log, sixth_sense, minimap; damage_log_mod: damage_log; battle_observer: team_hp, damage_log, battle_progress, hangar_info, sixth_sense, session_stats; marks_calculator: marks_panel).
- Server: `apps/web/server/src/modules/mod-sync/lib/library-items` and the modpack-releases changelog tests reference old ids; they take the same map.
- МОСТ: one bundle with the new set; each deleted package's `## <id>` CHANGELOG entry gets a last version saying where it went.

### 5.2 config.json switches

`MERGED_SWITCHES` (revision, target, rule), evaluated before the old keys are dropped from `DEFAULTS`:

| Target | Rule |
|---|---|
| `battle_damage_log` | on if any of `battle_damage_log`, `battle_hit_log`, `battle_received_hits`, `battle_death_card` is on. `damage_log.sections`: `dealt` if only `battle_hit_log` of the log switches was on, `received` if only `battle_received_hits`, else `both`. |
| `battle_moe_panel` | on if it, `hangar_marks` or `hangar_marks_history` is on; `marks_panel.show_battle_panel` keeps the old `battle_moe_panel` value. |
| `battle_progress` (new) | on if any of `battle_main_gun`, `battle_efficiency`, `battle_personal_best` is on (all were opt-in, so on means chosen), or `session_goals.show_battle` / `personal_missions.show_battle` is True. |
| `battle_reload_timer` | on if it or `battle_gun_arc` is on (after the §4.2 flip). |
| `battle_loadout` | unchanged; `battle_consumables` is dropped. |
| `hangar_session_panel` | on if it, `hangar_session_goals` or `hangar_ratings` is on. |
| `hangar_battle_results` | on if it or `hangar_battle_hits` is on. |
| `hangar_info` | on if it or `battle_clock` is on. `hangar_info.battle_clock` takes the new default (on): the old `battle_clock` switch was opt-in, so «off» cannot be told from «untouched». |

The old keys leave `FEATURES` and `DEFAULTS`. `Schema` drops unknown keys on save, so they disappear after the first write.

### 5.3 components.json sections and positions

- **Surviving panel ids keep their sections untouched:** `damage_log`, `last_hit`, `death_card`, `marks_panel`, `hangar_marks`, `reload_timer`, `battle_loadout`, `battle_clock`, `hangar_info`, `team_hp`, `sixth_sense`, `platoon_points`.
- **Moved keys** are copied by a `MERGED_SECTIONS` table of `(old_section, old_key) → (new_section, new_key)` (every «←» of §3.3). An old key is copied only when it differs from its old default, so a new default is not overwritten by an old default.
- **New defaults for unmoved panels:** each moved default place (§7) adds the old default to that panel's `RETIRED_PLACES`, so a panel still at an old default or retired place goes to the new place, and a place the player chose stays. This is the existing mechanism.
- **battle_progress place:** the first of `main_gun`, `battle_efficiency`, `personal_best`, `session_goals`, `personal_missions` whose place is not its default or a retired place; otherwise the new default.
- **Dropped sections** (`hit_log`, `received_hits`, `arty_meter`, `main_gun`, `battle_efficiency`, `personal_best`, `session_goals`, `personal_missions` battle-place keys, `gun_arc`, `consumables`, `tilt_guard`, `hangar_ratings`, `marks_history`, `battle_hits`) are removed after the copy. `ComponentConfig` would otherwise keep them forever.
- **`hud_layout_places[mode]`:** the same id map; entries of dropped panels are removed, battle_progress takes the first moved predecessor.
- **Docks and aliases** (`core/hud/panel/constants.py`): `DOCKS`, `DOCK_ANCHORS`, `COMPACT_PANELS` (`hud_layouts`), `STOCK_ALIASES` owners, and the streamer-mode block list (`otmetki.hangar_ratings`, `.session_goals`, `.marks_history` → `otmetki.session`, `otmetki.hangar_marks`) take the new ids.

### 5.4 Templates, profiles, tests

- Custom templates of dropped panels (`hit_log.line_template`, `header_template`, `alt_line_template`, `received_hits.line_template`, `main_gun.template`, `battle_efficiency.template`, `personal_best.template`) cannot map onto the widget. They move to `components.json` → `_legacy.<id>.<key>`, and the window shows a one-time notice listing the reset templates.
- Profiles (`packages/ui/profiles/snapshot.py`) hold raw `config` and `components`. The codec bumps its version and runs the same revision-3 function on load, so an old profile applies cleanly.
- Tests: one fixture per old id (an old `config.json` + `components.json` pair, moved and unmoved) → the expected merged pair; the `test_manifest` preset check (§4.3); `test_layout` keeps working because every surviving feature keeps its folder shape.

---

## 6. Design system

Values are battle design px at interface scale 1 (1 rem = 1 px in the HUD build, `postcss-pxtorem` rootValue 1). All values become a `$hud` map in `@otmetki/design-tokens` (`scss/_hud.scss`), read with `token()` like the other maps. The TS duplicate `HUD_TONE_COLORS` is generated from it or deleted, and Python stops sending colours: it sends tone names only.

Renders: the mock page `mock/blocks.html` in this session's scratchpad (rendered with Warhelios and the client's own icons from `unicum-gg/wot.assets` branch Lesta); PNGs `mock/ds-type.png`, `mock/ds-plate.png`, `mock/ds-color.png`.

### 6.1 Plate: one style, two fills

| Fill | Where | CSS |
|---|---|---|
| **solid** | Free-standing plates: marks, battle progress, incoming card, platoon points, all hangar cards | `linear-gradient(180deg, rgba(16,16,19,.74), rgba(16,16,19,.56))`, `border-top: 1px solid rgba(255,255,255,.07)`, radius 2 |
| **edge-fade** | Blocks glued to a stock element or a screen edge: damage log, team HP, shell line, hangar clock strip | Left-anchored: `linear-gradient(90deg, rgba(10,10,12,.62) 0, rgba(10,10,12,.40) 60%, transparent)`. Centred: an ellipse of the same stops. No edge line. |
| none | Reticle-area and corner readouts: reload/arc, lamp, battle clock, loadout slots | Text shadow only |

- **No rails, no caps titles in battle.** The icon and the number carry the meaning. Caps titles (11 px, 700, tracking 1) exist only on hangar cards.
- Text shadow everywhere: `0 0 2px rgba(0,0,0,.9), 1px 1px 1px rgba(0,0,0,.9)` (the `hud-text` mixin). `HudLabel`'s own `1px 1px 2px` variant goes.
- Dividers: 1 px `rgba(255,255,255,.08)`. Bar tracks: `rgba(255,255,255,.10)`, 3 px (8 px only for team HP).
- One transient state: the incoming card starts with `linear-gradient(180deg, rgba(90,28,22,.72), rgba(16,16,19,.56))` for 300 ms (replaces the `.flash` class's hard-coded rgb).
- Tooltip (Ctrl or cursor): solid `rgba(14,14,16,.92)`, padding 6/8, width 240, title 15/700, text 11. Same as the existing `EquipmentTip`; it becomes the shared `HudTip`.

### 6.2 Type: five steps

Warhelios (`warhelios, 'Arial Narrow', arial`), weights 400 and 700 only.

| Step | Size / line | Weight | Use |
|---|---|---|---|
| caption | 11 / 14 | 400, `muted` | Labels, units, notes, secondary facts; `caps` variant (700, uppercase, tracking 1) for hangar titles |
| body | 13 / 18 | 400 | Names, goal text, row labels |
| value | 15 / 18 | 700 | Every number in a row |
| key | 20 / 24 | 700 | The one headline number of a block: MoE %, score, lamp seconds, session battles |
| hero | 28 / 32 | 700 | The incoming card's damage only |

Numbers: every changing number sits in a box with a `min-width` for its widest value, aligned right in rows and left in totals (Warhelios digits are not tabular and Gameface has no `font-variant-numeric`). Formatting as in the previous spec §4.3 (U+202F thousands, U+2212 minus, decimal comma for percents, a dot for reload seconds).

The `text-*` tokens are in rem at a 16 px base, which is wrong under the HUD's 1 rem = 1 px. `$hud` defines its own `hud-type-*` sizes in px; a `hud-type($step)` mixin sets size, line height, weight and colour.

### 6.3 Spacing and sizes

- Scale: **2, 4, 8, 12** (the `space-1…4` values). Nothing else.
- Plate padding: solid battle 4/8; hangar card 8/12 (bottom 10); edge-fade 4/24/4/8 (the fade side gets 24).
- Row height: 18 in battle, 20 on hangar cards. Gap between stacked plates: 4. Gap between an icon and its number: 4; between groups: 8 (12 on hangar cards).
- Widths: 230 for a battle plate (the stock damage panel's `PANEL_WIDTH`), 270 for the log (330 on Alt), 300 for the incoming card, 264 for a hangar card, 600 for team HP.
- Icons: 16 in rows; 20 for modules and the hangar-card key icon; 24 for the marks icon and the class on the incoming card; 40 for equipment slots (44 slot box).

### 6.4 Colour: HUD tones

One table, dark only (the HUD has no light theme). Tones are brighter than the site tokens where the site value drowns on sky or snow.

| Tone | Hex | Use |
|---|---|---|
| `text` | #F4F1EA | Default text (warm white, like the stock HUD) |
| `muted` | #A8A49A | Labels, captions, secondary |
| `dim` | #6F6C64 | Hints («Alt — подробнее»), draws |
| `ally` | #7CD35B | Ally HP, ally class icons |
| `enemy` | #E3564A | Enemy HP, target HP bars |
| `enemy-cb` | #9188FE | `enemy` when the client's colour-blind option is on |
| `dealt` | #FF9A3C | Own damage |
| `received` | #F1705B | Damage to you, the incoming card |
| `blocked` | #8EA4B5 | Blocked by your armour, own no-pen/ricochet rows |
| `radio` / `track` / `stun` | #80A6CC / #A9B56C / #B774E0 | Assist kinds |
| `gold` | #E8B84A | Progress toward a target (marks, main gun, record), gold shells, ★ slots |
| `good` / `bad` | #4CC36B / #EB7276 | Deltas, reached thresholds, wins/losses |
| `warn` | #D9B23C | Near a limit (traverse stop), tilt warning |

- **Tones are for data, never for decoration.** Header icons, bullets and dividers are `text` or `muted`. The brand orange appears only on the «///» button and in edit-mode frames.
- The palette option of the logs (`graphite`, `classic`, `contrast`, `colorblind`) remaps these tones; `graphite` is this table.
- Rating colours (WN8, win rate) stay the `rating-*` token scale.
- `ally`, `enemy`, `enemy-cb` replace Python's `COLOR_UP`/`COLOR_DOWN` in team_hp; the `ally_color`/`enemy_color` options stay as overrides.

### 6.5 Icons

The inventory and the `img://` rules of the previous spec §2 stand. Changes:

- **Shell type: a chip, not a bitmap.** `shell/small/*.png` and `ammopanel/battle_ammo/*.png` are 43–55 px pictures with a tracer; at 16 px they are unreadable. The chip is 20×14, caption 10/700, 1 px `text` border at 45 %, text ББ, БП, КС, ОФ, ОФ-П (HE premium), БС (HESH), КС-П. Premium: `gold` text and border. Jove's received log does the same (shell icon + ББ/БП text). The shell bitmap stays only where it is 40 px or bigger (equipment tooltips).
- Class: `vehicleTypes/red|green/<cls>.png` (17×21) in log rows and the incoming card; `vehicleTypes/white` in hangar rows.
- Outcome: `library/critical_damage/hit_critical` (pen with crit), `hit_blocked`, `hit_ricochet`, `hit_spaced_armor_blocked`, `hit_miss_armor` at 16; plain pen: our `damage` glyph in `dealt`; hit on you: our `received` glyph.
- Totals: `library/efficiency/48x48/{damage,help,armor,stun}` at 16, received = our `received` glyph.
- Received source: `efficiency/48x48/fire`, `…/ram`, our `fall`, our `ammo_rack`.
- Marks: `library/marksOnGun/mark_{1,2,3}.png` 24 (20 on the Tank card).
- Progress rows: our glyphs `target` (main gun), `record` (cup), `wn8` (spark), `goal` (flag), `mission` (clipboard), all 16, `text` tone; the new-glyph list of the previous spec §2.4 adds `goal`.

### 6.6 States

Every block defines the same four states:

| State | Rule |
|---|---|
| default | The minimum that answers the block's question in one glance. |
| Alt (or the `alt_mode` key) | Adds detail **in place**: the block grows away from its anchor (up for bottom-anchored blocks, down for top-anchored ones), never covering its neighbour. |
| empty | Hidden. A block never shows zeros or «нет данных» in battle; in the hangar a card with no data collapses to its header line. |
| hover tooltip | Only where there is a cursor (Ctrl in battle, always in the hangar), through `useTooltip`/`HudTip`: equipment slots, the Tank card's thresholds, the Session card's goals. |

Edit mode (the previous spec §4.8) shows every panel with preview data in its Alt state.

---

## 7. Layout map

Renders at 1920×1080, scale 1, over the stock-element boxes of the harness: `mock/battle-1080.png`, `mock/hangar-1080.png`.

### 7.1 Battle

```
┌debug┐                    ┌──── team_hp (600) ────┐ ┌ progress 230 ┐        ┌ stock timer ┐
                           │ 3 200 ████░ 2:1 ░█ 900 │ │ ◎ Осн.кал 1850/2940│      │   07:00     │
┌players L 368┐            └────────────────────────┘ │ ♛ Рекорд …       │      └─────────────┘
│             │                                        └──────────────────┘ ┌players R┐ 🕑 17:13
│             │                      (lamp at stock spot)                     │         │
│             │                              ◉ 7                              │         │
└─────────────┘                                                               └─────────┘
                                             ○  reticle
                                      ▬▬▬▬▬▬▬░░ 3.2   (reload, H/2+76)
                                          [ББ] 3/4
                                      ‹3° ●───┼───┤ 17°›
                                       ┌ ribbons ┐
┌chat 360──────┐
│              │
├──────────────┤┌ KV-1        −310 [ОФ] ┐  incoming card, docked on the log
│ damagePanel  ││ ✚1190 ⟳480 ⛨240 ⇩310  │  damage_log at x 229 (stock log spot)
│   230        ││ 390 ✹[ББ]◆ Pz.IV ▬      │  dealt section
│              ││ −310 ⇩[ОФ]◆ KV-1         │  received section
│              │└──────────────────────┘  [eq][eq][eq]│[net]  [stock consumables]  [▮▮ 86,30 % +0,18 95 % 3 900]   ┌minimap┐
└──────────────┘                                          [ББ] 258 мм 390 1 000 м/с (shell line, off)
```

| Block | Anchor (default place) | Grows | Stock neighbour |
|---|---|---|---|
| team_hp | top centre, y 0, width 600, replaces `fragCorrelationBar` | — | Capture bars stay under it (stock y ≈ 62) |
| battle_progress | top, left edge at cx + 308, y 4 | down | Right of team HP, as Battle Observer and pmod place Main Gun (cx + 260…290). If `W < 1700` it docks under team HP instead (y 52, centred). |
| battle_clock | right 8, top 46 | — | Under the stock timer (184×44) |
| sixth_sense | the stock lamp spot (cx − 109 + 43, H/2 − 225 + 43), centred | — | Replaces `sixthSense` |
| reload_timer | centre, top H/2 + 76 | down | Between the reticle (±20) and the ribbons (H/2 + 150). Follows the server reticle offset |
| damage_log | x 229, bottom = damage panel bottom − 6 | up | Replaces the stock log at its spot |
| last_hit / death_card | docked on top of the log; death card: centre, top H/2 − 200 (the lamp is gone when you are dead) | up | Covers the chat's bottom lines for `hit_card_s`; live check |
| battle_loadout | right edge = stock bar left − 12, bottom = H − 8 | — | Left of the stock bar, as Lesta's own equipment row and kurzdor's `battleequipment` (live bar width from Python). If it would meet the log (`x < 229 + 270 + 8`) it goes above the bar (the current place). |
| shell line | centre, bottom = H − 58 − 4 | — | Above the stock bar |
| marks_panel | left edge = stock bar right + 12, bottom = H − 8 | up | Right of the consumables bar, as Lebwa (cx + 300, H − 108) and Near_You (cx + 180). Must end left of the minimap (`W − minimap.width − 8`); otherwise it docks above the bar's right half. |
| platoon_points | under battle_progress in the same dock | down | — |

The top left and the whole centre band stay empty by default. Every place is computed from stock anchors in design px (the previous spec §4.9); `placeRect` clamps to the screen.

### 7.2 Hangar

| Block | Anchor | Stock neighbour |
|---|---|---|
| Tank card (`hangar_marks`) | x 16, top 426 | Under the stock crew panel (y 84–414) |
| Session card (`session`) | x 16, under the Tank card + 8 | — |
| Context cards (ЛБЗ, Взвод, Натиск, event) | the same left column, under Session | Shown only when relevant; when the column runs out of height (two-row carousel), cards collapse to their header line and expand on hover |
| Clock strip (`hangar_info`) | x 0, bottom = carousel top − 6 | Above the carousel, left of the stock ammunition panel |

The right side (vehicle parameters, entry points) stays stock. Today's right column (`hangar_right` dock at −16/570) goes: it lands on the entry points.

---

## 8. Battle blocks

Mocks: `mock/b-*.png` (2×). Sizes are 1× design px.

### 8.1 team_hp

```
        ░░░ 3 200 ▕░░░░░░███████▏  2 : 1  ▕██░░░░░░░░░▏ 900 ░░░
                   ◆ ◇ ◆◆           +2 300    ◆ ◇ ◇
```

- Edge-fade (centred), 600×48. Row 1 (26 px): ally HP (value 15, `ally`, min-width 52, right-aligned) · bar 170×8 filled from the centre outward · score (key 20; the colon `muted`) · bar 170×8 · enemy HP (`enemy`).
- Row 2 (18 px): class icons 16 under each bar in arena order, dead at 35 % and grey; the diff in the middle (caption 11, `good`/`bad`, signed).
- Bars: track `rgba(255,255,255,.10)`, 1 px dark outline `rgba(0,0,0,.5)`, fill 100 %.
- Styles kept (full, segments, icons, compact, minimal, numbers, bars); all use these sizes. `compact` = row 1 only.
- Alt: nothing extra (the stock Tab screen covers it).

### 8.2 damage_log «Журнал боя»

```
✚ 1 190   ⟳ 480   ⛨ 240   ⇩ 310                 totals: icon 16 + value 15, dealt/radio/blocked/received
──────────────────────────────                  divider
 390  ✹ [ББ] ◆ Pz. IV ▬▬░░                      dealt: amount · outcome · shell chip · class · name · HP bar 32×3
      ⤾ [ББ] ◆ T-34 ×2                          own ricochet, grouped, name muted
 480  ((•))    ◆ IS                               assist row (radio tone)
 320  ✹ [БП] ◆ T-34 ▬░░░                        gold chip = premium shell
──────────────────────────────
−310  ⇩ [ОФ] ◆ KV-1                              received: −amount in received tone
 240  ⛨ [КС] ◆ IS                                hit on you blocked (blocked tone)
−120  🔥       пожар                              source row
```

- Edge-fade (left), width 270, anchored bottom-left at the stock log spot; the received section is nearest the damage panel. Rows 18 px, newest on top in each section; only the newest row animates in.
- Row grammar: amount (value 15, min-width 40, right-aligned; empty for no-damage rows) · 8 · outcome icon 16 · 4 · shell chip · 4 · class 16 · 4 · name (body 13, max 96, `muted` when no damage) · 8 · extras.
- **Alt** (width 330): target HP number after the bar, «+1 крит», «боеукладка», outcome words («рикошет», «не пробил · экраны»), and with `arty_summary` a last caption row «арта: 2 попад. · 3 накрытия · −740».
- `style: compact`: the totals row only (26 px); rows on Alt. `minimal`: dealt and received totals only.
- `sections: dealt` hides the received section and the received total; `received` the reverse.
- Empty: before the first event only the totals row with zeros hidden, i.e. the block is hidden until the first number.

### 8.3 Incoming card (last_hit, death_card)

```
hit:        ┌──────────────────────────────────────┐   300 × 40, docked on the log
            │ ◆◆ KV-1                  −310  [ОФ]  │   class 24 · name value 15 · damage hero 28 received · chip
            └──────────────────────────────────────┘
destroyed:  ┌──────────────────────────────────────┐   300 wide, centre, top H/2 − 200
            │ ВАС УНИЧТОЖИЛ                         │   caption caps
            │ ◆ Pz. IV                 −390  [ББ]  │
            │ ──────────────────────────────────── │
            │ [engine][gun]  [gunner][loader]  ◔ сзади слева │ modules 20, crew 14, side dial 18 + body 13
            └──────────────────────────────────────┘
```

- Hit card: solid plate with the 300 ms red start (§6.1), then normal, fades out after `hit_card_s`. A new hit replaces it.
- Destroyed: shown on own death for `death_card_s` (0 = until the end). The side dial is an 18 px ring with the hit sector filled `received` (8 sectors, the direction the stock hit indicator reported). Source instead of shell for fire, ram, fall; the ammo rack as a module icon.
- Empty: never shown without a hit.

### 8.4 marks_panel (battle)

```
default:  ┌────────────────────────────────────┐   230 × 34
          │ ▮▮ 86,30 %  +0,18        95 % 3 900 │   mark icon 24 · key 20 (tone by color_mode) · body 13 delta · caption + value
          └────────────────────────────────────┘
Alt:      │ 65 ✓  85 ✓  95 3 900     +0,5 %: 955 │   caption row: reached levels good
          │ ср. 2 540 → 2 566      до 95 % ~45 боёв │
          │ ▮▮ 86,30 %  +0,18        95 % 3 900 │   the main row stays at the bottom (the anchor)
```

- Solid plate, 230 wide, bottom-anchored right of the consumables bar (§7.1).
- The percent is the projection after the battle; the right group is the damage needed this battle for the next threshold (`up` or `next`, as today). At 100 % it shows the battles to 3 marks instead.
- Colours: `color_mode delta` → percent `good`/`bad`; `mark` → mark tier colours; `off` → `text`.
- Styles: `extended` = Alt rows always shown; `compact` = the default above; `minimal` = icon + percent + delta; `custom` = the template as text in the same plate.
- «оценка» (not verified by the dossier) is a `dim` caption «≈» before the percent, not a badge.
- Empty (no curve yet): the plate shows `▮▮ 86,12 %` and a `dim` caption «нет порогов».

### 8.5 battle_progress «Прогресс боя»

```
┌───────────────────────────────────────┐   230 wide, rows 18 + 3 px bar, 4 px apart
│ ◎ Осн. калибр          1 850 / 2 940 │   glyph · body label muted · value 15 / muted target
│   ▬▬▬▬▬▬▬▬▬░░░░░                      │   bar gold (done → good, failed → bad, row label «провален»)
│ ♛ Рекорд танка         1 850 / 6 812 │
│   ▬▬▬░░░░░░░░░░                       │
│ ✦ WN8 боя            ~2 862  танк 2 105 │   no bar; value coloured by rating scale
│ ⚑ Цель: ср. урон         ещё 1 450    │   bar text tone
│ ▤ ЛБЗ СТ-7             1 850 / 3 000 │
└───────────────────────────────────────┘
```

- Solid plate. Row order fixed: main gun, record, WN8, goal, mission. Each row hides while it does not apply (main gun reached and `main_gun_share` off; no record row; no binding; no goal; no mission for this class).
- Main gun: failed (ally hit) → label «провален», value `bad`, no bar; unreachable → «недостижим», `muted`. Reached → value `good`, bar full `good` for 3 s, then the row collapses to one line.
- Alt: main gun adds «доля 30 % · команда 6 120» caption; record adds assist and frags rows when `record_metrics` has them.
- One own-damage source: the shared `core` battle tally.

### 8.6 reload_timer «Орудие»

```
        ▬▬▬▬▬▬▬▬▬░░░░░░ 3.2        bar 120×3 dealt tone (ready: good, «готово» caption 1 s)
            [ББ] 3 / 4             clip: chip + caption 11 (magazine guns only)
     ‹ 3° ├●──────┼──────┤ 17° ›    traverse: 120 px scale, limit ticks 9 px, centre tick 5 px, gun dot 7 px
```

- No plate. Centre, top H/2 + 76. Seconds value 15, left-aligned right after the bar (min-width 34, so the bar does not move).
- Traverse row only on vehicles with yaw limits and `show_arc`. The side at or under `arc_warn_deg` turns `warn` (tick, dot and degrees), `bad` under 0.5°.
- Empty: hidden when loaded and not a magazine, unless `show_ready`.

### 8.7 battle_loadout «Оборудование и снаряды»

```
[⚙★][⚙★][⚙] │ [◉◉]          slots 44 (icon 40), 4 apart; ★ corner 11 gold; divider 1×28 between groups
 ↑ bonus border gold 55 %     active (net, binoculars): border good, fill good 18 %; used: 45 % alpha
```

- No plate; slots have their own frame: fill `rgba(8,8,10,.45)`, border `rgba(255,255,255,.14)`, radius 2, like the stock bar's slots.
- Groups: equipment | field-mod set badge («набор 2/2», caption on a `rgba(255,255,255,.08)` chip) | directives.
- Ctrl tooltip (`HudTip`): name (value 15), effect (caption `text`), the ★ bonus line in `gold`.
- Shell line (`shell_stats`): edge-fade centred, one row: chip · `258` мм · `390` урон · `1 000` м/с (values 15, units caption). `all` shows one row per shell, the loaded one in `text`, others `muted`.

### 8.8 sixth_sense

- Unchanged in function. Ring 84 (radius 38, stroke 4, `dealt` tone draining over the lamp time), icon 56, seconds key 20 in `dealt` under the ring. Dark ring track `rgba(10,10,12,.35)` so it reads on sky.

### 8.9 Battle clock (hangar_info)

- `🕑 17:13`: clock icon 16, body 13 `muted`, right 8, top 46. On by default; hidden below 1800 design px of screen width (Lebwa's rule). No battle timer unless `replace_timer` (then the stock timer is suppressed and the timer shows at key 20 in its place with the clock under it).

### 8.10 platoon_points

- Solid plate 230. Header row: body «Очки взвода» `muted` · key 20 `gold` total. Member rows 18: class 16 · name (own in `gold`) · caption «фр. 2» · value 15. HP as a 70×3 `ally` bar under the name only on Alt.

---

## 9. Hangar blocks

Mocks: `mock/h-tank.png`, `mock/h-session.png`, `mock/h-info.png`, `mock/hangar-1080.png`.

### 9.1 Tank card (marks_panel, panel `hangar_marks`)

```
┌──────────────────────────────────────────┐  264 wide, solid, padding 8/12
│ [flag] EBR 105 X            ▮▮ 86,12 %   │  flag 22×15 · value 15 · tier caption · mark 20 · key 20 gold
│ ──────────────────────────────────────── │
│ прошлый бой +0,01  за 5 боёв −0,12  ╱╲╱╲• │  caption + body deltas · sparkline 60×16 of the last N battles
│ 65 ✓  85 ✓  95 28 295 за бой   ~45 боёв  │  thresholds · battles to next (gold)
│ среднее 2 540   темп 3 400               │
│ Alt — подробнее                           │  dim hint (only when Alt has more)
├ Alt ─────────────────────────────────────┤
│ WN8 2 310   побед 56 %   боёв 213        │  show_tank_ratings (site; rating colours)
│ бои 10–11 ур. · до навыка 3 297 546 · …  │  show_tank_facts (from hangar_info)
│ прошлый бой: ⇩ −510 · 2 проб. · корма    │  battle_results hits summary
└──────────────────────────────────────────┘
```

- Replaces the four left cards (marks, history, wounds, ratings). One tank name, one percent.
- Hover on the thresholds row: tooltip with the damage for each level and the pace forecast. Click opens the marks history page in the window.
- Empty: no MoE yet → header only, with «нет данных об отметке» as a caption.

### 9.2 Session card (session_stats)

```
┌──────────────────────────────────────────┐
│ СЕССИЯ                          12 боёв  │  caps caption · key 20 + caption
│ ──────────────────────────────────────── │
│ побед 58 %   урон 2 140   WN8 2 310      │  caption + value 15 (win rate good/bad around 50 %, WN8 rating colour)
│ ▬▬▬▬▬▬▬▬▬▬▬▬                             │  last 10–12 results, 14×5 blocks, good/bad/dim
│ ──────────────────────────────────────── │
│ Ср. урон 3 000                     2 740 │  goals (after binding): body + value, bar 3 gold, done: good ✓
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬░                        │
│ 3 поражения подряд — сделайте паузу      │  tilt row (tilt ≠ off), body warn
│ аккаунт: WN8 2 105 · 52,3 % · 1 980      │  show_account (after binding), caption
│ во взводе: 2 боя · 50 %                  │  show_platoon, caption
└──────────────────────────────────────────┘
```

- «Ждут итогов: N» becomes a caption after the battles count («12 боёв · 1 ждёт итогов»).
- Actions stay in the window (new session, share report).
- Empty (0 battles): header «СЕССИЯ · 0 боёв» and the account line only.

### 9.3 Context cards: ЛБЗ, Взвод, Натиск, events

- Same card: caps title, value group on the right of the header, divider, body rows 20, caption details.
- ЛБЗ: header chips «в работе 5 · с отл. 360»; rows: mission name (body) + main condition (caption). Max `max_missions`.
- Взвод: only in a platoon; header `2 / 3` (key `good` + muted); rows ✓/… + name.
- Натиск: header rating (key `gold`) and division caption; rows: to next division with a 3 px bar, thresholds, role skill.
- Events: as today's cards, restyled.

### 9.4 Clock strip (hangar_info)

- Edge-fade centred, one row 18: clock 16 · `17:13` value 15 · `21.09` caption · 12 · `RU5` body `muted` · ping icon 14 + `16 мс` body (tone by band) · 12 · «онлайн» caption + `5 148` body.
- Bottom left above the carousel (§7.2). The tank rows it had move to the Tank card.

### 9.5 Window pages

- battle_results page per battle: tabs «Сводка» (today's detail rows), «Попадания по мне» (the battle_hits figure and list, `hits_tab`), «Арта» (when hit by SPG, `arty_tab`). The session row stays at the top of the list.
- marks_panel page: today's marks_history list and marks report.
- The window already renders tabs and figures (`ListPage`, `MarksReport`); the pages move, the UI code does not change.

---

## 10. Implementation order

Each step ships on its own and leaves the pack working.

1. **Design system first** (visible win, no migration): the `$hud` token map (plate fills, tones, type, spacing), the `hud-type()` mixin, `HudPlate` fills `solid`/`edge-fade`, `HudTip`, the shell chip; remove rails and battle titles from the `card` renderer; Python sends tone names only. Every existing panel picks up the new look.
2. **Migration framework:** revision 3 in `companion/config` (`RETIRED_DEFAULTS`, `MERGED_SWITCHES`, the configured-component guard, `user_set`), `MERGED_SECTIONS` + `RETIRED_PLACES` + `hud_layout_places` rewrite in `core/hud`, the profile codec bump, catalog `supersedes`, and the manager's orphan removal and set rewrite. Fixture tests per old id.
3. **Battle log** (the user's main complaint): damage_log with two sections, hit card, death card, arty summary; delete hit_log, received_hits, death_card, arty_meter.
4. **Battle progress:** the shared own-damage tally in `core`; battle_progress; delete main_gun, battle_efficiency, personal_best (its post-battle part goes to battle_results in step 7).
5. **Bottom and centre:** marks_panel to the right of the bar, battle_loadout left of it with the shell line; reload_timer absorbs gun_arc; delete consumables, gun_arc; the battle clock into hangar_info.
6. **Hangar Tank card:** marks_panel absorbs hangar_marks and marks_history; the tank ratings and tank facts rows; delete hangar_marks, marks_history, hangar_ratings (after step 7 takes the account row).
7. **Session and results:** session_stats absorbs session_goals, tilt_guard, the account row, platoon session rows, one session boundary; battle_results absorbs battle_hits, the record notice, the arty history; delete the rest.
8. **Defaults, default values and presets** (§4): the revision-3 switch flips, `RETIRED_VALUES`, the one-time client apply with `native_backup` and «Вернуть как было» for crosshair, camera and minimap, `user_set`; CHANGELOG entries for every deleted package, catalog texts, previews, `conflicts`, the server's mod-sync ids.

Steps 3–7 each remove their old packages in the same change, so no release ships a component and its merged copy together.

## 11. Live checks

- The incoming card over the chat's bottom lines at 1080p (x 229–529); if unreadable, dock it at the log's right edge instead.
- The live width of the stock consumables bar in Python (slot count × 57) for the loadout and marks anchors; both fallbacks at 1280×720 and 21:9.
- battle_progress right of team HP at 1600–1700 design px width against the right players panel.
- Warhelios in the Gameface page without an `@font-face` (the page relies on the game font today).
- Revision-3 migration on real player files: a file with a configured chat filter keeps it on; an untouched file flips.
- Fresh install: the one-time apply of the crosshair, camera and minimap defaults in the first hangar, then «Вернуть как было» restores the exact previous reticle dicts, camera and minimap values.

---

## 12. Settings window audit (2026-10-03)

The player's verdict on the in-game window: too many options, some of which should not be options at all; nothing shows what a field changes; the header reads as generated. This section is the field-by-field decision, written before the change, and the rules the window follows after it.

### 12.1 Rules

- **Keep** a field when it changes something the player sees or needs.
- **Advanced** («Дополнительно», folded): a real choice that few players make (privacy details of the upload, custom templates, tournament rules, the placement of a docked panel).
- **Delete** internal knobs, duplicates of game settings, numeric tuning nobody touches, second-count timers, hex colours where a palette or swatch exists, anything only a developer understands.
- A deleted key becomes a **fixed value**: `core.settings.fix(schema, FIXED)` drops it from the schema (so it leaves `config.json` / `components.json` on the next save and the window never shows it) while `Settings.get` still answers the constant, so the code that read it keeps working. `FIXED` lives in the feature's `settings/constants.py` with the old default.
- **The panel look keys** of `core.hud.panel_schema` (`font_size`, `border`, `alpha`): the window never shows `font_size` (the HUD edit wheel scales the whole panel, the type scale is fixed by §6.2) and `border` (a layout debug frame); `alpha` («Прозрачность») moves to «Дополнительно». They stay in `PANEL_DEFAULTS` until the HUD renderer stops reading them (outside this change).
- Migration entries (`MERGED_SECTIONS`, `RETIRED_VALUES`) that target a deleted key go with it.
- Every component with a look gets the full-window editor: a live preview (the real HUD widget, or a schematic for the stock minimap and camera), fields in named groups, galleries for visual choices, swatches for colours, a hint on hover. A feature declares it in `model/editor.py` (`editor(settings, translate)`) and its folded fields as `ADVANCED` in `settings/`; the window picks both up with no UI code. Components without a look keep the card, with a summary of what they do (the chosen keys as key chips, the checked items as a list).

### 12.2 Per component

K = keep, A = advanced, D = delete (fixed value in brackets).

| Component | K | A | D |
|---|---|---|---|
| companion «Данные и сайт» | send_battle_results, share_settings | send_moe_snapshots, send_queue_times, send_loadouts, send_shots, settings_target, settings_anonymous_stats, settings_include_resolution, settings_include_sensitivity, hud_modifier | flush_interval_seconds (15) |
| aim_info | armor_under_aim, show_piercing, show_nominal, show_angle, target_distance, shell_tooltips, aim_circle | aim_circle_scale, placement | arcade_offset (132), sniper_offset (132), strategic_offset (100) |
| auto_reserves | reserve_xp, reserve_crew_xp, reserve_free_xp, reserve_credits, when | — | — |
| auto_resupply | auto_repair, auto_load, auto_equip, auto_boosters | — | — |
| battle_hotkeys | server_aim_key, zoom_key | — | notice_s (2) |
| battle_loadout | — | pinned | icon_size (40), stock_size (on) |
| battle_progress | row_main_gun, row_record, row_wn8, record_metric | main_gun_share | colored (on) |
| battle_results | hits_tab, bonus_types, show_combat, show_economy, show_marks | hits_show_attacker, history_size, template | colored (on), hits_keep_battles (10) |
| bush_circle | mode, hotkey, color | — | — |
| camera | preset, sniper_zoom, dynamic_camera, horizontal_stabilization | — | — |
| chat_filter | filter_duplicates, block_words, timestamp_format | rate_limit, filter_commands | duplicate_window_s (30), rate_window_s (10) |
| comp7_helper | show_thresholds, show_battles, show_skill | — | font_size (14) |
| crew_xp | show_card, show_tooltip | — | font_size (14) |
| crosshair | preset, modes, server_reticle, mark, mark_size, mark_color, mark_hides_centre | — | — |
| damage_log | style, sections, dealt_lines, received_lines, group_by_target, show_hp, show_misses, show_received_blocked, show_assist_rows, alt_mode, palette | keep_stock, template, entry_template | kind_colors (on), kind_icons (on), color_damage, color_assist, color_blocked, color_received ('': the palette), alt_entry_template ('') |
| depot_seller | sell_shells, sell_modules, sell_equipment, sell_consumables, dismiss_crew | include_fitting, include_special, crew_with_skills | — |
| event_trackers | show_triathlon, show_caravan | triathlon_shown | font_size (14) |
| free_camera | hotkey, in_replays, in_hangar, hide_ui | — | — |
| gun_arc | show_bar, show_degrees, show_yaw | placement | warn_deg (5), arcade_offset (96), sniper_offset (96), strategic_offset (64) |
| hangar_cleaner | hide_offer_banners, hide_teaser, hide_event_entries | — | — |
| hangar_info | clock_format, date_format, show_server, show_ping, show_online, battle_clock | replace_timer, template | battle_clock_format (%H:%M), font_size (14) |
| hangar_space | — (the page picks the hangar) | space | — |
| hangar_tweaks | carousel_rows, carousel_tiles, interface_scale, quick_actions | interface_scale_exact | — |
| hud_layouts | random, comp7, frontline, event, battle_royale | own_places | — |
| marks_panel | show_battle_panel, style, color_mode, alt_detail, show_targets, show_battles, hangar_card, hangar_style, show_trend, show_tank_ratings | show_battle, show_step, show_up, show_mastery, show_research, trend_battles, template | step (0.5), max_entries (100), page_rows (50) |
| minimap | size, transparency, vehicle_names, view_range, max_view_range, draw_range | — | — |
| notification_filter | hide_promo, hide_reminders, hide_friend_requests, hide_clan | — | — |
| personal_missions | show_hangar, show_conditions, max_missions | — | font_size (14) |
| platoon_points | show_platoon, show_solo | damage_step, assist_step, frag_points, alive_points | — |
| preset_advisor | equipment, directives, consumables | — | — |
| quick_demount | — | show_locked | max_vehicles (20) |
| replay_manager | auto_rename, notify_analysis | name_template | — |
| responsive_reticle | follow | — | — |
| session_stats | show_goals, show_moe, show_account, metric_wn8, metric_win_rate, metric_avg_damage, metric_eff | max_goals, session_idle_minutes, share_session_report, share_session_channel | — |
| sixth_sense | icon_set, color (six swatches instead of a hex field), show_timer, pulse | text, replace_stock | hide_after_s (0: as long as the stock lamp), icon_size (56), icon ('') with the `custom` icon set |
| streamer_mode | hotkey, private, hide_chat, hide_hangar_stats | keep_hidden | — |
| team_hp | style, show_score, show_diff, show_alive | replace_stock, pinned, template | ally_color, enemy_color (the §6.4 tones), bar_width (30), icon_width (3) |
| update_notice | show_card, notify | — | font_size (14) |
| every HUD panel | — | alpha | font_size, border (hidden by the window, see 12.1) |

### 12.3 Editors

| Component | Preview | Groups |
|---|---|---|
| sixth_sense | the lamp widget | Значок (icon_set gallery, color swatches, pulse) · Таймер (show_timer) |
| team_hp | the strip | Вид (style) · Счёт (show_score, show_alive, show_diff) |
| damage_log | the log | Вид (style, palette) · Разделы (sections, dealt_lines, received_lines) · Строки (group_by_target, show_hp, show_misses, show_received_blocked, show_assist_rows, alt_mode) |
| marks_panel | the battle panel and the Tank card | В бою (show_battle_panel, style, color_mode, alt_detail) · Цифры (show_targets, show_battles) · В ангаре (hangar_card, hangar_style, show_trend, show_tank_ratings) |
| battle_loadout | the equipment row | only folded fields |
| minimap | a schematic minimap whose size, transparency, names and three circles follow the fields | Карта (size, transparency, vehicle_names) · Круги (view_range, max_view_range, draw_range) |
| camera | a schematic sniper view: zoom, stabilisation, shake | Пресет (preset) · Снайперский режим (sniper_zoom, horizontal_stabilization) · Камера (dynamic_camera) |
| session_stats | the Session card | Сессия (show_moe) · Цели (show_goals) · Аккаунт (show_account, metric_*) |
| hangar_info | the clock strip | Время (clock_format, date_format) · Сервер (show_server, show_ping, show_online) · В бою (battle_clock) |
| gun_arc | the traverse scale | Шкала (show_bar, show_degrees, show_yaw) |
| aim_info | the armour readout | Броня (armor_under_aim, show_piercing, show_nominal, show_angle) · Цель (target_distance) · Снаряды и сведение (shell_tooltips, aim_circle) |
| platoon_points | the points row | Кого показывать (show_platoon, show_solo) |
| battle_progress | the progress plate | Строки (row_main_gun, row_record, record_metric, row_wn8) |
| crosshair | unchanged | unchanged |

### 12.4 Window chrome

- **Header:** a compact brand mark and the window title on the left; the search in the centre with a «Ctrl+F» hint; on the right one status chip (bound: the account name; not bound: «Мод не привязан»), an overflow menu «⋯» with zoom, language and «Сбросить окно», and the close button.
- **Page header:** icon, title and a one-line description; actions right-aligned. The «Все / Ангар / Бой» filter shows only on a page that lists both hangar and battle cards (not on Replays, Streamers, Data, Tools).
- **Sidebar:** the counter reads «13 вкл.» instead of «13/14».
- One spacing rhythm (4/8/12/16/24) and the type scale of the tokens; no decoration without a purpose.
