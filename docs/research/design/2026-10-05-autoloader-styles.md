# Autoloader readout by the reticle — styles and our pick

Date: 2026-10-05. Scope: the magazine (drum, clip, auto-reloader) of the **own** gun next to the reticle, and the
sniper zoom multiplier. Fair play: own vehicle only, the same data the stock reticle reads.

## Sources

- RU 1.45 client source (`refs/wot-src-ru`): `gui/battle_control/controllers/consumables/ammo_ctrl.py`,
  `gui/Scaleform/daapi/view/battle/shared/crosshair/plugins.py` (`AmmoPlugin`, `_makeSettingsVO`), `container.py`
  (`setZoom`), `gui/battle_control/controllers/crosshair_proxy.py`.
- Pack sources on hand: XVM, Battle Observer (Armagomen), Kurzdor, vacsav, wotstat. Jove, PROTanki and Near_You ship
  their sights compiled, so the notes on them come from their screenshots and listings (protanki.eu «Стандартный Плюс»,
  wotspeak sight pages, tankist.net Jove). The user's Near_You screenshot is the starting point.

## Four styles in the wild

| Style                    | Who                                                       | What it shows                                                                                                                                                                  | Where                                       |
| ------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Segmented arc (stock)    | the client; Jove and PROTanki «standard plus» sights keep it | a capacity arc with the loaded segments over it; `normal` → `warning` (≤ 50 %) → `critical` (1 shell); autoloaders get up to 19 `shell_N` clips and their own next-shell timer | a half-ring hugging the reticle              |
| Row of shell icons       | Near_You, Kellerman-style custom sights                   | one cartridge icon per round, loaded bright, fired grey; the intra-clip timer beside it                                                                                        | a horizontal strip next to the reticle      |
| Count only               | minimal sights                                            | «3/5», sometimes blinking when low                                                                                                                                             | right of the centre                         |
| Rings around the reticle | «info» sights (Kellerman, Destroyer)                      | the reload and the drum as rings, the timer left, HP and zoom right                                                                                                            | concentric with the reticle                 |

Battle Observer and XVM draw no drum of their own (BO's nearest is the off-by-default `dispersion_timer`).

### Zoom

The client already writes «x8» (`#ingame_gui:aim/zoom`, an integer, only above x1) under the opacity slider
`zoomIndicator`. XVM's `camera.sniper.zoomIndicator` («x{{zoom}}», green, right of the centre) sits in a section that is
off by default; Battle Observer only changes the zoom steps. So no pack turns its own zoom readout on by default: the
convention is the stock indicator, a pack's own one opt-in, right of the reticle.

## Our pick: a row of shell icons in the reload box

- **Shells above the reload value** (B.2.13 reload box): the row's right edge lines up with the value, so the box,
  the drum and the full time read as one block left of the reticle and the right side stays free.
- **A shell per round, drawn per kind**: AP ogive, APCR dart, HEAT cone with its probe, HE dome; the plain shell for a
  kind without its own icon (smoke, flame). Loaded `hud-text` with the HUD's dark outline, premium shells `hud-gold`,
  fired shells a dark ghost with a faint light outline: the spent slots never vanish, so the drum's size is read at a
  glance.
- **Scales with the magazine**: up to 6 rounds 6×15 px, 7–10 rounds 4×10 px, past 10 (autocannon belts) a count —
  the shell icon, «17» and a muted «/30». The thin cells of earlier versions stay as `drum_style: bars` (up to 12, then
  the same count), `off` leaves the magazine to the stock indicator.
- **Timers**: the value counts the next shell (the client's reload is the interval between shells while the drum has
  any); under it the **whole drum's reload** (`getShellChangeTime`, the reload before the client cuts it to the
  interval), never repeating the value. An auto-reloader (Swedish and Chinese per-shell reload,
  `onGunAutoReloadTimeSet`) fills its next empty shell from the bottom in `hud-index`, with its seconds left of the row
  and the refilling shell's own time under the value.
- **Loaded value** (gun ready, not counting): the next shot's reload, by the rule of RU 1.45
  `ammo_ctrl.setGunReloadTime` but read from the magazine (`getClipInterval`, `getLastAmmoCount`) rather than the
  snapshot's base: the interval while a shot leaves shells (an auto-reloader's last shell too), the whole magazine's
  reload for the last shot (or last burst). The snapshot's base is the uncut magazine reload when the reload came before
  the shells (the battle start), which put the whole reload in the value with the clip full. A counted reload whose
  base is shorter than its time left (cut against a stale shell count) takes the whole magazine's reload as its base.

| State                               | Value                          | Under it                  |
| ----------------------------------- | ------------------------------ | ------------------------- |
| Clip full or partial, ready         | interval, static               | whole magazine, static    |
| Last shell (last burst) ready       | whole magazine, static         | —                         |
| After a shot, shells left           | interval, counting             | whole magazine            |
| Clip empty                          | whole magazine, counting       | whole magazine            |
| Auto-reloader refilling             | next shot's reload             | refilling shell's time    |
| Single-shot gun                     | reload counting / full, static | full while counting       |
- **Motion** (Gameface-safe, transform and opacity only): a shot lifts the spent shell's bright copy 4 px and fades it
  over the dimmed slot in 220 ms ease-out; a refill raises the returned shells 2 px into place in 180 ms; in the count
  the figure ticks 2 px. Nothing animates on the first draw, colours never animate, so a quick drum never queues
  anything.
- **Stock parts**: the stock magazine indicator (`cassetteAlphaValue`) is hidden only while the payload the page
  confirmed draws our drum; `drum_style: off`, the box off, GUIFlash or an ally camera give it back.

**Zoom**: `show_zoom`, off by default (the convention above); when on, «x8.0» right of the reticle at the reload box's
mirrored offset, the «x» muted, only in the sniper view; the stock zoom indicator (`zoomIndicatorAlphaValue`) hides
while ours is drawn.

Not taken: the arc (it is the stock look, and our reload arc already sits on the left), rings (they crowd the reticle
centre the aiming circle needs), count only for short drums (it hides which shell is next and how many are spent).
