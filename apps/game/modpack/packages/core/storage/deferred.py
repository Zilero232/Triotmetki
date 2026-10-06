from __future__ import absolute_import, division, print_function, unicode_literals

from ..log import log_exception

_CLEAN = object()
_pending = []


class DeferredFile(object):
    """A `JsonFile` stand-in whose writes land on disk once per `delay_s`: a write keeps the data and asks
    `schedule(delay_s, flush)` once, later writes before the flush only replace the data. `flush()` (also
    `flush_pending()` for every file) writes it at once; a read flushes first, so it always sees the last write."""

    def __init__(self, store, schedule, delay_s):
        self.store = store
        self.path = getattr(store, 'path', None)
        self.schedule = schedule
        self.delay_s = delay_s
        self.data = _CLEAN
        self.armed = False

    def read(self, default=None):
        self.flush()
        return self.store.read(default)

    def write(self, data):
        self.data = data
        if self not in _pending:
            _pending.append(self)
        if not self.armed:
            self.armed = True
            self.schedule(self.delay_s, self._on_due)

    def dirty(self):
        return self.data is not _CLEAN

    def flush(self):
        """Write the kept data now; False when the write failed (logged), True otherwise."""
        if self.data is _CLEAN:
            return True
        data, self.data = self.data, _CLEAN
        if self in _pending:
            _pending.remove(self)
        try:
            self.store.write(data)
        except (IOError, OSError):
            log_exception('saving %s' % self.path)
            return False
        return True

    def delete(self):
        self.data = _CLEAN
        if self in _pending:
            _pending.remove(self)
        self.store.delete()

    def _on_due(self):
        self.armed = False
        self.flush()


def flush_pending():
    """Write every DeferredFile that holds a write (a space change, the end of a battle, the client closing)."""
    for deferred in list(_pending):
        deferred.flush()
