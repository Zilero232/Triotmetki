from __future__ import absolute_import, division, print_function, unicode_literals

SWITCH = 'hangar_space'
SECTION = 'hangar_space'
GROUP = 'hangar'

# space: the folder name of the chosen space under res/spaces (h08_mt_hangar, ...); look: the id of the chosen look
# (model.constants.LOOKS, or a generated otm_ environment), which wins over the space. Empty keeps the game's own.
DEFAULTS = {'space': '', 'look': ''}

# Both are for players who know the client's files: the gallery sets them, the window folds the fields away.
ADVANCED = ('space', 'look')
