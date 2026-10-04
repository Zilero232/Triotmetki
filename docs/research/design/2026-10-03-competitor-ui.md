# Competitor UI and the «Три отметки» design language (2026-10-03)

The visual reference brief for the redesign of the in-game settings window and the HUD widgets. Part A covers what
Jove, Near_You, Lebwa and, for comparison, PMOD, PROTanki, XVM and the stock 1.45 HUD look like. Part B sets our own
language, with token values and component recipes. Part C is the change list mapped to files.

Builds on [2026-09-30-hud-consolidation-and-design.md](../../specs/2026-09-30-hud-consolidation-and-design.md) §6
(plates, five type steps, HUD tones) and [design-v4.md](design-v4.md) (site palette). Where this brief disagrees with
§6, this brief wins for **looks**. Layout, behaviour and defaults stay as §6–9 define them.

## 0. Sources and evidence

No reference images are stored in the repo. Every competitor image is the author's copyright with no stated licence,
so they are only linked here. Crops and colour samples were made in a scratch folder and thrown away.

| Pack | What was looked at | Evidence quality |
| --- | --- | --- |
| **Lebwa** | [lebwa.tv/hub/modpack-lebwa](https://lebwa.tv/hub/modpack-lebwa) and its preview images: `assets/images/mods/01.jpg` (marks, classic), `02-*` (crosshairs), `03–05`, `07-*` (PMOD variants, team HP, ear indicators), `08`, `09` (equipment), `screens-*` (mods settings, clock), `plus/06-Preview-0{1,2,3,5,6}-0.png` (Plus: crosshairs, 5 team-HP variants, artillery meter, tournament, marks history window) | High: 1920×1080 renders, colours sampled per pixel |
| **Jove** | [tankist.net/modpacks/jove](https://tankist.net/modpacks/jove): `node-images/slider/2018/09/jove-2.jpg` (in-hangar settings), `jove-3.jpg` (battle HUD), `inline-images/jove-install-1/2.jpg` (installer). [joves-modpack.ru](https://joves-modpack.ru/) `assets/modpak.jpg` (1.45 promo). [cyber.sports.ru 3385579](https://cyber.sports.ru/wotblitz/blogs/3385579.html) (hangar shot) | Medium. The battle shots are from 2018, but the 1.45 pack still ships the same PMOD/XVM/modsSettingsAPI building blocks (tankist feature list, 19.09.2026) |
| **Near_You** | [nearyou.team/modpack](https://nearyou.team/modpack) (page CSS, SVG frames, fonts), [cyber.sports.ru 3417104](https://cyber.sports.ru/wotblitz/blogs/3417104.html). Local: `%APPDATA%\Lesta\MirTankov\mods\gunmarks\nearyou_config.json` | **Low for the HUD.** No public in-battle screenshot was found. The site gives the brand language. The config shows that their marks mod is the shared `gunmarks` mod (the same folder holds `protanki_config.json`) with `minimized`, `always_alternate`, `always_colorblind` and `offset` |
| **PROTanki** | [protanki.tv/en](https://protanki.tv/en), [/ru/mods](https://protanki.tv/ru/mods) (pack covers `packs/extended_16x9.webp`, `lite_16x9.webp`, crosshair previews) | Medium |
| **PMOD / XVM** | Lebwa `07-*` previews (PMOD layouts), Jove `jove-3.jpg` (XVM ears + PMOD team HP) | Medium |
| **Stock 1.45 and ours today** | Local screenshots `D:\Games\Tanki\screenshots\shot_001…024.jpg` (3840×2160, our pack live on 29.09–01.10) | High |

Local leftovers: no competitor installer images remain under `D:\Project\personal`. `%APPDATA%\Lesta\MirTankov\mods`
holds only configs: `gunmarks/{nearyou,protanki}_config.json`, `lebwa/statshistory.json` (its tabs are `gunmarks`,
`artillery` and `onslaught`, with an `onslaught_page: records`), `pmod/gun_marks`, `phantasm/joves_announces.dat`
and `battlehits`. Nothing was run.

---

## Part A — what they do

### A.1 Lebwa (and Lebwa Plus): the benchmark

The only pack whose own UI looks designed in 2025–26. Everything else in it is stock PMOD/XVM.

**Marks panel (classic, `01.jpg`).** A ~190×105 px panel at 1080p, right of the consumables bar.

```
   ☆ ☆ ☆                            three outline stars break the top frame line
┌─ ─────────────────────────── ─┐
│ 34.83%  ↑ +0.13%               │   key ~28 px bold white · arrow + delta 14 px, arrow #a5e072, delta grey
├──▬▬▬▬▬▬▬▬▬▬|───────────────────┤   bar 4 px lime, white 2 px cursor at the current value, end tick, side ticks
│ Сум. урон      2 093 / 1 797   │   caption grey · value lime bold / target white
└─ ─────────────────────────── ─┘
```

- Frame: 1 px line, light grey at ~45 % (≈ `#9a9a9a73`). The vertical sides break at the bar row, and short ticks
  stick out 6 px past the frame there. That reads as a measuring instrument, not a box.
- Fill: almost flat, `#1b1b19` at ~40–45 %, no gradient, no radius (0).
- Colours: lime `#9be05a` (bar), `#a5e072` (positive), white `#ffffff` (key number), grey `#bdbdbd` (labels).
- Type: Warhelios Bold, condensed digits. The percent uses a dot (`34.83%`). Thousands are separated by a space.

**Team HP (Plus, five variants, `06-Preview-02-0.png`).** Variant 1 is a thin top plate with no frame: `3226 … 2:9 … 8369`
and short 4 px bars toward the centre. Variant 3 is a framed box split in two halves: HP at the outer top, frags big
at the inner edge, and a bar under each HP. The bars carry **quarter ticks** (1 px light ticks every 25 %). Variant 5 has
a **leading-side highlight**: the losing half gets a dark-red cell (`#4a1517` → transparent) behind the frag number.

- Ally `#c4d57d` → `#9bc255` (yellow-lime gradient along the bar), enemy `#d94343`. Track `#47494c`. Frame `#47494c` 1 px
  with a lighter 1 px top highlight (`#ffffff` ~25 %).
- Plates are `#2a2c2f` at ~70 %, with a very faint diagonal hatch inside some cells.
- The numbers are bold condensed, white, 15–20 px. The HP delta (`+651`, `-2401`) is grey at 70 %.

**Crosshairs (`06-Preview-01-0.png`).** Thin 1–2 px lines, lime `#9bff68` arcs. **Reload box: four green L-corner
brackets** around the white seconds (`6,5`), and under them a smaller box with a diagonal-hatch fill and the full reload
time (`5,3`). A 1 px leader line joins the box to the reticle arc. This is the most copied detail in the scene.

**Plus windows (marks history `06-Preview-06-0.png`, artillery meter `-03-`, tournament `-05-`).**

- A window on `#111114`/`#1a1a1e` with a 56 px **icon rail** on the left (`#202124`): star, onslaught, thermometer.
  Close and trash are square 32 px buttons **outside** the frame on the right.
- Header: tank name centred in bold condensed caps at 28 px, a big percent at the right in grey `#74787c` (not white:
  the current value is quiet, the delta is loud). A 0–100 ruler with a lime fill and a hatched remainder.
- Cards: `#16161a` on `#111114`, radius ~4, no shadows. Each delta is a small chip: `↗ +1.53%` in lime on a
  `#ffffff0d` pill. A «РЕКОРД» callout is a lime-outlined tag with a hand-drawn leader line.
- Footer: `X ◆ AMX 50 B • Прогресс отметок` at the left, `Модпак Левши • lebwa.tv` at the right, both 10 px grey. A signature line.
- Segmented bars everywhere in the tournament card: 5 cells with 2 px gaps, so the value reads at a glance.
- Typography: Roboto Condensed on the site. The in-game windows use the client's condensed font.

**Settings.** Lebwa and Jove both use izeberg's **modsSettingsAPI** («Настройка модификаций», `screens-30/33`):
the stock Scaleform window with olive-grey sections, checkboxes, red-orange sliders, a green «+» per section
and a «ЗАКРЫТЬ ✕» text button. Nobody in the scene has a custom settings window. **Our Gameface window is already ahead
here.** The reference for our settings is the Lebwa Plus window language, not their settings.

**Premium vs slop at Lebwa.** It is premium because it has one accent hue per meaning (lime = good/ally), 1 px lines,
no radius in battle, an instrument metaphor (ticks, cursors, rulers), quiet current values and loud deltas, a fixed
condensed numeral, and generous negative space. The only slop is the marketing renders (big blurred backdrop,
generic sans).

### A.2 Jove: loud, legible, 2018

**Battle (`jove-3.jpg`).** The pack is PMOD + XVM as configured by Jove.

- **Team HP:** a dark slate trapezoid plate (`#3a4151` → transparent at the ends) across the top centre. **Full-saturation
  slabs**: ally `#71da0c`, enemy `#cc0e10`, ~18 px tall. HP numbers white, bold, 20 px. The frag counts sit in
  **slanted parallelogram end caps** (`#4e6e47` / `#633f3f`). Under it, a row of class icons per vehicle (green/red,
  alive or dead).
- **XVM ears:** row-wide HP fills behind the names (green or red at ~60 %), so the ears double as an HP chart.
- **Damage totals:** a column of icon + number next to the stock damage panel (assist green, blocked white shield,
  spotted green).
- **Reticle:** `10,4` in red (reloading) and `100%` in green at ±200 px on the horizontal line, with the full reload
  `10.97` in grey under it. No plates, text shadow only. A dotted aim circle.
- **Rank ribbon:** a big red vertical banner with a star (`#2`): achievement theatre.

**Installer (`jove-install-1/2.jpg`).** A classic **Inno Setup** wizard: a tree of checkboxes and radios with sizes in МБ,
a preset dropdown («Выборочная установка») and a **screenshot pop-over on hover**. White Windows chrome, and a header
banner with bullet holes and the THE JOVE logo.

**In-hangar settings (`jove-2.jpg`).** modsSettingsAPI, as at Lebwa.

**1.45 marketing (`modpak.jpg`).** Thumbnail style: huge white caps with a black outline on a green «БАЗОВЫЙ» pill.

**Premium vs slop.** Jove is not premium, it is *legible*. Saturated slabs and shadowed text survive any map, and the
class-icon row is genuinely useful. It looks dated through the full-saturation fills, the trapezoids and parallelograms,
the bevel, the mixed alignments and the 2018 Windows installer.

### A.3 Near_You: brand language only

- Site (`nearyou.team/modpack`): Nuxt, black `#191919`. **Chamfered SVG frames**: a 1.3 px stroke with two cut corners
  (9 px), magenta `#eb1e91` at 54 %. The back link is an **orange text gradient** `#ff8f00 → accent`. The fonts are
  **Druk Wide Cyr Bold** (display) and **Bedstead** (a teletext pixel font) for labels. The accent set is neon:
  `#eb1e91`, `#f533f2`, `#33b4f5`, `#9eff27`, `#ffd900`, `#ff6127`.
- In-game: a branded hangar, a server-reticle toggle, x16–x25 zoom, «стилизованные отметки» in team colours and a lamp
  ([sports.ru](https://cyber.sports.ru/wotblitz/blogs/3417104.html)). Their marks mod is the shared `gunmarks` mod. Its
  options (minimise, alternate view held or always, colour-blind) are the feature set to match.
  `protanki_config.json` adds `anchorPoint: center`, `progressLogic: damage` and `skinVariant: new`, so one engine is
  skinned per pack.
- Installer: cache and log cleanup and old-mod removal. No screenshots found.

**Premium vs slop.** The brand is coherent (cyberpunk neon, wide display type, chamfers), but it is a *streamer
brand*, not an instrument. Neon magenta on a battlefield fights the green/red team semantics.

### A.4 PROTanki, PMOD, XVM, stock 1.45

- **PROTanki:** the pack covers are **AI-generated hangar renders** (a Maus in an orange-lit sci-fi hangar, a gold «EXTENDED»
  bevel title) and an 18+ streamer banner. The crosshairs (BadBoy, Combo) are 2014-era: red outlined «ГОТОВ», purple
  rulers, teal ellipses. This is the clearest example of **«нейрослоп»**: glow, gold bevel, fake HUD panels with
  unreadable micro-text, no grid.
- **PMOD (Lebwa `07-*`):** team HP variants (a flat top strip with thin bars; a framed two-half box), sixth-sense ear
  indicators, a battle-results-in-battle card (stock-like text list), a commander camera, x24 zoom with L-corner brackets
  around the `x24` label. Competent and stock-adjacent.
- **XVM:** text tables in `$FieldFont`, inline icons, rating colours. Function first, no plates.
- **Stock 1.45:** dark gradient bars fading to transparent (`rgba(0,0,0,.6)` → 0), warm white text `#f4f1ea`, olive-grey
  sections, orange `#f98c1f`-ish highlights on the active tab, the Warhelios condensed face. The stock team-HP strip
  (our `team_hp` replaces it) shows thin bars and a centred `0 : 0`.

### A.5 Us today (`shot_022`, `shot_023`, `shot_024`)

- **Window (`shot_023`):** already strong. Graphite, orange accents, a left rail, tabs, filter chips, a replay list and
  a detail pane. Its weak points:
  - too many orange fills at once (RU pill, «Все» chips ×2, the «Смотреть» CTA, the active sidebar item, the page icon, the «Мод не привязан» pill), so the accent has lost its meaning;
  - an 8 px radius plus soft shadows reads «SaaS dashboard», not a game instrument;
  - the page header icon sits in an orange-outlined rounded square, a generic AI-UI pattern;
  - field labels and values are low contrast (`#9797a0` 10–11 px caps on `#1f1f23`).
- **HUD (`shot_022`):**
  - team HP is close to Lebwa variant 1 (fade plate, 6 px bars, coloured numbers) but has no ticks or structure;
  - the marks box shows `0,67 %` on a flat plate. In edit mode it gets an orange 2 px frame, which is fine;
  - «Осн. калибр 0 / 5 698» is plain rows inside an orange-framed box (edit mode);
  - no reticle reload box (stock only).

### A.6 Cross-pack summary

| | Lebwa | Jove | Near_You | PROTanki | Us now |
| --- | --- | --- | --- | --- | --- |
| HUD fill | flat `#1b1b19` 40–70 %, radius 0 | trapezoid slate gradient | — | — | vertical gradient 74→56 %, radius 2 |
| Lines | 1 px grey, broken frames, ticks | none (bevel) | chamfered 1.3 px magenta | glow | 1 px top line 7 % |
| Accent | lime `#9be05a` | saturated green/red | magenta/orange neon | orange glow, gold | orange `#ff7a1a` |
| Numbers | condensed bold, dot decimals | condensed bold, shadow | Druk Wide | outlined | Warhelios bold, comma decimals |
| Signature | L-corner reload box, hatch, tick rulers, segmented bars | class-icon row, full slabs | chamfers, pixel font | — | `///` logo (unused in HUD) |
| Settings | modsSettingsAPI | modsSettingsAPI + Inno installer | installer only | site catalogue | custom Gameface window |

---

## Part B — our design language: «Планшет наводчика»

**Idea.** A gunner's range card: graphite plates, hairline rules and **three-tick scales**, with the brand orange used
only as an **index** (the one mark that says «here, now, you»). The name «Три отметки» becomes the visual system:
every progress scale carries the 65 / 85 / 95 threshold ticks, and the `///` from the logo is the only ornament.

How it stays distinct from the others:

- **vs Lebwa:** no lime, no L-corner brackets, no hatch. Our frames are *open on the right* (a left rule plus a top hairline), not broken boxes.
- **vs Jove:** no saturated slabs, no trapezoids.
- **vs Near_You:** no chamfers, no neon, no wide display face.

Seven rules:

1. **One accent per screen region.** Orange marks the *current* thing: the selected nav item, the primary button, your own row, the bar cursor. Never a decoration or a second fill nearby.
2. **Square in battle, 2–4 px in the window.** Radius 0 on HUD plates (2 only for slots, as stock), 4 on window cards, 2 on controls.
3. **Hairlines carry the structure.** Use 1 px rules at 8–14 % white instead of shadows and boxes. No drop shadows in the HUD; one shadow on the window frame only.
4. **Numbers are the heroes.** The value is bold; the label is a 10–11 px caption. Fixed-width boxes stop digits from jumping. Deltas are coloured, the current value stays white.
5. **Scales, not progress pills.** Bars are 3–4 px with ticks (65/85/95 for marks, one segment per vehicle for team HP, 25 % ticks elsewhere).
6. **Quiet motion.** 120 ms colour/opacity, 180 ms row entry, a single 400 ms value flash. Nothing loops except the lit sixth-sense lamp.
7. **The `///` index.** Three 2×9 px bars skewed −20°, 2 px apart. Used on the window brand, section headings, the
   active nav item and the marks panel's top-left. Never more than once per block.

### B.1 Tokens

All values are design px (the HUD build has 1 rem = 1 px). Changes go to `packages/design-tokens/scss/_hud.scss` and
`_window.scss`. Existing names stay where they are listed as «keep».

#### Palette and roles

| Token | Value | Role |
| --- | --- | --- |
| `hud-text` (keep) | `#f4f1ea` | Values, names |
| `hud-muted` (keep) | `#a8a49a` | Labels |
| `hud-dim` (keep) | `#6f6c64` | Hints, targets after the slash |
| `hud-index` (new) | `#ff8a2a` | The HUD accent: the bar cursor, your own row, the `///`, the edit frame. 6 % lighter than `#ff7a1a` so it reads on sand |
| `hud-ally` | `#7cd35b` → **`#8fd16a`** | Slightly desaturated so it does not fight the stock markers |
| `hud-enemy` | `#e3564a` → **`#e5584c`** (keep the hue) | |
| `hud-gold` (keep) | `#e8b84a` | Reached marks, records |
| `hud-good`, `hud-bad`, `hud-warn` (keep) | `#4cc36b`, `#eb7276`, `#d9b23c` | Deltas |
| `win-index` (new) | `#ff7a1a` = `color-accent` | The window accent |
| `win-text-label` (new) | `#b4b4bd` | Field labels: contrast 7.9:1 on `#1f1f23` (today `#9797a0` at 11 px is too faint) |

**Accent budget in the window:** at most one orange *fill* (the primary button **or** the selected segment in the
focused control), plus orange *lines* (the nav rail, the focus ring, the toggle-on). Language pills, filter chips and
badges become neutral (`color-surface-raised` plus a 1 px `color-border-strong`). The selected state is white text and a
1 px `#ffffff33` border. Only the segmented control the user is editing shows orange.

#### HUD plates and alpha

There is one plate with three densities. The light/dark map problem is solved with a **contrast** density and the text
shadow, not with blur (Gameface has no `backdrop-filter`).

| Token | Value | Use |
| --- | --- | --- |
| `hud-plate-solid` | `linear-gradient(180deg, rgba(14,14,16,.70), rgba(14,14,16,.58))` | Default plate (a near-flat 12-point gradient keeps it from looking printed) |
| `hud-plate-contrast` (new) | `linear-gradient(180deg, rgba(10,10,12,.84), rgba(10,10,12,.76))` | `palette: contrast`, and automatically for plates whose `alpha` setting is ≥ 85 |
| `hud-plate-edge*` (keep) | as today | Glued blocks (log, team HP) |
| `hud-hairline` (new; replaces `hud-plate-line`) | `rgba(255,255,255,.10)` | The top rule of a plate, dividers |
| `hud-rule` (new) | `rgba(255,255,255,.22)` | The 1 px left rule of the open frame (B.2.9) |
| `hud-tick` (new) | `rgba(255,255,255,.55)` | Scale ticks |
| `hud-bar-track` | `.10` → **`rgba(255,255,255,.14)`** | Reads on snow |
| `hud-radius` | `2px` → **`0`** | Plates. Slots keep 2 (`hud-slot-radius`, new) |
| `hud-text-shadow` (keep) | `0 0 2px rgba(0,0,0,.9), 1px 1px 1px rgba(0,0,0,.9)` | Always on |

Guidance for maps: sand, snow and sky are the worst cases. At 0.58 bottom alpha, white text with the shadow keeps ≥ 4.5:1
on `#d8d2c0` sand (checked against shot_022's snow). Muted captions (`#a8a49a`) fail on snow without a plate, so
**captions never sit on a `none` plate**: reticle-area readouts use values only.

#### Window surfaces (`_window.scss`)

| Token | Today | New |
| --- | --- | --- |
| `win-frame` | gradient `#1c1c21 → #141417` | **flat `#151518`** (the gradient banding is visible at 4K) |
| frame border | 1 px line, 8 radius, **2 px orange top** | 1 px `rgba(255,255,255,.08)`, **radius 4**, no orange top. The orange lives in the header index (B.2.1) |
| `win-card` | gradient + inset highlight + drop shadow | **`#1c1c20` flat, 1 px `#2a2a30` border, inset top `rgba(255,255,255,.04)`, no drop shadow** |
| `win-card-hover` | | border `#3a3a42` |
| `win-card-open` | | border `#3a3a42`, a 2 px `win-index` left rule |
| `win-control` | gradient | `#232328` flat, 1 px `#3a3a42`, radius 2 |
| `win-accent` | 3-stop gradient + glow | keep the gradient, **drop the glow** (`win-accent-shadow` → `0 1px 0 rgba(255,255,255,.22) inset`) |
| `win-accent-ring` | ring + 14 px glow | `0 0 0 1px rgba(255,122,26,.75)` only |
| `win-stage` | olive radial | keep (it reads as a map backdrop), add a 24 px grid (B.2.8) |
| `win-shadow` (new) | | `0 16px 48px rgba(0,0,0,.6)`: the only shadow, on the frame |

#### Spacing, borders, radius

- Scale: **2, 4, 8, 12, 16, 24** (the existing `space-1…5`, `space-7`). Window padding is 24, card padding 16, row height 36 (window) / 18 (HUD).
- Borders: 1 px everywhere. 2 px only for the index rules (nav, open card, edit frame).
- Radius: HUD 0 (slots 2); window frame 4, cards 4, controls 2, swatches 2, toggles 2 (not pills).

#### Type

Warhelios Regular/Bold only (`warhelios, 'Arial Narrow', arial`). The client ships Regular. Bold is synthetic, so test
the 700 weight live, and fall back to 400 + `hud-text` for sizes under 13 if it smears.

| Step | HUD (keep §6.2) | Window |
| --- | --- | --- |
| label | caption 11/14 400 | **10/12 700 caps, tracking 1.2**: section labels, field group titles |
| caption | 11/14 400 | 12/16 400 `win-text-label` |
| body | 13/18 400 | 13/18 400 |
| value | 15/18 700 | 14/18 700: field values, card titles |
| key | 20/24 700 | 20/24 700: page title |
| hero | 28/32 700 | 28/32 700: big numbers in previews only |

Numbers:

- Warhelios has no tabular figures and Gameface has no `font-variant-numeric`, so every changing number sits in a
  right-aligned `min-width` box sized for its widest value.
- Thousands: a narrow no-break space U+202F (`2 093`).
- Percent: a decimal **comma** with two decimals in battle (`86,30 %`). The space before `%` is U+202F.
- Delta: a sign is always present, U+2212 for minus (`−0,12`), no arrow glyphs (the font lacks ↗; use the `Glyph`
  triangle 6 px).
- Seconds: one decimal with a **dot** (`3.2`), as the stock reload.
- Caps only for window labels and the HUD «Alt» hint. Never caps for values or names.

#### Motion

`duration-fast` 0.1 s for hover/press colour; `duration-base` 0.16 s for toggles and knobs; 0.18 s for row entry (opacity
0 → 1 and translateY 4 → 0); a 0.4 s value flash (colour `hud-index` → its tone). No scale-up hovers in the window. Cards
do not lift. Everything respects `reduced-motion`.

### B.2 Component recipes

Each recipe gives a sketch, the spec, and do/don't. Px are design px. «Rule» means a 1 px line.

#### B.2.1 Window frame and header

```
┌──────────────────────────────────────────────────────────────────────────────┐ radius 4, 1 px rgba(255,255,255,.08)
│▌/// ТРИ ОТМЕТКИ  │ [⌕ Поиск по компонентам…        ]   ● Мод привязан  RU EN  − 100% +  ✕ │ 56 high, #111114
│▌    Настройки    │                                                                     │
├──────────────────────────────────────────────────────────────────────────────┤ rule #ffffff14
```

- The header is 56 high (today 64), flat `#111114`. The **index**: a 3 px orange bar on the very left of the header
  (full header height) plus the `///` mark, then the wordmark (14/700 caps, tracking 1.5) and «Настройки» (11 muted).
  This replaces the 2 px orange top border.
- Search: 32 high, 360 wide, a well (`#0e0e10`, 1 px `#2a2a30`, radius 2); on focus the border turns `win-index`.
- The binding status is a **dot + text**, not a pill: an 8 px dot (good `#6fb544` / warn `#d9b23c`) plus a 12 px label. The
  warn state is clickable and underlines on hover.
- Language: a two-segment neutral control. The selected segment has white text on `#2e2e35`; orange is never used here.
- Zoom: an icon button, value, icon button, 28 high.
- Close: a 32 square, `✕` 14; hover `#e5584c` text on `#2a1a1a`.
- Do: keep the header calm, with one orange element (the index). Don't: orange pills, a glow under the header, a gradient bar glow.

#### B.2.2 Sidebar

```
│ /// КОМПОНЕНТЫ             │  label 10/12 caps #8a8a94, padding 16 24 8
│ ▌ ⚔  Бой              13/14 │  active: 2 px orange rule at x=0, text #fff, bg #1c1c20, count #ff7a1a
│   ⌂  Ангар            11/14 │  idle: text #b4b4bd, count #6f6f78, no bg
│   ◎  Отметки и стат.   5/5  │  hover: bg #19191c
```

- 232 wide, `#0f0f12`, right rule `#ffffff0f`. Items are 36 high, full width (no inset pill, no border, no radius); the icon
  is 16 at 16 px left padding plus the 2 px rule, and the label 13/700.
- **Active:** a 2 px `win-index` rule on the left edge, background `#1c1c20`, the count in orange. The tinted
  gradient and the orange-soft border go.
- Counts are plain right-aligned 11 px text, not chips.
- Section labels get the `///` index (in `#4a4a52`, *not* orange) before the text.
- The footer hotkey line stays at 11 px dim.

Do: one active marker. Don't: rounded pills, two orange items, icons in tinted squares.

#### B.2.3 Page header

```
  РЕПЛЕИ                                        [ Все | Ангар | Бой ]
  Реплеи ваших боёв: список в ангаре и загрузка на сайт.
  ──────────────────────────────────────────────────────────────── rule
```

- Title 20/24 700 (**not** caps; today it is caps). Description 12/16 `win-text-label`, max 640. A rule under it with a
  16 px gap.
- **No icon tile.** If an icon is needed, it is a 20 px glyph inline before the title in `#8a8a94`.
- The context filter (Все/Ангар/Бой) is a neutral segmented control. It only turns orange while it is the focused control.

#### B.2.4 Card (component card)

```
┌──────────────────────────────────────────────────────────────────┐ #1c1c20, 1 px #2a2a30, radius 4
│ [thumb 64×40]  Журнал боя                 БОЙ · ПАНЕЛЬ HUD  2 изм. ▢■ │ head 56
│                Урон, помощь и попадания строками.                 ˅   │
├──────────────────────────────────────────────────────────────────┤ open: 2 px orange left rule, border #3a3a42
│  fields …                                                         │
```

- Head 56 (today 72). Title 14/700; hint 12 `win-text-label`, one line with an ellipsis. Thumb: 64×40 radius 2,
  1 px `#ffffff14` border, olive art (`win-art`) when there is no image.
- Context badges: 10/12 caps text separated by `·` in `#8a8a94`. **No badge boxes.**
- «N изм.»: 11 px `hud-index` text (the only orange in a closed card) when > 0.
- The chevron is a plain 12 px glyph, no circle well.
- Off: title `#8a8a94`, the thumb at 50 % opacity, no background change.
- Gap between cards: 8 (today 12).

Do: dense, aligned to a 16 px left edge. Don't: hover lift, drop shadows, gradient fills, three badge colours.

#### B.2.5 Field row

```
│ Прозрачность плашки                         [−]  70  [+] │ 36 high, label left, control right
│ Насколько тёмная подложка под текстом.                     │ optional hint 11/14 #8a8a94
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤ rule #ffffff0a between rows (solid, Gameface has no dashed)
```

- Label 13/400 `#e6e6ea`; a changed field gets a 4 px `hud-index` dot before the label (not a badge). Hint 11/14.
- The control column is right-aligned, min 200.
- Grouping: a 10/12 caps group label with 24 px top margin. No nested boxes.

#### B.2.6 Controls

**Toggle (36×18, radius 2).**

```
off  [■□□□]   track #0e0e10, 1 px #4a4a55, knob 14×14 #8a8a94 radius 1, left 2
on   [□□□■]   track #ff7a1a flat (no glow), border #ff7a1a, knob #fff, left 20
```

The motion is `left` over 0.16 s. Don't: the iOS pill and the knob gradient.

**Segmented control.** 28 high, container 1 px `#3a3a42` radius 2, segments separated by 1 px rules. Idle text
`#b4b4bd` 12/700; hover `#fff`; selected `#232328` plus white text plus a **2 px orange underline** inside the segment
(bottom). In a field the user is editing, selected = the full accent fill (`win-accent`). Don't: two filled orange segments in view.

**Stepper (IntField).** `[−] value [+]`: 28 high; buttons are 28 squares (`win-control`); the value well is 56 wide, centred,
14/700, `min-width` sized for the max. Hold to repeat at 80 ms after 400 ms. The unit goes after the well as 11 px muted.

**Gallery tile (ChoiceGallery).**

```
┌────────────┐  120×90 thumb (4:3) on win-stage, 1 px #2a2a30, radius 2
│   preview   │
│            ◢│  selected: 1 px #ff7a1a border + a 14×14 orange corner tab with a ✓ glyph (font-safe)
└────────────┘
  Классика        12/700 label under, #b4b4bd; selected #fff
```

Hover: border `#4a4a55`. Don't: scale on hover, a glow.

**Swatch.** 20×20, radius 2, a 1 px `#ffffff33` inner border (on dark colours). Selected: `box-shadow: 0 0 0 2px #151518,
0 0 0 3px #f4f1ea` (a ring with a gap). A row with 6 px margins. A custom colour opens the hex input next to it.

#### B.2.7 Buttons

- Primary: 32 high, `win-accent` gradient, text `#1a0b00` 13/700, radius 2, no glow. One per view.
- Secondary: `#232328` with a 1 px `#3a3a42` border and white text.
- Ghost/link: text `#b4b4bd` → `#fff` on hover, with an icon 14.
- Danger: ghost with the text `#eb7276`.

#### B.2.8 Editor layout (ComponentEditor, hud-editor)

```
┌ fields 380 ─────────────┬ stage (flex) ─────────────────────────────────┐
│ group: Вид              │  ┌ 1080p frame, 16:9, win-stage + 24 px grid ┐ │
│  Стиль  [Комп|Расш|Мин] │  │                                            │ │
│  Прозрачность [−]70[+]  │  │            ┌ plate preview ┐               │ │
│ group: Цвета            │  │            └───────────────┘               │ │
│  ■ ■ ■ ■ ■ ▢            │  └────────────────────────────────────────────┘ │
│                         │  [Сбросить]            [Двигать на экране]      │
└─────────────────────────┴──────────────────────────────────────────────────┘
```

- The fields column is 380 and scrolls; the stage is flex with a 24 padding. The stage is `win-stage` plus a grid of 1 px
  `rgba(169,181,108,.08)` lines every 24 px, drawn with two stacked `linear-gradient`s on a 24 px `background-size` (not
  `repeating-*`, which Gameface lacks).
- The preview renders the **real widget** at 1:1 design px inside a `FitBox`, with a light/dark backdrop switch
  (a «Снег»/«Лес» segmented control) so the user checks the plate alpha on both. That is our answer to the light-map problem.
- The edit frame around the moved panel: 1 px `hud-index` with 4 px corner squares (resize handles). The panel name tag is
  10 caps on orange above the top-left.

#### B.2.9 HUD plate (the base of every battle block)

```
┌───────────────────────────── top hairline #ffffff1a
│ ///  content                    radius 0, fill hud-plate-solid
│      …                          left rule 1 px hud-rule (the open frame)
└                                 no right or bottom line
```

- The **open frame**: a 1 px `hud-rule` on the anchor side (left for left/centre anchors, right for right anchors)
  plus the top hairline. No full box. This is our counterpart to Lebwa's broken frame and to Jove's slab.
- Padding 4/8 (battle), 8/12 (hangar card). Width 230 (battle) / 264 (hangar) as §6.3.
- Flavours: `solid` (default), `contrast`, `edge` (fade, no rules), `none`.
- Do: square, hairlines, a shadow on the text. Don't: rounded corners, a full 1 px box, inner glows, gradients brighter than ±12 %.

#### B.2.10 Marks panel

**Compact (battle default), 230×44.**

```
┌─────────────────────────────────────────┐ hairline
│/// 86,30 %  ▲0,18           95 %  3 900 │ key 20 white · delta 13 good/bad + 6 px triangle · caption «95 %» muted + value 15
│▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬|▬▬▬┊░░░░░░░░┊░░┊ │ 3 px scale 0–100 %: fill gold to the current %, cursor 2×7 hud-index at the projection,
└                     65   85      95     │ ticks at 65/85/95 (1×5 hud-tick, reached → gold); tick labels only on Alt
```

- The `///` index (orange) sits at the top-left only on this panel: it is our brand on the field.
- The percent is the after-battle projection; ≈ (dim caption) when not verified.
- `color_mode`: `delta` → the delta coloured and the percent white; `mark` → the percent in the reached-mark tier colour.

**Large (hangar card and the battle `extended` style), 264 wide.**

```
┌──────────────────────────────────────────────┐
│ [flag] EBR 105  X                ▮▮  86,12 % │ value 15 · tier caption · mark icon 20 · key 20 gold
│ ─────────────────────────────────────────── │ hairline
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬|▬▬▬┊░░░░░┊░░┊           │ the same 3 px scale, tick labels 65 85 95 caption under
│ 65 ✓     85 ✓     95  28 295 за бой          │ thresholds; reached = gold check
│ прошлый ▲0,01   5 боёв ▼0,12     ╱╲╱╲•       │ deltas chips (text only) · sparkline 60×16 hud-muted, last dot hud-index
│ Alt — подробнее                              │ dim
└──────────────────────────────────────────────┘
```

Do: the threshold ticks are the signature, so every marks surface (window preview, hangar, battle) uses the same scale.
Don't: stars (Lebwa's), a lime bar, a big ring.

#### B.2.11 Team HP

The shared parts: per-vehicle **segments** (one cell per tank, 1 px gaps, width ∝ max HP), the alive part in the tone,
the lost part `hud-bar-track`, a dead tank's cell at 35 % of the track. Frags are key 20 white in fixed 28 px boxes.
HP numbers are value 15 in the tone, in 56 px boxes. The leader side (more HP) gets nothing; the side that is behind by
≥ 30 % gets its HP number in `hud-warn` (an information cue, no red cell like Lebwa's).

- **`strip` (default), 600 wide, edge-centre fade, no rules:**

  ```
     27 480  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬|▬▬|▬▬|▬   0 : 0   ▬|▬▬|▬▬▬▬▬▬▬▬▬▬▬▬  27 990
                                     −510                       delta caption 11 in good/bad, centred under the score
  ```

  Bars are 4 high (today 6), segments per vehicle.
- **`panel`:** a solid plate split into two halves by a 1 px `hud-rule`; HP top-outer, bars under it, frags big
  at the inner edge (the Lebwa v3 structure, but square, with an open frame and per-vehicle segments, not quarter ticks).
- **`minimal`:** the score only (`3 : 5`, key 20) plus two 2 px bars 120 wide under it.
- **`classic`:** the `strip` plus a row of 12 px class glyphs per vehicle, tone at 100 % alive and 30 % dead (Jove's useful idea, quieter).

Do: equal widths per side so the bars meet the score symmetrically. Don't: full-saturation slabs, trapezoids, a 6 px+ bar.

#### B.2.12 Log row (damage log, received log)

```
 ▸ 390   ▣ББ  ✦  ⬢ Об. 140                    18 high, edge fade
   │     │    │   └ class 16 (tone) + name 13 muted (own platoon gold)
   │     │    └ outcome icon 16 (crit / blocked / ricochet)
   │     └ ShellChip 20×14 (gold for premium)
   └ value 15 in dealt / received / blocked, right-aligned in 44 px
```

- Totals row on top: icon 16 plus value 15 groups, 8 apart.
- A new row: 0.18 s fade/slide; the newest row has a 2 px `hud-index` tick at its left for 2 s, then fades out (not a flash of the whole row).
- Alt adds the columns «#», distance and time in caption.
- Do: column alignment by fixed widths. Don't: words like «пробил», more than three colours per row.

#### B.2.13 Reticle reload box (new, own gun only)

```
                ┌──────┐
           ─────┤ 3.2  │      value box 44×22: value 15/700 white, right rule + top/bottom hairlines open to the reticle
                ├──────┤      a 1 px leader from the box to the reticle edge (hud-rule, 24 px)
                │ 7.6  │      the full reload: caption 11 muted, no hatch
                └──────┘
  ready:  [ ГОТОВ ]  in good for 1 s, then the box hides (unless show_ready)
  magazine:  ▮▮▮▯  4 cells 6×3 above the value, filled = loaded shells
```

- Position: left of the reticle at −120, 0 (mirrorable). No plate: values only with the text shadow; the open-frame
  lines are `hud-rule` at 1 px.
- Colours: reloading `hud-text`; under 1 s `hud-index`; ready `hud-good`.
- It differs from Lebwa's L-brackets and hatch and from Jove's bare red number on purpose.
- Fair play: own reload only (allowed); nothing about enemy reloads.

#### B.2.14 Sixth sense

The ring is 84 with a 3 px stroke (today 4), the `hud-index` tone draining, the track `hud-ring-track`. Icon 56, seconds key
20 white under it (not orange; the ring carries the colour). Lit: one 0.6 s pulse of the ring opacity 1 → 0.6 → 1,
repeated while lit.

#### B.2.15 Session and hangar cards

The same plate as B.2.9 at hangar density.

- Header row: label 10 caps `hud-muted` (the only caps in the HUD) plus `///` in `hud-dim`; the key value at the right.
- Rows 20 high: caption label left, value 15 right.
- Deltas are text plus a triangle glyph.
- Sparklines are 1.5 px `hud-muted` with an end dot in `hud-index`.
- Footer: dim 11 `Alt — подробнее`.

The card is 264 wide.

#### B.2.16 Toasts (undo, notices)

```
┌▌ Компонент «Журнал боя» выключен          Отменить   ✕ ┐  44 high, #232328, 1 px #3a3a42, radius 4
                                                            3 px left rule: index (info) / good / bad
```

- Bottom centre of the window, 24 above the edge, 360–520 wide. Text 13 white; the action is a 13/700 `win-index` text
  button; close 12 muted.
- Entry: 0.18 s opacity and translateY 8 → 0. Auto-hide at 6 s with a 2 px progress line along the bottom in `#ffffff33`.
- In-battle notices (`option_notice`) use the HUD plate, not this.

### B.3 Gameface constraints the recipes respect

From `apps/game/modpack/README.md` («In-game UI → Gameface CSS») and `apps/game/modpack/ui-web/stylelint.config.mjs`:

- **Layout:** flex only. No `grid`, no `gap`/`row-gap`/`column-gap` (use margins), no `order`, `float` or `inset`, no logical properties. `display` is only `flex|none`; `position` is only `relative|absolute|fixed`.
- **Functions:** no `var()`, `calc()`, `min()`, `max()`, `clamp()` or `color-mix()`. Tokens are inlined by `token()`. Colours are hex or `rgb()`/`rgba()` (no hex alpha, no named colours).
- **Gradients:** only linear and radial. No `conic-` or `repeating-*`. The editor grid uses two linear gradients plus `background-size`. Hatching is not available, which suits us (we do not use it).
- **Borders:** only `solid`. Dashed or dotted rules are drawn as separate cells or skipped. No `outline`, so the focus ring is a `box-shadow`.
- **Selectors:** one class per element. No combinators, no nesting beyond pseudo-classes. Pseudo-classes are `hover`, `active`, `focus`, `*-child`, `nth-child` and `root`; pseudo-elements are `::before`, `::after` and `::selection`. The `///` can be three spans or one `::before` with a skewed `transform`.
- **No `backdrop-filter`** (not supported), so readability over the map comes from plate alpha and the text shadow. Avoid `filter` too (expensive per frame on the HUD).
- **No native inputs** (checkbox, radio, range, select, ul/ol). Toggles, segmented controls and lists are div + role, as today.
- **No `font-variant-*`**, hence the `min-width` number boxes.
- **Media queries:** only width, height, aspect-ratio and orientation, in prefix notation.
- **JS:** `chrome94` target.
- **Units:** px is written and shipped as rem (1 rem = 1 design px).
- **Glyphs:** ★ → ✓ etc. go through `font-safe`. The 6 px delta triangle is the `Glyph` component, not a Unicode arrow.

### B.4 «Premium» vs «нейрослоп» checklist (for review)

Premium:

- one accent with a meaning;
- hairlines over boxes;
- aligned left edges on a 4 px grid;
- fixed number boxes;
- quiet current values with loud deltas;
- the same scale language everywhere;
- empty states hidden in battle;
- real data in previews.

Slop, to reject in review:

- orange in more than one fill per view;
- glows and colour shadows;
- gradient-on-gradient;
- a tinted icon tile next to every title;
- pills for everything;
- 8 px+ radii;
- emoji-like arrows;
- caps everywhere;
- three badge colours in one row;
- AI-render backdrops;
- micro-text that cannot be read;
- decorative numbers («0» shown in battle);
- motion on idle.

---

## Part C — prioritised change list

| # | Change | Files |
| --- | --- | --- |
| 1 | HUD tokens: `hud-index`, `hud-hairline`, `hud-rule`, `hud-tick`, `hud-plate-contrast`, `hud-slot-radius`; `hud-radius` 0; brighter `hud-bar-track`; ally/enemy tweak | `packages/design-tokens/scss/_hud.scss`, `scss/_tests` |
| 2 | Window tokens: a flat frame/card/control, radius 4/2, no glow on the accent, `win-shadow`, `win-text-label`, `win-index` | `packages/design-tokens/scss/_window.scss`; the `raised`/`control`/`accent-fill` mixins in `apps/game/modpack/ui-web/src/shared/styles/_gameface.scss` |
| 3 | The open-frame plate (top hairline plus the anchor-side rule, `contrast` fill) | `ui-web/src/shared/ui/hud/HudPlate/*` |
| 4 | A shared **threshold scale** (3 px, ticks 65/85/95, cursor) used by the marks panel, the hangar card and the window preview | new `ui-web/src/shared/ui/hud/ThresholdScale/`, `entities/hud-widgets/marks-panel/ui/components/{MarksMain,MarksThresholds}`, `entities/hud-widgets/card` |
| 5 | Marks panel compact and large per B.2.10, with the `///` index | `entities/hud-widgets/marks-panel/ui/*`, `shared/ui/logo-mark` (reuse it as the `///` glyph at 9 px) |
| 6 | Team HP: 4 px per-vehicle segments, four variants (`strip`, `panel`, `minimal`, `classic`), the behind-side warn | `entities/hud-widgets/team-hp/ui/components/{TeamBar,TeamCenter,TeamSide,TeamStrip}`; the `style` enum in `features/team_hp` (Python) if `classic`/`panel` are new |
| 7 | Accent budget in the window: neutral language/filter/badge controls, a sidebar with a 2 px rule and no pill, a page header without an icon tile, a binding status dot | `ui-web/src/widgets/{header,sidebar,component-list}`, `shared/ui/{segmented,badge,page-header}` |
| 8 | Component card 56 head, text badges, an orange «N изм.», an open-card left rule; field rows 36 with a changed dot; a 36×18 square toggle; stepper and swatch per B.2.6 | `widgets/component-card/ui/**` (`CardTitles`, `Field`, `FieldControl`, `IntField`, `ChoiceGallery`), `shared/ui/toggle` |
| 9 | Reticle reload box (new widget kind `reload`, own gun only) and the sixth-sense ring at 3 px | new `entities/hud-widgets/reload/` plus a registry entry; the Python payload in `features/gun_arc` or a `reload` panel of `features/aim_info`; `entities/hud-widgets/sixth-sense` |
| 10 | Editor stage: a 24 px grid, a Снег/Лес backdrop switch, an edit frame with corner squares; the undo toast per B.2.16 | `widgets/hud-editor/ui/*`, `widgets/component-card/ui/components/PanelPreview`, `widgets/undo-toast/ui/*`, `_window.scss` (`win-stage`) |
| 11 | Log row per B.2.12 (a newest-row index tick, fixed columns) | `entities/hud-widgets/damage-log/ui/DamageLogWidget/components/*` |
| 12 | Hangar and session cards: caps header with `///`, 20 px rows, sparkline end dot | `entities/hud-widgets/card/ui/components/{CardHeader,CardRow,CardStrip}` |
| 13 | Header 56 with the left index bar, a flat search well | `widgets/header/ui/*`, `widgets/window-frame/ui/WindowFrame.module.scss` (drop `border-top` orange, radius 4) |

The settings-window agent owns 2, 7, 8, 10 and 13. The HUD agent owns 1 and 3–6, 9, 11 and 12. Token changes (1, 2) land
first. Then run `bun run lint:css` and the design-tokens tests, and check live at 1920×1080 and 3840×2160 on a snow map
and a forest map.
