from __future__ import absolute_import, division, print_function, unicode_literals

from ...log import log
from ...net.transport import ThreadTransport, verified_context


# Every request of the app goes through urllib2 on a worker thread with a verified TLS context. BigWorld.fetchURL is
# not used: UNVERIFIED on Lesta 1.45 whether it checks the server certificate, and the requests carry the device's
# signed headers.
def create_transport():
    if verified_context() is None:
        log('TLS verification is not available in this client: requests to the site are off')
    return ThreadTransport()
