from __future__ import absolute_import, division, print_function, unicode_literals

import os

from ....core.log import guarded
from ..model import game_folder, installed_packages
from .constants import MODS_ROOT


@guarded('update notice: mods folder', fallback=(None, {}))
def installed(root=MODS_ROOT):
    if not os.path.isdir(root):
        return None, {}
    folder = game_folder(os.listdir(root))
    if folder is None:
        return None, {}
    return folder, installed_packages(os.listdir(os.path.join(root, folder)))

