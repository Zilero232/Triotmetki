from __future__ import absolute_import, division, print_function, unicode_literals

import base64

from ....core.compat import string_types, to_text
from ....core.lobby_view import plain_hangar
from ....core.vendor import attr
from .constants import (
    CHECK_CAPTURE,
    CHECK_EXPIRED,
    CHECK_IDLE,
    CHECK_WAIT,
    LOOK_ID,
    PREVIEW_ARM_S,
    PREVIEW_DATA_PREFIX,
    PREVIEW_EXTENSION,
    PREVIEW_KEY_SEPARATOR,
    PREVIEW_SETTLE_S,
    SPACE_NAME,
)


@attr.s(frozen=True)
class GalleryPictures(object):

    previews = attr.ib(factory=dict)
    default = attr.ib(default=None)


# The key is a file name: only a space folder and a look id the settings accept make one.
def preview_key(space, look_id=u''):
    if not isinstance(space, string_types) or not SPACE_NAME.match(to_text(space)):
        return None
    if not look_id:
        return to_text(space)
    if not isinstance(look_id, string_types) or not LOOK_ID.match(to_text(look_id)):
        return None
    return to_text(space) + PREVIEW_KEY_SEPARATOR + to_text(look_id)


def preview_file(key):
    return key + PREVIEW_EXTENSION


def preview_key_of_file(name):
    text = to_text(name)
    if not text.endswith(PREVIEW_EXTENSION):
        return None
    key = text[:-len(PREVIEW_EXTENSION)]
    space, _, look_id = key.partition(PREVIEW_KEY_SEPARATOR)
    return key if preview_key(space, look_id) == key else None


def data_uri(png):
    return PREVIEW_DATA_PREFIX + to_text(base64.b64encode(png))


def tile_image(key, previews, fallback=None):
    return previews.get(key) or fallback


# The shot needs the hangar alone on the screen: the plain hangar view with no window of ours over it either (the
# settings window blurs the scene and covers it); a window of ours that is not blocking is hidden for the shot.
def is_clean_hangar(windows):
    alive = [window for window in windows or () if window.get('alive', True)]
    if any(window.get('own') and window.get('blocking') for window in alive):
        return False
    return plain_hangar(alive)


# Only on the player's use of the picker: a pick or the refresh button arms the book for PREVIEW_ARM_S; the hangar on
# screen is shot once it stayed clean for PREVIEW_SETTLE_S and has no preview yet (nor was tried this session), or is
# the one the refresh button asked for. One shot disarms it, so a space or look is never shot again on its own.
class CaptureBook(object):

    def __init__(self):
        self.armed_until = None
        self.forced = None
        self.attempted = set()
        self.clean_key = None
        self.clean_since = None

    def arm(self, now, forced_key=None):
        self.armed_until = now + PREVIEW_ARM_S
        if forced_key is not None:
            self.forced = forced_key
            self.attempted.discard(forced_key)

    def disarm(self):
        self.armed_until = None
        self.forced = None
        self.clean_key = None
        self.clean_since = None

    def is_wanted(self, key, has_preview):
        return key == self.forced or (not has_preview and key not in self.attempted)

    def check(self, now, key, has_preview, is_clean):
        if self.armed_until is None:
            return CHECK_IDLE
        if now > self.armed_until:
            self.disarm()
            return CHECK_EXPIRED
        if key is None or not is_clean or not self.is_wanted(key, has_preview):
            self.clean_key = None
            return CHECK_WAIT
        if key != self.clean_key:
            self.clean_key, self.clean_since = key, now
            return CHECK_WAIT
        if now - self.clean_since < PREVIEW_SETTLE_S:
            return CHECK_WAIT
        self.attempted.add(key)
        self.disarm()
        return CHECK_CAPTURE
