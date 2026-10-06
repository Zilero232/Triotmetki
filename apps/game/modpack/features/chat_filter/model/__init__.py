from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.compat import string_types, to_text
from ....core.format import COLOR_MUTED, font, format_moment, single_spaces, strip_tags
from .constants import MAX_SENDERS, WORD_SEPARATORS

# Fair play: it only hides or annotates chat lines the client already received, never the player's own.


def normalize(text):
    if not isinstance(text, string_types):
        return u''
    return single_spaces(strip_tags(text, u' ')).lower()


def parse_words(value):
    parts = WORD_SEPARATORS.split(to_text(value or u''))
    words = (normalize(part) for part in parts)
    return tuple(word for word in words if word)


def stamp(text, time_format, now):
    if not time_format:
        return text
    moment = format_moment(time_format, time.localtime(now))
    return u'%s %s' % (font(u'[%s]' % moment, COLOR_MUTED), to_text(text))


def _last_seen(entries):
    if not entries:
        return 0
    moment, _ = entries[-1]
    return moment


def _within(entries, now, window):
    return [(moment, line) for moment, line in entries if now - moment < window]


class ChatFilter(object):

    def __init__(self, settings):
        self.settings = settings
        self.lines = {}
        self.commands = {}
        self.hidden = 0

    def _recent(self, history, sender, now, window):
        entries = _within(history.get(sender, ()), now, window)
        if sender not in history and len(history) >= MAX_SENDERS:
            oldest = min(history, key=lambda known: _last_seen(history[known]))
            history.pop(oldest)
        history[sender] = entries
        return entries

    def _over_rate(self, entries):
        limit = self.settings.get('rate_limit')
        return bool(limit) and len(entries) >= limit

    def _has_blocked_word(self, line):
        words = parse_words(self.settings.get('block_words'))
        return any(word in line for word in words)

    def _repeats(self, line, entries, now):
        if not self.settings.get('filter_duplicates'):
            return False
        window = self.settings.get('duplicate_window_s')
        return any(seen == line for _, seen in _within(entries, now, window))

    def _floods(self, entries, now):
        return self._over_rate(_within(entries, now, self.settings.get('rate_window_s')))

    def _count(self, allowed):
        if not allowed:
            self.hidden += 1
        return allowed

    def allow_message(self, sender, text, now):
        window = max(self.settings.get('duplicate_window_s'), self.settings.get('rate_window_s'))
        entries = self._recent(self.lines, sender, now, window)
        line = normalize(text)

        blocked = self._has_blocked_word(line) or self._repeats(line, entries, now) or self._floods(entries, now)
        entries.append((now, line))
        return self._count(not blocked)

    def allow_command(self, sender, now):
        if not self.settings.get('filter_commands'):
            return True
        entries = self._recent(self.commands, sender, now, self.settings.get('rate_window_s'))

        allowed = not self._over_rate(entries)
        entries.append((now, None))
        return self._count(allowed)
