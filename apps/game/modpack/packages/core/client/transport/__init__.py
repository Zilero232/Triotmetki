from __future__ import absolute_import, division, print_function, unicode_literals

from ...net.transport import ThreadTransport


# UNVERIFIED on Lesta 1.45: whether BigWorld.fetchURL checks the server certificate.
def create_transport():
    return ThreadTransport()
