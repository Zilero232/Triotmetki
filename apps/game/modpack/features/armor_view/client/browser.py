from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import client_attr
from ....core.log import log_exception
from .constants import BROWSER_OPENERS, DISPATCHER_MODULE, OVERLAY_NAME


# The overlay is an adisp_process: it parses the URL macros and loads the view later, so a failure there never
# reaches the mod; only a missing call or one that raises at once falls back to the external browser.
def open_overlay(url):
    show = client_attr(DISPATCHER_MODULE, OVERLAY_NAME)
    if show is None:
        return False
    try:
        show(url)
    except Exception:
        log_exception('armor view: browser overlay')
        return False
    return True


def open_external(url):
    for name in BROWSER_OPENERS:
        opener = client_attr('BigWorld', name)
        if opener is not None:
            opener(url)
            return True
    return False
