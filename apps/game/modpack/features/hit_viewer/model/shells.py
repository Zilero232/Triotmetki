from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number
from ....core.shells import shell_code


# A hit names only its effects index (Vehicle.showDamageFromShot) and its effects group carries no shell type and only a
# rough calibre: the shell is found on the shooter's gun, as poliroid BattleHits does (utils.getShellParams).
def gun_shell(shots, effects_index):
    for shot_effects, kind, caliber in shots or ():
        if shot_effects != effects_index:
            continue
        code = shell_code(kind)
        if code is None:
            return None
        return code, int(round(caliber)) if is_number(caliber) and caliber > 0 else None
    return None
