from __future__ import absolute_import, division, print_function, unicode_literals

# The client's working directory is the game folder.
MODS_ROOT = 'mods'
MIXED_INSTALL_WARNING = (
    'WARNING: %s holds both the single package (%s) and %d split packages (%s, ...): the client mounts two copies '
    'of every file and either may win. Keep one set: delete %s, or delete the split net.triotmetki.* / '
    'otmetki.companion_* files.'
)
