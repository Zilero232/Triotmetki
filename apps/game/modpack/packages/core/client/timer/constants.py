from __future__ import absolute_import, division, print_function, unicode_literals

# A tick that fails this many times in a row is broken for good (a client patch renamed what it reads): it stops
# instead of formatting a traceback every frame for the rest of the session.
MAX_FAILURES = 100
