# Modpack assets

Images the feature packages ship. Every file belongs to a set in [assets.json](assets.json) that names its
feature, author, licence (SPDX), source and in-game path. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) is
generated from it (`python tools/build/asset_sets.py --write`) and ships in every package that uses a set.

```
assets/
  assets.json                    the sets: feature, origin, author, licence, url, sources -> files, target
  THIRD_PARTY_NOTICES.md         generated
  otmetki/LICENSE.md             our artwork: (c) Три отметки, ships only inside the modpack
  otmetki/crosshair/src|png      10 centre marks (SVG -> PNG 64, 128)
  otmetki/crosshair_tinted/src|png  5 one-colour centre marks (SVG -> PNG 64, 128 per mark colour)
  otmetki/sixth_sense/src|png    4 sixth-sense icons (SVG -> PNG 64, 128 + dimmed pulse frames)
  otmetki/damage_log/src|png     6 damage-kind and 5 vehicle-class glyphs (SVG -> PNG 32)
  otmetki/hangar_looks/src|dds   4 colour grades of the hangar looks (grades.json -> 256x16 BGRA8 DDS, tools/assets/lut.py)
  third_party/<set>/             a vendored set: its licence text, the untouched originals in src/, renditions in png/
```

## Rules

- **Licence first.** A third-party set is added only under a licence that allows redistribution in a paid product:
  CC0, CC-BY, CC-BY-SA, MIT, BSD, Apache-2.0, MPL-2.0 (the list is `asset_sets.PERMISSIVE_LICENCES`). Never
  NonCommercial, "all rights reserved", "free for personal use" or anything unclear. Keep the licence text in the
  set's folder and the untouched originals in `src/`. Popular closed packs are asked first
  ([docs/ops/mod-authors-outreach.md](../../../../docs/ops/mod-authors-outreach.md)).
- **Original art is original.** Competitors' packs are a visual reference only (layout, sizes, readability, colour
  conventions); nothing is traced, copied or recoloured. Our style: graphite, orange `#FF7A1A`, gold `#E8B84A`,
  text `#F2F2F3`, dark outline `#0E0E10` for readability on any background (`@otmetki/design-tokens`).
- **Visual only.** An asset never carries information the client does not show: a centre mark sits where the
  client already draws its reticle centre; the sixth-sense icon follows the client's own lamp.

## Client pipeline (RU 1.45)

| Kind        | Format we ship                          | How the client uses it                                                                                                                                                                                                    |
| ----------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HUD images  | PNG, RGBA, square, 32 / 64 / 128 px     | Scaleform HTML text of a HUD label: `<img src="img://gui/maps/icons/otmetki/...png" width height>`; scaled to the size the setting asks. No DDS or atlas: only the vanilla `battleAtlas` is DDS, and we never replace it. |
| Pulse       | a dimmed PNG frame (`_dim`, 45 % alpha) | The panel swaps frames every 0.5 s (Scaleform text cannot animate an image).                                                                                                                                              |
| Sounds      | —                                       | None: the modpack plays no sounds of its own, the client's own sounds stay.                                                                                                                                               |
| Reticle art | —                                       | The gun marker is Scaleform `crosshairPanel` + `battleAtlas` (Lesta's art); replacing it means redistributing Lesta files and rebuilding after every patch, so we overlay a centre mark instead.                          |

## Rebuild

```bash
python tools/assets/render.py                         # every set with sources -> its PNG renditions (Python 2.7; SVG drawn on Node)
python tools/build/asset_sets.py --write              # the notices
python tools/build/build.py --dry-run                 # lists the assets in each package
```
