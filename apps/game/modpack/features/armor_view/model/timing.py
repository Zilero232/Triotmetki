from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import HOVER_LOG_EVERY


class RayTiming(object):

    def __init__(self):
        self.count = 0
        self.total_ms = 0.0
        self.worst_ms = 0.0
        self.plates = 0

    def add(self, elapsed_ms, plates):
        self.count += 1
        self.total_ms += elapsed_ms
        self.worst_ms = max(self.worst_ms, elapsed_ms)
        self.plates += plates
        return self.count == 1 or self.count % HOVER_LOG_EVERY == 0

    def summary(self):
        if not self.count:
            return 'armor view: no hover ray'
        average = self.total_ms / self.count
        return 'armor view: hover rays: %d in %.1f ms (%.2f ms each, worst %.2f ms, %d plates met)' % (
            self.count, self.total_ms, average, self.worst_ms, self.plates,
        )
