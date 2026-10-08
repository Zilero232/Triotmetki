from __future__ import absolute_import, division, print_function, unicode_literals

import os

from ....core.client.game import client_version
from ....core.log import guarded
from ..model import client_folder, installed_packages
from .constants import MODS_ROOT


@guarded('update notice: mods folder', fallback=(None, {}))
def installed(root=MODS_ROOT):
    folder = client_folder(client_version())
    if folder is None:
        return None, {}

    path = os.path.join(root, folder)
    if not os.path.isdir(path):
        return None, {}
    return folder, installed_packages(os.listdir(path))

