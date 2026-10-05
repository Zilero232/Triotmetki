"""The catalog's audio previews: the sound a component ships, copied next to components.json for the manager.

    assets/<preview.audio>  -> previews/<component id>.<ext>
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import os
import shutil

import fileio

from ..manifest.catalog import AUDIO_DIR


def copy_audio(manifest, catalog, modpack_dir, out_dir):
    """Every component's audio preview at its manifest path under out_dir; returns the written paths."""
    written = []
    for component in manifest.components:
        entry = catalog.entry(component.id)
        has_audio = component.preview.audio and entry is not None and entry.preview.audio
        if not has_audio:
            continue
        source = os.path.join(modpack_dir, AUDIO_DIR, *entry.preview.audio.split('/'))
        target = os.path.join(out_dir, *component.preview.audio.split('/'))
        fileio.make_dirs(os.path.dirname(target))
        shutil.copyfile(source, target)
        written.append(target)
    return written
