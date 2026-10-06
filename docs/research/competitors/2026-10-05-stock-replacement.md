# Stock elements our components replace (research 2026-10-05)

The player's complaint: some components draw their own version of a stock HUD element and leave the stock one on
screen, so both show (the crosshair's reload box next to the stock reticle's reload timer). The convention of the
established packs is: **while the replacement is on, the stock element is hidden; when it is off, the stock element is
back.** This note lists every catalogue component that overlaps a stock element, what the packs do with that element,
and what we do now. It builds on [behaviour parity](2026-10-05-behavior-parity.md), [the code study](2026-09-30-modpacks-code.md)
and spec §0 «no stock duplicates» ([HUD consolidation](../../specs/2026-09-30-hud-consolidation-and-design.md)).

## Mechanism

| Kind of stock element | How we hide it | Precedent |
| --- | --- | --- |
| A battle page component (`BATTLE_VIEW_ALIASES`) | The panel's `stock_aliases()`; `core/client/hud/stock` wraps `SharedPage._setComponentsVisibility` so the page's own re-shows never bring it back, and gives it back with `as_setComponentsVisibilityS` | team_hp, damage_log, sixth_sense, battle clock (since modpack 0.1.x) |
| A part of the stock reticle (one opacity key of the crosshair panel's settings) | The panel names `core.hud.stock.RETICLE_PARTS` in `stock_aliases()`; `core/client/hud/stock/reticle.py` wraps `CrosshairPanelContainer.setSettings` and hands the panel those keys at opacity 0, never writing the saved settings | new (crosshair, this change) |

Both are Python view hooks of the client, not Flash patches and not client settings writes. Both hide only while the
panel runs, the Gameface page draws widgets and (reticle parts) our readout is actually drawn in the current camera mode
for the own vehicle; they give the element back when the component or the option is switched off, on GUIFlash, when the
battle page goes, and when a wrapper fails (`core.hooks.override` hands the client the untouched call).

Proof the page-component hiding works on the live client: `python.log` of 2026-10-04 17:37 — `stock on
classicBattlePage: found battleDamageLogPanel, battleTimer, fragCorrelationBar, sixthSense, hidden battleDamageLogPanel,
fragCorrelationBar, sixthSense`, restored at the battle's end.

## Inventory

«Hidden now» is after this change. «Convention» is what the packs do with the same stock element.

### Battle

| Component (option) | Stock element | Convention (who, source) | Hidden now | Mechanism |
| --- | --- | --- | --- | --- |
| crosshair `reload_box` | Reticle reload timer (`reloaderTimer`) | Replace: reticle packs (Jove, PROTanki, Near_You) ship their own `crosshairPanel` art with the timer in it; nobody shows two timers | **yes** (was no) | reticle part `reloaderTimerAlphaValue` |
| crosshair `reload_box` magazine cells | Reticle magazine indicator (`cassette`) | Replace (same packs) | **yes**, only while our cells show (magazine guns) | reticle part `cassetteAlphaValue` |
| crosshair `reload_arcs` (off by default) | Reticle reload indicator (`reloader`) and HP indicator (`condition`) | Replace (same packs) | **yes** while the arcs are on | reticle parts `reloaderAlphaValue`, `conditionAlphaValue` |
| crosshair `repair_timers` | Repair timers on the stock damage panel's module icons | **Keep**: no pack hides the damage panel (BO, XVM, Jove restyle around it) | no, by design | — (ours is a copy beside the reticle, see «Pure duplicates») |
| damage_log | `battleDamageLogPanel` (summary totals and both detail logs) | Replace when the pack's log is on: XVM `damageLog` (`disabledDetailStats`, `disabledSummaryStats` — the XVM config keys that switch the stock parts off; from the XVM config reference, not re-read here); BO `wg_logs.json` only trims the stock log (`wg_log_hide_assist`, `wg_log_hide_block`, `wg_log_hide_critics`) and empties its containers when its own logs take them (`ExtendedDamageLogsUI.as:21-34`) | yes (`keep_stock` off by default) | page component |
| team_hp | `fragCorrelationBar` | Replace: BO `TeamsHealthUI.as:23` takes the bar over, pmod removes its children, XVM hides it (code study §3) | yes (`replace_stock` on; not for the «numbers only» overlay style) | page component |
| sixth_sense | `sixthSense` | Replace: BO `SixthSenseUI.as:52` `hideComponent(SIXTH_SENSE)`; Near_You swaps `sixthSense.swf` | yes (`replace_stock` on) | page component |
| hangar_info battle clock | `battleTimer` | BO keeps it under its clock (`clock.json`), and hides it only for its own battle timer (`ObserverBattleTimerUI.as:26` `hideComponent(BATTLE_TIMER)`, `battle_timer.json`) | only with `replace_timer` (off), as BO | page component |
| battle_loadout | `consumablesPanel` | **Keep**: kurzdor `battleequipment` (Jove, Lebwa) places its row beside the stock panel (code study §4) | no, by design | — (different content: the equipment set) |
| aim_info distance | Reticle target distance (`TargetDistancePlugin`) | — | n/a: we widen the stock readout itself (`_should_track`), nothing is drawn twice | — |
| crosshair `aim_circle` (stock) | Stock aiming circle | — | n/a: scales the stock circle, nothing is drawn twice | — |
| aim_info `armor_under_aim` (off) | none (stock shows only the marker colour) | — | n/a | — |
| marks_panel, battle_progress, platoon_points, gun_arc, bush_circle, battle_hotkeys notice | none (no stock MoE, main gun, record, WN8, tournament points, traverse scale, 15 m circle) | — | n/a | — |
| battle_results (previous battle's card) | none in battle | — | n/a | — |
| minimap, camera, hud_layouts, responsive_reticle, streamer_mode, chat_filter | Stock minimap/camera/chat themselves (game options or the stock view filtered) | — | n/a: nothing is drawn twice | — |
| Stock ribbons (`ribbonsPanel`) | — | **Keep**: BO, XVM (restyles them), Jove keep the efficiency ribbons next to their logs | not ours to hide | — (see «Damage and hit counters» below) |

### Hangar

| Component | Stock element | Convention | Hidden now | Note |
| --- | --- | --- | --- | --- |
| battle_results | Stock post-battle service message | PMOD extends the one stock message | n/a: our lines go **into** the stock message | one message per battle |
| session_stats | Stock «Статистика сессии» pop-up behind a button | Keep (BO, wotstat widgets are extra) | n/a | ours is glanceable and has WN8/goals; spec §0 keeps it |
| marks_panel Tank card | none (MoE % only in the vehicle's achievements) | XVM/PMOD add MoE % to tiles | n/a | — |
| crew_xp card | Stock crew panel | Jove: a line in the stock crew tooltip only | n/a | card already off by default (pure duplicate) |
| update_notice card | — | Korben/Jove: one notification | n/a | card **on** by default: a permanent card for a one-time message (behaviour parity P2) |
| comp7_helper | Stock Onslaught header widget (rating, division) | Lebwa «Статистика в Натиске» adds its card | n/a | partly repeats the stock rating/division; the Champion/Legend thresholds are new |
| personal_missions | Stock missions button and quest panel | — | n/a | battle panel already deleted (stock quest panel) |
| hangar_info clock | none | BO `clock.json` | n/a | — |
| notification_filter, hangar_cleaner | Stock notifications, banners | Their whole job is hiding stock elements on the player's switch | already | — |

## What competitors deliberately keep

- **The damage panel** (HP, modules, crew, repairs): every pack keeps it; XVM and BO only restyle text around it.
- **The consumables panel**: kurzdor's equipment row and `advancedconsumablespanel` restyle or sit beside it, never
  replace it.
- **The ribbons**: kept by BO and Jove, restyled by XVM.
- **The battle timer under a clock**: BO's clock (`clock.json`) leaves it; only BO's separate battle timer replaces it.
- **The stock minimap**: packs add circles (game options) or patch it in Flash; nobody draws a second minimap.

## Pure duplicates (keep stock, ours repeats it) — for the player to decide

Not deleted here (spec §0 says delete; the player decides):

| Component part | Repeats | Suggestion |
| --- | --- | --- |
| crosshair `repair_timers` (on) | the stock damage panel's repair timers on the module icons | turn off by default, or delete |
| update_notice `show_card` (on) | its own notification | `show_card: False` (behaviour parity P2) |
| comp7_helper rating/division lines | the stock Onslaught header | keep only the thresholds and the role skill |

## Damage and hit counters

The player also reported «the hit counter and the damage counter shown together». The live log (above) shows the stock
damage log hidden in a random battle, so it is not the stock log. What is drawn twice in the default set:

| What | Where | Convention |
| --- | --- | --- |
| This battle's own damage, three times | damage_log totals (`dealt`), battle_progress «Осн. калибр» row (`1 850 / 2 940`) and its «Рекорд танка» row (`1 850 / 6 812`) | BO's main gun shows the damage **left** to the medal (`main_gun.json`), its totals log the dealt damage; nobody repeats the dealt number in the medal rows |
| Damage and the number of hits per target | damage_log dealt rows (`IS 320`, `T-34 x2`) and the stock ribbons («Урон» with its count) | packs keep the ribbons next to their hit logs (XVM hitlog + ribbons) |

Needs the player's confirmation which pair he means (a screenshot). If it is the first, the fix is battle_progress
showing the damage still needed («−1 090» to the main gun, «−4 962» to the record), as BO does; if it is the ribbons,
the game's own ribbon options turn the «Урон» ribbon off and our component should not hide stock ribbons by itself.

## Not hidden, and why

- **Streamer mode (`set_muted`)** takes our panels off the screen but the replaced stock elements stay hidden: the
  player then sees neither until the hotkey again. Fixing it means the stock suppression following the HUD layer's mute
  state (core/hud layer), which another change was touching at the same time; left as a follow-up.
- **GUIFlash fallback**: stock elements are never hidden (the GUIFlash text is not a full replacement), so the crosshair
  readouts' plain text shows next to the stock timer there. By design.
- **Nothing needed a Flash patch.** The reticle parts go through the crosshair panel's own settings call.

## Live checks

1. Random battle, crosshair on with defaults: the stock reload seconds in the reticle are gone, ours count; `python.log`
   has `HUD: stock reticle ['reloaderTimerAlphaValue'] hidden`.
2. Switch «Таймер перезарядки у прицела» off mid-battle: the stock timer is back at once with the player's opacity.
3. Crosshair `modes: arcade`, go to sniper: the stock timer is back in sniper, hidden again in arcade.
4. An autoloader (magazine cells drawn): the stock magazine indicator hides; check it is really the stock magazine
   indicator (`cassette`) and not the shell count every vehicle shows.
5. After death (camera on an ally) and in a replay: the stock reticle is whole.
6. SPG strategic view: our readouts are not drawn there, the stock reticle is whole.
