from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int, string_types, to_text
from ....core.format import COLOR_WARN, font
from ....core.hud.icons import artefact_icon, glyph, image, split
from .constants import (ATTENTION_MARK, BONUS_MARK, BOOSTER_OVERLAY_PATH, BOOSTER_OVERLAYS, FLAGS, ICON_FALLBACK,
                        KIND_DEVICE, KIND_DIRECTIVE, MAX_EFFECT, MAX_ITEMS, MAX_MODERNIZED_LEVEL, MAX_NAME,
                        MISSING_ICON_MARK, OVERLAY_DELUXE, OVERLAY_MODERNIZED, OVERLAY_PATH, OVERLAY_TROPHIES,
                        SLOT_EMPTY, SLOT_ENTRY, SLOTS, STOCK_ICON, SUMMARY, SUMMARY_EMPTY)

# Fair play: the player's own tank only, the equipment and directives its setups carry (what the stock equipment
# tooltips and ammunition panels read) and the device states the client reports for the own vehicle. The client tells
# nothing about other vehicles' equipment and nothing is inferred. The shells and consumables are left to the stock
# panel under the row, which already shows them.


def _text(value, limit):
    if not isinstance(value, string_types) or not value.strip():
        return None
    return to_text(value).strip()[:limit]


def _device_overlay(raw):
    if raw.get('deluxe'):
        return image(OVERLAY_PATH % OVERLAY_DELUXE)

    level = raw.get('level')
    is_modernized = raw.get('modernized') and is_int(level) and 1 <= level <= MAX_MODERNIZED_LEVEL
    if is_modernized:
        return image(OVERLAY_PATH % (OVERLAY_MODERNIZED % level))

    trophy = OVERLAY_TROPHIES.get(raw.get('trophy'))
    return image(OVERLAY_PATH % trophy) if trophy else None


def overlay_of(raw):
    booster = BOOSTER_OVERLAYS.get(raw.get('booster'))
    if booster:
        return image(BOOSTER_OVERLAY_PATH % booster)
    return _device_overlay(raw)


def _kind(raw):
    return KIND_DIRECTIVE if raw.get('booster') else KIND_DEVICE


def clean_device(raw):
    if not isinstance(raw, dict):
        return None

    name = _text(raw.get('name'), MAX_NAME)
    if name is None:
        return None

    device = {
        'name': name,
        'effect': _text(raw.get('effect'), MAX_EFFECT) or u'',
        'icon': artefact_icon(raw.get('icon'), ICON_FALLBACK) or glyph(ICON_FALLBACK),
        'overlay': overlay_of(raw),
        'kind': _kind(raw),
        'empty': False,
    }
    device.update((flag, bool(raw.get(flag))) for flag in FLAGS)
    return device


def clean_devices(raw):
    cleaned = (clean_device(item) for item in (raw or [])[:MAX_ITEMS])
    return [device for device in cleaned if device is not None]


# The row of a read: the installed devices, then the installed directives, as kurzdor's battleequipment (Lebwa, Jove)
# draws them; an empty slot gets no cell.
def slot_items(devices, directives):
    cleaned = (clean_device(raw) for raw in list(devices or []) + list(directives or []))
    return [item for item in cleaned if item is not None][:MAX_ITEMS]


def _mark(device):
    if device['attention']:
        return font(ATTENTION_MARK, COLOR_WARN)
    return font(BONUS_MARK, COLOR_WARN) if device['bonus'] else u''


def _icon_markup(device, size):
    path, _ = split(device['icon'])
    if not path:
        return MISSING_ICON_MARK
    return u'<img src="img://%s" width="%d" height="%d"/>' % (path, size, size)


def icon_size(settings):
    return STOCK_ICON if settings.get('stock_size') else settings.get('icon_size')


def format_panel(devices, settings):
    size = icon_size(settings)
    return u' '.join(_icon_markup(device, size) + _mark(device) for device in devices)


def icons_found(devices, exists):
    paths = (split(device['icon'])[0] for device in devices)
    return sum(1 for path in paths if path and exists(path))


def _count(raw):
    return len([item for item in raw or [] if item is not None])


def slots_line(source, slots):
    entries = [SLOT_ENTRY % (index + 1, cd or SLOT_EMPTY) for index, cd in enumerate(slots or [])]
    return SLOTS % (source, u', '.join(entries))


def loadout_summary(loadout, devices, exists):
    if loadout['reason']:
        return SUMMARY_EMPTY % loadout['reason']
    counts = (_count(loadout['devices']), _count(loadout['directives']), icons_found(devices, exists))
    return SUMMARY % counts + u'; ' + slots_line(loadout.get('source'), loadout.get('slots'))
