from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import QUEUE_SIZE


class CardQueue(object):

    def __init__(self, size=QUEUE_SIZE):
        self.size = size
        self.current = None
        self.waiting = []

    def push(self, card):
        if self.current is None:
            self.current = card
            return True
        self.waiting.append(card)
        del self.waiting[:-self.size]
        return False

    def advance(self):
        self.current = self.waiting.pop(0) if self.waiting else None
        return self.current

    def clear(self):
        self.current = None
        self.waiting = []
