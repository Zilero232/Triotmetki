"""The full-window editor a feature describes in its `model/editor.py` (`editor(settings, translate)`); a feature
whose page is only its field groups needs no such module, `EDITOR_GROUPS` in its `model/constants.py` is enough.

`editor_spec` builds what the settings window reads: field groups labelled `<feature>_group_<group>`, per-choice
pictures (`icons`), colour swatches (`swatches`), preview samples drawn by the HUD widgets (`samples`, for a component
that is no HUD panel or shows more than its panel) and a schematic the window draws itself for a stock element
(`schematic`, e.g. the minimap).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import GROUP_LABEL, SAMPLE_LABEL


def sample(feature_id, sample_id, widget, translate):
    """One preview sample: a HUD widget dict with its caption `<feature>_sample_<id>`."""
    return {'id': sample_id, 'label': translate(SAMPLE_LABEL % (feature_id, sample_id)), 'widget': widget}


def groups_editor(feature_id, groups):
    """The `editor(settings, translate)` of a page that is only the field `groups`."""
    return lambda settings, translate: editor_spec(feature_id, groups, translate)


def editor_spec(feature_id, groups, translate, icons=None, swatches=None, samples=(), schematic=None):
    spec = {
        'groups': [
            {'id': group, 'label': translate(GROUP_LABEL % (feature_id, group)), 'keys': list(keys)}
            for group, keys in groups
        ],
        'icons': dict(icons or {}),
        'swatches': dict(swatches or {}),
    }
    found = [item for item in samples if item and isinstance(item.get('widget'), dict)]
    if found:
        spec['samples'] = found
    if schematic:
        spec['schematic'] = schematic
    return spec
