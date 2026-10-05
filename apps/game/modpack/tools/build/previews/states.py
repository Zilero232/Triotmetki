"""One HUD page state per HUD component, from the component's own preview payload."""
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import json
import os
import sys
import time
import types

BUILD_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODPACK_DIR = os.path.dirname(os.path.dirname(BUILD_DIR))
if BUILD_DIR not in sys.path:
    sys.path.insert(0, BUILD_DIR)

import asset_sets  # noqa: E402

ROOT_PACKAGE = 'otmetki'
RES_PREFIX = 'res/'
# The components whose catalog preview is their HUD panel, and the backdrop it is drawn over.
HUD_PREVIEWS = {
    'battle_hotkeys': 'battle',
    'battle_loadout': 'battle',
    'battle_progress': 'battle',
    'battle_results': 'battle',
    'crosshair': 'battle',
    'damage_log': 'battle',
    'marks_panel': 'battle',
    'personal_missions': 'hangar',
    'platoon_points': 'battle',
    'sixth_sense': 'battle',
    'team_hp': 'battle',
}
# A fixed moment, so the clock preview does not change with every run.
PREVIEW_MOMENT = time.gmtime(1790804820)
PANEL_PLACE = {'x': 0, 'y': 0, 'alignX': 'center', 'alignY': 'center', 'visible': True, 'drag': False}


def install_packages():
    """Maps packages/ and features/ onto the in-game `otmetki` package tree, as the client loads them."""
    if ROOT_PACKAGE in sys.modules:
        return
    root = types.ModuleType(str(ROOT_PACKAGE))
    root.__path__ = [os.path.join(MODPACK_DIR, 'packages'), MODPACK_DIR]
    sys.modules[ROOT_PACKAGE] = root


def own_images():
    """In-game image path (without `res/`) -> the file the modpack ships for it."""
    images = {}
    for asset_set in asset_sets.load():
        for source, target in asset_set.archive_files():
            if target.startswith(RES_PREFIX) and target.endswith('.png'):
                images[target[len(RES_PREFIX):]] = source
    return images


install_packages()


def _feature(component_id):
    base = 'otmetki.features.%s' % component_id
    settings = importlib.import_module(base + '.settings')
    preview = importlib.import_module(base + '.model.preview')
    strings = importlib.import_module(base + '.i18n').STRINGS
    return settings, preview, strings


def _translator(strings):
    from otmetki.core.i18n import Catalog, Translator

    return Translator(Catalog(strings), 'ru')


def _call(function, arguments):
    names = function.__code__.co_varnames[:function.__code__.co_argcount]
    return function(*[arguments.get(name) for name in names])


def preview_payload(component_id):
    """(rich text, widget) of the component's preview with its default settings."""
    from otmetki.core.settings import Settings

    settings, preview, strings = _feature(component_id)
    arguments = {
        'settings': Settings({}, settings.SCHEMA),
        'translate': _translator(strings),
        'moment': PREVIEW_MOMENT,
    }
    text = _call(preview.preview_text, arguments)
    widget = _call(preview.preview_widget, arguments) if hasattr(preview, 'preview_widget') else None
    return text, widget


def preview_state(component_id, images):
    """The HUD page state with the component's preview alone, client art replaced by our glyphs."""
    from otmetki.core.hud.icons import resolve
    from otmetki.core.hud.surface import SPACE_BATTLE, HudSurface

    text, widget = preview_payload(component_id)
    props = dict(PANEL_PLACE, text=text or u'', widget=resolve(widget, images.__contains__))
    surface = HudSurface()
    surface.create('otmetki.hud.%s' % component_id, props, SPACE_BATTLE)
    return surface.state(SPACE_BATTLE, False)


def job(images=None):
    """What render.mjs draws: every component's state and backdrop, and the images the page may ask for."""
    images = own_images() if images is None else images
    previews = [
        {'id': component_id, 'backdrop': backdrop, 'state': json.dumps(preview_state(component_id, images))}
        for component_id, backdrop in sorted(HUD_PREVIEWS.items())
    ]
    return {'previews': previews, 'images': images}
