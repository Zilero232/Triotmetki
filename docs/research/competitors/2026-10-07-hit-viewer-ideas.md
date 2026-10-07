# Hit viewer: what others offer and what we can do differently (research 2026-10-07)

Scope: our «Просмотр попаданий» (`apps/game/modpack/features/hit_viewer`, page `ui-web/src/views/hit-viewer`, README
«hit_viewer») against the mods and sites that show hits after a battle. The rule every idea is checked against:
[.claude/rules/modpack/fair-play.md](../../../.claude/rules/modpack/fair-play.md) and Lesta's forbidden list (README
«Fair play»): only the player's own battles and data, nothing analysed or shown in battle (no in-battle armour
calculator), no enemy positions, reload or aim data.

## Sources and limits

| Source                                          | What was read                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| poliroid BattleHits 2.4.1 (MIT)                 | Local copy `refs/mods/poliroid__battle-hits`: `_constants.py` (settings, model sets), `controllers/HangarScene.py` (shell, effect, splash and ricochet models, camera), `controllers/BattleProcessor.py` (shots, explosions, replays), `data/Hits.py` (sorting), `resources/in/mods/poliroid.battlehits/text/ru.yml`, `CHANGELOG.md` |
| BattleHits in packs                             | Shipped as «Боевые раны» / «Просмотр попаданий» in Jove, Lebwa, Near_You ([round 3](2026-09-29-modpacks-round3.md), [code study](2026-09-30-modpacks-code.md)); the WG Mod Hub lists it as «Battle Hits Viewer»: [Mod Hub spotlight](https://worldoftanks.eu/en/news/community/mod-hub-spotlight)                                          |
| WoTInspector Armor Inspector (WG)               | [wotinspector.com/en/mods/armorinspector](https://wotinspector.com/en/mods/armorinspector/): «Battle Hits Analysis: complete simulation of every shot from your most recent battles, free», penetration hitskin per gun and shell, HE analysis, crew and module positions, penetration along the trajectory (paid tiers) |
| XVM hit log, Battle Observer                    | [code study](2026-09-30-modpacks-code.md) «Damage and hit logs» (`hitLog.xc` macros, `groupHitsByPlayer`); `refs/mods/Armagomen__battle_observer/.../battle/armor_calculator.py` (an in-battle armour calculator under the reticle)                                                                                    |
| wotstat analytics                               | `refs/mods/wotstat__wotstat-analytics/.../loggers/onShotLogger.py`: every own shot with ballistics, the hit point, the target's modules and turret/gun pose, sent to wotstat.info for dispersion and accuracy charts                                                                                                    |
| tanks.gg, armor.wotinspector                    | [sites gap analysis](2026-09-29-sites-gap-analysis.md): armour viewer «with the gun of a compared tank», ricochet / penetration / triple-overmatch colours, a vulnerability map over a grid of angles                                                                                                                    |
| tomato.gg                                       | Searched 2026-10-07: no public replay or hit analysis found (stats only); SPA, WebFetch sees nothing                                                                                                                                                                                                                     |
| War Thunder «Hit analysis» (for contrast)        | Its forum threads ([1](https://forum.warthunder.com/t/suggestion-to-improve-penetration-analysis-in-replay/39264), [2](https://forum.warthunder.com/t/firebirds-improvements-to-custom-tank-sights-hit-analyzer/185172)): the shell path through modules, crew and spall, replayed per shot                              |

## What the others have

| Feature                                                                                     | Who                              | Ours (before this round)                                    |
| ------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| Hits on me / my hits, per battle, on the tank model in a separate hangar view               | BattleHits                        | Yes (same model)                                            |
| Shell model along the path, outcome marker                                                  | BattleHits                        | Yes (its own models)                                        |
| Turret and gun in the pose of the shot                                                      | BattleHits                        | Yes                                                         |
| Ricochet trajectory (the bounced-off path drawn as a model)                                 | BattleHits (`__updateRicochet`, `__updateOutRicochet`) | No                                       |
| HE splash sphere (small / middle / large)                                                   | BattleHits (`__updateSplash`)     | No (splash is not recorded at all, by our choice)            |
| Sorting by №, tank, result, damage                                                          | BattleHits (`data/Hits.py`)       | No (order of the battle)                                    |
| «Intermediate ricochet» marked apart from the final one                                     | BattleHits (`intermediateRicochet`) | Folded into «Рикошет»                                     |
| Several own vehicles in one battle («+N шт.»)                                               | BattleHits                        | One own tank per battle                                     |
| Session-only history / all battles; delete history                                          | BattleHits                        | Last N battles (1–30); «Очистить записи»                    |
| Process replays (hits recorded while watching a replay)                                     | BattleHits (`processReplays`)     | No                                                          |
| Two visual styles of the markers                                                            | BattleHits (`style1`, `style2`)   | One                                                         |
| Angle, nominal and effective armour per hit                                                 | — (BattleHits shows none)         | Yes (measured on the model)                                 |
| Battle picker with map, result, tier                                                        | BattleHits (plain list)           | Yes (richer)                                                |
| Full shot simulation: modules and crew on the path, penetration along it                    | Armor Inspector, War Thunder      | No                                                          |
| Penetration hitskin for a chosen gun and shell                                              | Armor Inspector, tanks.gg         | No (the site's armour page is the place for it)             |
| In-battle hit log (who, how much, crits)                                                    | XVM, Battle Observer, Jove        | `damage_log` (separate component)                           |
| In-battle armour calculator under the reticle                                               | Battle Observer, Near_You         | **Never** (Lesta forbids it; fair-play rule)                |
| Own-shot dispersion and accuracy over many battles                                          | wotstat.info                      | No                                                          |

Nobody aggregates the hits **on the player's own tank across battles**: BattleHits and Armor Inspector are strictly
per battle, wotstat aggregates the player's own shots (accuracy), never where the player gets penetrated.

## Ideas, ranked by value / effort

Value 1–5 (what the player learns), effort S / M / L. Fair play: ✅ own data, post-battle; ⚠️ needs care; ❌ forbidden.

| #  | Idea                                                                                                                                                                                                 | Value | Effort | Fair play                                                                                         | Status            |
| -- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ | ------------------------------------------------------------------------------------------------- | ----------------- |
| 1  | **«Броня танка»: where my tank gets penetrated over every kept battle**, per zone (ВЛД, НЛД, борт, корма, башня…), with the weak zone highlighted and a short tip. Nobody does it                       | 5     | M      | ✅ only received hits on the own tank, from the player's own book, in the hangar                   | **Done**          |
| 2  | **Hit zone instead of the bare part** in the list and card (from the point's place in its part's box, no model needed)                                                                               | 4     | S      | ✅ the same packed point the client draws                                                          | **Done**          |
| 3  | **Result filter** chips (pen / crit / block / ricochet / no damage) with counts; arrows step the filtered rows                                                                                       | 4     | S      | ✅                                                                                                 | **Done**          |
| 4  | **Tab totals**: damage and «броня держит N%» on me, «пробито N%» on enemies — the ricochet / non-pen «luck» of this battle                                                                            | 4     | S      | ✅                                                                                                 | **Done**          |
| 5  | Highlight the weak zone on the 3D model (fly the camera to the zone's centre, tint it)                                                                                                               | 4     | M      | ✅ hangar only                                                                                     | Next              |
| 6  | Zone filter: click a zone in «Броня танка» to list its hits (current battle) or open the battle with the most hits there                                                                              | 3     | S      | ✅                                                                                                 | Next              |
| 7  | Ricochet path model (BattleHits' `ricochets/*` models, already licensed) for ricochets                                                                                                               | 3     | M      | ✅                                                                                                 | Next              |
| 8  | Sort by damage / result / zone (BattleHits parity)                                                                                                                                                   | 2     | S      | ✅                                                                                                 | Next              |
| 9  | «Броня держит» trend per tank: this battle vs the tank's average (from #1)                                                                                                                          | 3     | S      | ✅                                                                                                 | Next              |
| 10 | Armour thickness on hover over the model after the battle                                                                                                                                            | 3     | L      | ✅ post-battle in the hangar only (the plate probe exists: `HangarStage.measure`); never in battle | Later             |
| 11 | Share a hit card image to the site / the battle's replay page, «hits» tab on the site's replay page from the uploaded replay                                                                         | 4     | L      | ⚠️ needs the binding; own battle only, never other players' names beyond what the replay page shows | Later (server)    |
| 12 | Compare two battles on the same tank (zones side by side)                                                                                                                                             | 2     | M      | ✅                                                                                                 | Later             |
| 13 | Record hits while watching an own replay (BattleHits' `processReplays`)                                                                                                                             | 3     | M      | ⚠️ only replays where the player is the recorder                                                   | Later             |
| 14 | Shot-by-shot timeline scrubber with the shooter's distance and angle replayed                                                                                                                       | 2     | L      | ⚠️ the shooter's position is enemy position data; we never store it (`model/hits` rule)          | **Rejected** for now |
| 15 | Distance filter                                                                                                                                                                                      | 2     | M      | ⚠️ same: needs the shooter's position                                                              | Rejected          |
| 16 | Modules and crew on the shell's path (Armor Inspector style)                                                                                                                                         | 3     | L      | ✅ post-battle, but needs collision data of internal modules the client does not ship            | Out of reach      |
| 17 | In-battle «you were penetrated in the ВЛД» hint or armour overlay                                                                                                                                    | —     | —      | ❌ in-battle armour analysis                                                                       | Never             |

Why #1 is «не как у всех»: the per-battle list answers «what happened», the profile answers «what do I keep doing
wrong on this tank». Its zones are approximate (the hit point's fractions of its part's box: front band split at half
height into upper and lower plate), so the panel says so; a weak zone needs at least 5 hits on the tank and 2
penetrations in the zone.

## What was implemented (hit_viewer 0.3.5, ui 0.9.8)

- `model/zones.py`: `zone_of(segments)`; `model/profile.py`: `armor_profile(battles, cd)`; `model/page.py`:
  `zone` per row, `tab_summary`, `profile_view`; the screen caches the profile by the own tank and the kept hits.
- `ui-web/src/views/hit-viewer`: `OutcomeFilter`, `ArmorProfile`, `HitColumn`, `ViewerBar`, `lib/hit-filter`,
  `model/hooks/use-hit-filter`, `use-armor-profile`, and a dev mock (`lib/viewer-mock`) so `bun run ui:dev` shows
  `/pages/viewer.html`.
- Performance: zones decode at most 8 packed ints per hit; the profile (≤ 30 battles × 160 hits) is built once per
  change of the kept battles, not on each of the settle loop's pushes.
