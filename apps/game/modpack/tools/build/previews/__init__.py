"""The catalog preview of every HUD component, drawn by the in-game HUD page from the component's own preview.

    python tools/build/previews        # -> catalog/previews/<id>.png for every id in states.HUD_PREVIEWS

`states` builds one HUD page state per component from its `model/preview.py` (`preview_widget`, else
`preview_text`), with the images the modpack ships and our glyphs in place of client art (the published previews
carry no game files); `render.mjs` loads the built `packages/ui/gameface/hud.html` in Chromium (Playwright, the
repo's e2e dependency), scales the panel to fit a 16:9 frame, centres it and saves the PNG. Run `bun run ui:build`
first so the page is current. `capture/` turns real in-game screenshots into the previews of the rest
(catalog/previews/CAPTURE.md); a few keep a drawn SVG.
"""
from __future__ import absolute_import, division, print_function, unicode_literals
