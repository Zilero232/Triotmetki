from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number
from ....core.shells import shell_code


def gun_shell(shots, effects_index):
    """(shell code, calibre in mm) of the shooter's gun shot whose shell plays the hit's effects, or None.

    `shots` are the gun's shots as (shell effects index, shell kind, calibre): a hit names only its effects index
    (Vehicle.showDamageFromShot), and the shot effects group it points to carries no shell type and only a rough
    calibre, so the shell is found on the shooter's gun the way poliroid BattleHits does it (utils.getShellParams)."""
    for shot_effects, kind, caliber in shots or ():
        if shot_effects != effects_index:
            continue
        code = shell_code(kind)
        if code is None:
            return None
        return code, int(round(caliber)) if is_number(caliber) and caliber > 0 else None
    return None
