"""The game's detection-lamp sound left on the user sound whose MP3 is gone. Up to modpack 0.2.0 the sixth_sense
option `lamp_sound` set the client's own setting to its user sound and shipped `res/audioww/sixthSense.mp3`; both
are removed, but the setting lives on in the player's AccountSettings, so the lamp went silent (the client logs
"mp3 file doesn't exist" and plays nothing). The repair puts the stock lamp back, only while that file is missing."""
from __future__ import absolute_import, division, print_function, unicode_literals

from ...log import log
from .constants import DETECTION_SOUND
from .settings_core import apply_settings, settings_core


def user_sound_exists():
    """Whether the client finds the user-sound MP3; True when ResMgr is out of reach, so nothing is changed blind."""
    try:
        import ResMgr
    except ImportError:
        return True
    try:
        return bool(ResMgr.isFile(DETECTION_SOUND['file']))
    except Exception:
        return True


def _current_index(core):
    try:
        return core.getSetting(DETECTION_SOUND['setting'])
    except Exception:
        return None


def repair_detection_sound():
    """Sets the detection sound back to the stock lamp when it points at a missing user MP3. True when it wrote."""
    core = settings_core()
    if core is None:
        return False
    if _current_index(core) != DETECTION_SOUND['user_index'] or user_sound_exists():
        return False
    if not apply_settings({DETECTION_SOUND['setting']: DETECTION_SOUND['stock_index']}):
        return False
    log('detection sound: the user sound %s is missing, the stock lamp is back' % DETECTION_SOUND['file'])
    return True
