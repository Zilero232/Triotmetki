from __future__ import absolute_import, division, print_function, unicode_literals

from ..log import log, log_exception

_CLEAN = object()
_pending = []


class DeferredFile(object):
    """A `JsonFile` stand-in whose writes land on disk later. With a `schedule`, once per `delay_s`: a write keeps
    the data and asks `schedule(delay_s, flush)` once, later writes before the flush only replace the data. Without
    one (`held`), only when `flush_pending(held=True)` runs (the hangar, the client closing): a store too big to write
    in a battle. `flush()` writes it at once; a read flushes every held write of the same path first, so it always
    sees the last write. A failed write keeps the data and is tried again on the next flush."""

    def __init__(self, store, schedule=None, delay_s=None):
        self.store = store
        self.path = getattr(store, 'path', None)
        self.schedule = schedule
        self.delay_s = delay_s
        self.data = _CLEAN
        self.armed = False
        self.failing = False

    @property
    def held(self):
        return self.schedule is None

    def read(self, default=None):
        for other in list(_pending):
            if other is self or (self.path is not None and other.path == self.path):
                other.flush()
        return self.store.read(default)

    def write(self, data):
        self.data = data
        if self not in _pending:
            _pending.append(self)
        self._arm()

    def dirty(self):
        return self.data is not _CLEAN

    def flush(self):
        """Write the kept data now; False when the write failed (logged once until a write succeeds), True
        otherwise."""
        if self.data is _CLEAN:
            return True
        data = self.data
        try:
            self.store.write(data)
        except Exception:
            self._failed()
            return False
        if self.data is data:
            self.data = _CLEAN
            if self in _pending:
                _pending.remove(self)
        if self.failing:
            self.failing = False
            log('saving %s works again' % self.path)
        return True

    def _failed(self):
        if not self.failing:
            self.failing = True
            log_exception('saving %s (kept, tried again on the next save)' % self.path)
        self._arm()

    def _arm(self):
        if self.held or self.armed:
            return
        self.armed = True
        self.schedule(self.delay_s, self._on_due)

    def delete(self):
        self.data = _CLEAN
        if self in _pending:
            _pending.remove(self)
        self.store.delete()

    def _on_due(self):
        self.armed = False
        self.flush()


def flush_pending(held=True):
    """Write every DeferredFile that holds a write (a space change, the end of a battle, the client closing);
    `held=False` leaves the held ones (`schedule` None) for the hangar."""
    for deferred in list(_pending):
        if held or not deferred.held:
            deferred.flush()
