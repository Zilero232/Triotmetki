"""Whether the plain hangar view is on the screen: the rule the hangar labels follow (pure).

`plain_hangar(windows)` takes the client's open windows as `{blocking, hangar, alive, own}` (the client glue in
`core/client/lobby_view` builds them from the wulf windows manager): the hangar is plain while its own window is
alive and no other window of a blocking layer is, the rule the stock hangar uses for its vehicle markers
(constants.BLOCKING_LAYERS). The battle queue, the store, research, the client's settings or a reward screen hide
the labels; a pop-over, a tooltip, a system message or a window of our own (the settings window with its HUD editor,
which shows the panels it edits) does not.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import BLOCKING_LAYERS, GONE_STATUSES, HANGAR_ALIAS, HIDDEN_LAYERS

__all__ = ('BLOCKING_LAYERS', 'GONE_STATUSES', 'HANGAR_ALIAS', 'HIDDEN_LAYERS', 'plain_hangar')


def plain_hangar(windows):
    alive = [window for window in windows or () if window.get('alive', True) and not window.get('own')]
    if not any(window.get('hangar') for window in alive):
        return False
    return all(window.get('hangar') or not window.get('blocking') for window in alive)
