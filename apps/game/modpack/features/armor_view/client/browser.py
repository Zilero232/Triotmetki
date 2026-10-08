from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import client_attr
from .constants import BROWSER_OPENERS


def open_external(url):
    for name in BROWSER_OPENERS:
        opener = client_attr('BigWorld', name)
        if opener is not None:
            opener(url)
            return True
    return False
