from __future__ import absolute_import, division, print_function, unicode_literals

import os

from .constants import DEV_ENV, DEV_ENV_ON, DEV_FOLDER, DEV_MANIFEST, MODS_DIR


def _has_dev_manifest(mods_dir):
    try:
        names = os.listdir(mods_dir)
    except (IOError, OSError):
        return False
    return any(os.path.isfile(os.path.join(mods_dir, name, DEV_FOLDER, DEV_MANIFEST)) for name in names)


def is_dev_install(environ=None, mods_dir=MODS_DIR):
    environ = os.environ if environ is None else environ
    if environ.get(DEV_ENV) == DEV_ENV_ON:
        return True
    return _has_dev_manifest(mods_dir)
