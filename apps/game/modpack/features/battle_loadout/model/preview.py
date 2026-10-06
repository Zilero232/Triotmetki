from __future__ import absolute_import, division, print_function, unicode_literals

from . import clean_devices, format_panel
from .constants import PREVIEW_DEVICES, PREVIEW_TEXT_KEYS
from .widget import equipment_widget


def _translated(device, translate):
    translated = dict(device)
    for key in PREVIEW_TEXT_KEYS:
        translated[key] = translate(device[key])
    return translated


def preview_devices(translate):
    return clean_devices([_translated(device, translate) for device in PREVIEW_DEVICES])


def preview_text(settings, translate):
    return format_panel(preview_devices(translate), settings)


def preview_widget(settings, translate):
    return equipment_widget(preview_devices(translate), settings)
