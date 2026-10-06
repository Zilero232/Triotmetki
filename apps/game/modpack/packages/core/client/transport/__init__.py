from __future__ import absolute_import, division, print_function, unicode_literals

from ...net.transport import ThreadTransport


# Every request of the app goes through urllib2 on a worker thread with a verified TLS context, built there on the
# first request (net.transport.tls). BigWorld.fetchURL is not used: UNVERIFIED on Lesta 1.45 whether it checks the
# server certificate, and the requests carry the device's signed headers.
def create_transport():
    return ThreadTransport()
