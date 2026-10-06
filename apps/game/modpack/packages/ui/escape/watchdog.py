from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import ANSWER_TIMEOUT_S


class EscapeWatchdog(object):

    def __init__(self, schedule, on_silence):
        self.schedule = schedule
        self.on_silence = on_silence
        self.asked = 0
        self.answered = 0

    def ask(self):
        self.asked += 1
        asked = self.asked
        self.schedule(ANSWER_TIMEOUT_S, lambda: self._expire(asked))
        return asked

    def answer(self):
        self.answered = self.asked

    def _expire(self, asked):
        if self.answered >= asked:
            return
        self.answered = self.asked
        self.on_silence()
